import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, initializeDatabase, uploadsDir } from './src/server/db.ts';
import {
  hashPassword,
  verifyPassword,
  signAdminToken,
  requireAdmin,
  type AdminRequest,
} from './src/server/auth.ts';
import {
  computeAvailableSlots,
  getIstNow,
  isValidDateStr,
  minutesToHHMM,
  parseTimeToMinutes,
} from './src/server/availability.ts';
import type {
  AppointmentItem,
  AppointmentStatus,
  BusinessSettings,
  GalleryCategory,
  GalleryImageItem,
  HolidayEntry,
  ServiceItem,
  TrainerAvailabilitySlot,
  TrainerItem,
} from './src/types.ts';
import {
  deleteAppointmentInSupabase,
  fetchAppointmentsFromSupabase,
  syncAppointmentToSupabase,
  syncEnquiryToSupabase,
  syncGalleryToSupabase,
  syncMembershipToSupabase,
  syncServiceToSupabase,
  syncSettingsToSupabase,
  syncTrainerToSupabase,
  updateAppointmentInSupabase,
} from './src/server/supabase.ts';

dotenv.config();
initializeDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '4mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Helper validators
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateBookingRef(dateStr: string): string {
  const compactDate = dateStr.replace(/-/g, '');
  const randomCode = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `POF-${compactDate}-${randomCode}`;
}

function getFormattedSettings(): BusinessSettings | null {
  const row = db.prepare('SELECT * FROM business_settings WHERE id = 1').get() as Record<string, unknown> | undefined;
  if (!row) return null;
  let holidays: HolidayEntry[] = [];
  try {
    holidays = JSON.parse(String(row.holidays_json || '[]')) as HolidayEntry[];
  } catch {
    holidays = [];
  }
  return {
    id: Number(row.id),
    business_name: String(row.business_name || ''),
    category: String(row.category || ''),
    address: String(row.address || ''),
    city: String(row.city || ''),
    state: String(row.state || ''),
    postal_code: String(row.postal_code || ''),
    phone: String(row.phone || ''),
    whatsapp_number: String(row.whatsapp_number || ''),
    email: String(row.email || ''),
    mon_sat_open: String(row.mon_sat_open || '05:30'),
    mon_sat_close: String(row.mon_sat_close || '22:00'),
    sun_open: String(row.sun_open || '06:30'),
    sun_close: String(row.sun_close || '13:00'),
    holidays,
    slot_interval_minutes: Number(row.slot_interval_minutes || 60),
    auto_confirm_bookings: Number(row.auto_confirm_bookings || 0),
    updated_at: String(row.updated_at || ''),
  };
}

function getTrainersWithAvailability(onlyActive: boolean): TrainerItem[] {
  const trainers = (
    onlyActive
      ? db.prepare('SELECT * FROM trainers WHERE is_active = 1 ORDER BY id ASC').all()
      : db.prepare('SELECT * FROM trainers ORDER BY id ASC').all()
  ) as unknown as TrainerItem[];

  const availRows = db
    .prepare('SELECT * FROM trainer_availability ORDER BY trainer_id ASC, day_of_week ASC')
    .all() as unknown as TrainerAvailabilitySlot[];

  return trainers.map((t) => ({
    ...t,
    availability: availRows.filter((a) => a.trainer_id === t.id),
  }));
}

function getMembershipPlans(onlyActive: boolean) {
  const rows = (
    onlyActive
      ? db.prepare('SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all()
      : db.prepare('SELECT * FROM membership_plans ORDER BY sort_order ASC, id ASC').all()
  ) as Array<Record<string, unknown>>;

  return rows.map((r) => {
    let benefits: string[] = [];
    try {
      benefits = JSON.parse(String(r.benefits_json || '[]'));
    } catch {
      benefits = [];
    }
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      duration_label: r.duration_label,
      price: r.price,
      description: r.description,
      benefits,
      is_active: r.is_active,
      sort_order: r.sort_order,
    };
  });
}

// Serve uploaded gallery images safely
app.get('/uploads/:filename', (req: Request, res: Response) => {
  const filename = String(req.params.filename || '');
  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }
  const resolved = path.resolve(uploadsDir, filename);
  if (!resolved.startsWith(uploadsDir + path.sep) || !fs.existsSync(resolved)) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }
  res.sendFile(resolved);
});

// SEO endpoints
app.get('/robots.txt', (req: Request, res: Response) => {
  const origin = process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  const origin = process.env.APP_URL?.trim() || `${req.protocol}://${req.get('host')}`;
  const pages = ['/', '/about', '/services', '/trainers', '/gallery', '/membership', '/contact', '/book', '/booking-status'];
  const urls = pages
    .map(
      (p) => `  <url>
    <loc>${origin}${p}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' ? '1.0' : p === '/book' ? '0.9' : '0.8'}</priority>
  </url>`
    )
    .join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

// Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Public Bootstrap & Read Routes
app.get('/api/bootstrap', (_req: Request, res: Response) => {
  try {
    const settings = getFormattedSettings();
    const services = db
      .prepare('SELECT * FROM services WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC')
      .all();
    const trainers = getTrainersWithAvailability(true);
    const plans = getMembershipPlans(true);
    const gallery = db
      .prepare('SELECT * FROM gallery_images ORDER BY sort_order ASC, id DESC')
      .all();

    res.json({ settings, services, trainers, plans, gallery });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Failed to load site data' });
  }
});

app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = getFormattedSettings();
  res.json(settings);
});

app.get('/api/services', (_req: Request, res: Response) => {
  const services = db
    .prepare('SELECT * FROM services WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC')
    .all();
  res.json(services);
});

app.get('/api/trainers', (_req: Request, res: Response) => {
  res.json(getTrainersWithAvailability(true));
});

app.get('/api/memberships', (_req: Request, res: Response) => {
  res.json(getMembershipPlans(true));
});

app.get('/api/gallery', (_req: Request, res: Response) => {
  const gallery = db.prepare('SELECT * FROM gallery_images ORDER BY sort_order ASC, id DESC').all();
  res.json(gallery);
});

app.get('/api/availability', (req: Request, res: Response) => {
  const date = String(req.query.date || '').trim();
  const serviceId = Number(req.query.serviceId);
  const rawTrainerId = req.query.trainerId;
  const trainerId =
    rawTrainerId && String(rawTrainerId) !== 'any' && Number(rawTrainerId) > 0
      ? Number(rawTrainerId)
      : null;

  if (!date || !Number.isInteger(serviceId) || serviceId <= 0) {
    res.status(400).json({ error: 'Valid date and serviceId are required.' });
    return;
  }

  const result = computeAvailableSlots({ date, serviceId, trainerId });
  res.json(result);
});

// Create Appointment (Transaction-protected against double bookings)
app.post('/api/appointments', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const serviceId = Number(body.service_id);
  const trainerId =
    body.trainer_id === null || body.trainer_id === undefined || body.trainer_id === '' || body.trainer_id === 'any'
      ? null
      : Number(body.trainer_id);
  const customerName = String(body.customer_name || '').trim();
  const customerPhone = String(body.customer_phone || '').trim();
  const customerEmail = String(body.customer_email || '').trim().toLowerCase();
  const appointmentDate = String(body.appointment_date || '').trim();
  const startTime = String(body.start_time || '').trim();
  const notes = String(body.notes || '').trim().slice(0, 1000);

  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    res.status(400).json({ error: 'Please select a valid service.' });
    return;
  }
  if (trainerId !== null && (!Number.isInteger(trainerId) || trainerId <= 0)) {
    res.status(400).json({ error: 'Invalid trainer selection.' });
    return;
  }
  if (customerName.length < 2 || customerName.length > 100) {
    res.status(400).json({ error: 'Please enter your full name (2–100 characters).' });
    return;
  }
  if (!isValidPhone(customerPhone)) {
    res.status(400).json({ error: 'Please enter a valid phone number.' });
    return;
  }
  if (!isValidEmail(customerEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!isValidDateStr(appointmentDate)) {
    res.status(400).json({ error: 'Please select a valid appointment date.' });
    return;
  }
  if (parseTimeToMinutes(startTime) < 0) {
    res.status(400).json({ error: 'Please select a valid appointment time.' });
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');

    const service = db
      .prepare('SELECT id, name, duration_minutes, is_enabled FROM services WHERE id = ?')
      .get(serviceId) as { id: number; name: string; duration_minutes: number; is_enabled: number } | undefined;

    if (!service || !service.is_enabled) {
      db.exec('ROLLBACK');
      res.status(400).json({ error: 'Selected service is not currently available.' });
      return;
    }

    // Re-verify slot availability inside the IMMEDIATE transaction
    const avail = computeAvailableSlots({ date: appointmentDate, serviceId, trainerId });
    if (avail.closed) {
      db.exec('ROLLBACK');
      res.status(400).json({ error: avail.closedReason || 'Facility is closed on this date.' });
      return;
    }

    const chosenSlot = avail.slots.find((s) => s.time === startTime);
    if (!chosenSlot) {
      db.exec('ROLLBACK');
      res.status(409).json({ error: 'This time slot is no longer available. Please choose another slot.' });
      return;
    }

    // Prevent duplicate booking for same customer email/phone at same date & time
    const duplicate = db
      .prepare(`
        SELECT id FROM appointments
        WHERE appointment_date = ? AND start_time = ? AND status != 'Cancelled'
          AND (lower(customer_email) = ? OR customer_phone = ?)
      `)
      .get(appointmentDate, startTime, customerEmail, customerPhone);

    if (duplicate) {
      db.exec('ROLLBACK');
      res.status(409).json({ error: 'You already have an active appointment booked for this date and time.' });
      return;
    }

    // Upsert user record
    db.prepare(`
      INSERT INTO users (email, full_name, phone, role)
      VALUES (?, ?, ?, 'customer')
      ON CONFLICT(email) DO UPDATE SET
        full_name = excluded.full_name,
        phone = excluded.phone
    `).run(customerEmail, customerName, customerPhone);

    const userRow = db.prepare('SELECT id FROM users WHERE email = ?').get(customerEmail) as { id: number };
    const settings = db.prepare('SELECT auto_confirm_bookings FROM business_settings WHERE id = 1').get() as {
      auto_confirm_bookings: number;
    };

    const initialStatus: AppointmentStatus = settings?.auto_confirm_bookings ? 'Confirmed' : 'Pending';
    let bookingRef = generateBookingRef(appointmentDate);
    while (db.prepare('SELECT 1 FROM appointments WHERE booking_ref = ?').get(bookingRef)) {
      bookingRef = generateBookingRef(appointmentDate);
    }

    const duration = Math.max(15, service.duration_minutes || 60);
    const endTime = minutesToHHMM(parseTimeToMinutes(startTime) + duration);

    const insertResult = db
      .prepare(`
        INSERT INTO appointments (
          booking_ref, user_id, service_id, trainer_id,
          customer_name, customer_phone, customer_email,
          appointment_date, start_time, end_time, duration_minutes,
          status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        bookingRef,
        userRow.id,
        serviceId,
        trainerId,
        customerName,
        customerPhone,
        customerEmail,
        appointmentDate,
        startTime,
        endTime,
        duration,
        initialStatus,
        notes
      );

    db.exec('COMMIT');

    const created = db
      .prepare(`
        SELECT a.*, s.name AS service_name, t.name AS trainer_name
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        LEFT JOIN trainers t ON t.id = a.trainer_id
        WHERE a.id = ?
      `)
      .get(Number(insertResult.lastInsertRowid)) as unknown as AppointmentItem;

    await syncAppointmentToSupabase(created);

    res.status(201).json(created);
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    console.error('Appointment creation failed:', error);
    res.status(500).json({ error: 'Unable to complete booking. Please try again.' });
  }
});

// Customer Lookup / Cancel / Reschedule
app.post('/api/appointments/lookup', (req: Request, res: Response) => {
  const bookingRef = String(req.body?.booking_ref || '').trim().toUpperCase();
  const contact = String(req.body?.contact || '').trim().toLowerCase();

  if (!bookingRef || !contact) {
    res.status(400).json({ error: 'Booking reference and email or phone are required.' });
    return;
  }

  const appt = db
    .prepare(`
      SELECT a.*, s.name AS service_name, t.name AS trainer_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN trainers t ON t.id = a.trainer_id
      WHERE upper(a.booking_ref) = ?
        AND (lower(a.customer_email) = ? OR replace(a.customer_phone, ' ', '') = replace(?, ' ', ''))
    `)
    .get(bookingRef, contact, contact);

  if (!appt) {
    res.status(404).json({ error: 'No matching booking found. Check your booking reference and email/phone.' });
    return;
  }

  res.json(appt);
});

app.post('/api/appointments/cancel', async (req: Request, res: Response) => {
  const bookingRef = String(req.body?.booking_ref || '').trim().toUpperCase();
  const contact = String(req.body?.contact || '').trim().toLowerCase();

  if (!bookingRef || !contact) {
    res.status(400).json({ error: 'Booking reference and email or phone are required.' });
    return;
  }

  const appt = db
    .prepare(`
      SELECT * FROM appointments
      WHERE upper(booking_ref) = ?
        AND (lower(customer_email) = ? OR replace(customer_phone, ' ', '') = replace(?, ' ', ''))
    `)
    .get(bookingRef, contact, contact) as { id: number; status: AppointmentStatus } | undefined;

  if (!appt) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (appt.status === 'Cancelled' || appt.status === 'Completed') {
    res.status(400).json({ error: `Cannot cancel an appointment that is already ${appt.status}.` });
    return;
  }

  db.prepare(`UPDATE appointments SET status = 'Cancelled', updated_at = datetime('now') WHERE id = ?`).run(appt.id);

  const updated = db
    .prepare(`
      SELECT a.*, s.name AS service_name, t.name AS trainer_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN trainers t ON t.id = a.trainer_id
      WHERE a.id = ?
    `)
    .get(appt.id) as unknown as AppointmentItem;

  await updateAppointmentInSupabase(updated);

  res.json(updated);
});

app.post('/api/appointments/reschedule', async (req: Request, res: Response) => {
  const bookingRef = String(req.body?.booking_ref || '').trim().toUpperCase();
  const contact = String(req.body?.contact || '').trim().toLowerCase();
  const newDate = String(req.body?.appointment_date || '').trim();
  const newTime = String(req.body?.start_time || '').trim();

  if (!bookingRef || !contact || !isValidDateStr(newDate) || parseTimeToMinutes(newTime) < 0) {
    res.status(400).json({ error: 'Valid booking reference, contact, new date, and time are required.' });
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    const appt = db
      .prepare(`
        SELECT * FROM appointments
        WHERE upper(booking_ref) = ?
          AND (lower(customer_email) = ? OR replace(customer_phone, ' ', '') = replace(?, ' ', ''))
      `)
      .get(bookingRef, contact, contact) as {
        id: number;
        service_id: number;
        trainer_id: number | null;
        duration_minutes: number;
        status: AppointmentStatus;
      } | undefined;

    if (!appt) {
      db.exec('ROLLBACK');
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    if (appt.status === 'Cancelled' || appt.status === 'Completed') {
      db.exec('ROLLBACK');
      res.status(400).json({ error: `Cannot reschedule a ${appt.status} appointment.` });
      return;
    }

    const avail = computeAvailableSlots({
      date: newDate,
      serviceId: appt.service_id,
      trainerId: appt.trainer_id,
      excludeAppointmentId: appt.id,
    });

    if (avail.closed || !avail.slots.some((s) => s.time === newTime)) {
      db.exec('ROLLBACK');
      res.status(409).json({ error: avail.closedReason || 'Selected time slot is not available.' });
      return;
    }

    const endTime = minutesToHHMM(parseTimeToMinutes(newTime) + appt.duration_minutes);

    db.prepare(`
      UPDATE appointments
      SET appointment_date = ?,
          start_time = ?,
          end_time = ?,
          reschedule_requested_date = ?,
          reschedule_requested_time = ?,
          status = 'Pending',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(newDate, newTime, endTime, newDate, newTime, appt.id);

    db.exec('COMMIT');

    const updated = db
      .prepare(`
        SELECT a.*, s.name AS service_name, t.name AS trainer_name
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        LEFT JOIN trainers t ON t.id = a.trainer_id
        WHERE a.id = ?
      `)
      .get(appt.id) as unknown as AppointmentItem;

    await updateAppointmentInSupabase(updated);

    res.json(updated);
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    console.error('Reschedule failed:', error);
    res.status(500).json({ error: 'Unable to reschedule appointment.' });
  }
});

// Public Contact & Membership Enquiries
app.post('/api/enquiries', async (req: Request, res: Response) => {
  const type = req.body?.type === 'membership' ? 'membership' : 'contact';
  const planName = String(req.body?.plan_name || '').trim().slice(0, 120);
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = String(req.body?.message || '').trim().slice(0, 2000);

  if (name.length < 2 || name.length > 100) {
    res.status(400).json({ error: 'Please enter your name.' });
    return;
  }
  if (!isValidPhone(phone)) {
    res.status(400).json({ error: 'Please enter a valid phone number.' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (message.length < 4) {
    res.status(400).json({ error: 'Please include a short message.' });
    return;
  }

  const info = db
    .prepare(`
      INSERT INTO enquiries (type, plan_name, name, phone, email, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'New')
    `)
    .run(type, planName, name, phone, email, message);

  await syncEnquiryToSupabase({
    type,
    plan_name: planName,
    name,
    phone,
    email,
    message,
    status: 'New',
  });

  res.status(201).json({ id: Number(info.lastInsertRowid), status: 'New' });
});

// ================= ADMIN AUTH =================

app.get('/api/admin/auth/status', (_req: Request, res: Response) => {
  const adminCount = (db.prepare('SELECT COUNT(*) AS cnt FROM admins').get() as { cnt: number }).cnt;
  const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE?.trim());
  res.json({
    configured: adminCount > 0 || hasEnvPasscode,
    hasEnvPasscode,
    hasClaimedAdmin: adminCount > 0,
  });
});

app.post('/api/admin/auth/setup', (req: Request, res: Response) => {
  const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE?.trim());
  if (hasEnvPasscode) {
    res.status(409).json({ error: 'Admin access is configured via server environment passcode.' });
    return;
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  const password = String(req.body?.password || '');

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid owner email address.' });
    return;
  }
  if (name.length < 2) {
    res.status(400).json({ error: 'Please enter your name.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    const existingCount = (db.prepare('SELECT COUNT(*) AS cnt FROM admins').get() as { cnt: number }).cnt;
    if (existingCount > 0) {
      db.exec('ROLLBACK');
      res.status(409).json({ error: 'Owner account has already been claimed. Please sign in.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const info = db
      .prepare('INSERT INTO admins (email, name, password_hash) VALUES (?, ?, ?)')
      .run(email, name, passwordHash);

    db.exec('COMMIT');

    const adminId = Number(info.lastInsertRowid);
    const token = signAdminToken({ sub: adminId, email, name, role: 'admin' });
    res.status(201).json({
      token,
      admin: { id: adminId, email, name },
    });
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    console.error('Admin setup failed:', error);
    res.status(500).json({ error: 'Unable to complete owner account setup.' });
  }
});

app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();

  if (!password) {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  // Env passcode takes priority when configured
  if (envPasscode) {
    const a = Buffer.from(password, 'utf8');
    const b = Buffer.from(envPasscode, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      const adminEmail = email || 'owner@playonfitness.local';
      const token = signAdminToken({ sub: 1, email: adminEmail, name: 'Play on Fitness Admin', role: 'admin' });
      res.json({ token, admin: { id: 1, email: adminEmail, name: 'Play on Fitness Admin' } });
      return;
    }
  }

  if (!email) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const admin = db
    .prepare('SELECT id, email, name, password_hash FROM admins WHERE lower(email) = ?')
    .get(email) as { id: number; email: string; name: string; password_hash: string } | undefined;

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    res.status(401).json({ error: 'Invalid admin credentials.' });
    return;
  }

  const token = signAdminToken({ sub: admin.id, email: admin.email, name: admin.name, role: 'admin' });
  res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
});

app.get('/api/admin/auth/me', requireAdmin, (req: AdminRequest, res: Response) => {
  res.json({ admin: req.admin });
});

// ================= ADMIN PROTECTED ROUTES =================

async function reconcileAppointmentsFromSupabase(): Promise<void> {
  const remoteRows = await fetchAppointmentsFromSupabase();
  if (!remoteRows || remoteRows.length === 0) return;

  const fallbackService = db
    .prepare('SELECT id, duration_minutes FROM services ORDER BY sort_order ASC, id ASC LIMIT 1')
    .get() as { id: number; duration_minutes: number } | undefined;

  if (!fallbackService) return;

  for (const row of remoteRows) {
    if (!row.booking_ref) continue;

    let resolvedServiceId = fallbackService.id;
    const byId = db
      .prepare('SELECT id FROM services WHERE id = ?')
      .get(row.service_id) as { id: number } | undefined;
    if (byId) {
      resolvedServiceId = byId.id;
    } else if (row.service_name) {
      const byName = db
        .prepare('SELECT id FROM services WHERE lower(name) = lower(?)')
        .get(row.service_name) as { id: number } | undefined;
      if (byName) resolvedServiceId = byName.id;
    }

    let resolvedTrainerId: number | null = null;
    if (row.trainer_id) {
      const tById = db
        .prepare('SELECT id FROM trainers WHERE id = ?')
        .get(row.trainer_id) as { id: number } | undefined;
      if (tById) resolvedTrainerId = tById.id;
    }

    const validStatus: AppointmentStatus = ['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(row.status)
      ? (row.status as AppointmentStatus)
      : 'Pending';

    const existing = db
      .prepare('SELECT id, updated_at FROM appointments WHERE upper(booking_ref) = upper(?)')
      .get(row.booking_ref) as { id: number; updated_at: string } | undefined;

    const remoteUpdatedMs = row.updated_at ? Date.parse(row.updated_at) : 0;
    const localUpdatedMs = existing?.updated_at ? Date.parse(existing.updated_at.replace(' ', 'T') + 'Z') : 0;

    if (!existing) {
      let userId: number | null = null;
      if (row.customer_email && isValidEmail(row.customer_email)) {
        db.prepare(`
          INSERT INTO users (email, full_name, phone, role)
          VALUES (?, ?, ?, 'customer')
          ON CONFLICT(email) DO UPDATE SET
            full_name = excluded.full_name,
            phone = excluded.phone
        `).run(row.customer_email.toLowerCase(), row.customer_name || '', row.customer_phone || '');
        const userRow = db
          .prepare('SELECT id FROM users WHERE email = ?')
          .get(row.customer_email.toLowerCase()) as { id: number } | undefined;
        userId = userRow?.id ?? null;
      }

      try {
        db.prepare(`
          INSERT INTO appointments (
            booking_ref, user_id, service_id, trainer_id,
            customer_name, customer_phone, customer_email,
            appointment_date, start_time, end_time, duration_minutes,
            status, notes, reschedule_requested_date, reschedule_requested_time,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          row.booking_ref,
          userId,
          resolvedServiceId,
          resolvedTrainerId,
          row.customer_name || 'Guest',
          row.customer_phone || '',
          (row.customer_email || '').toLowerCase(),
          String(row.appointment_date).slice(0, 10),
          row.start_time || '06:00',
          row.end_time || '07:00',
          Math.max(15, Number(row.duration_minutes) || 60),
          validStatus,
          row.notes || '',
          row.reschedule_requested_date ? String(row.reschedule_requested_date).slice(0, 10) : null,
          row.reschedule_requested_time || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        );
      } catch (err) {
        console.error('Skipping conflicting Supabase booking import:', row.booking_ref, err);
      }
    } else if (remoteUpdatedMs > localUpdatedMs + 2000) {
      try {
        db.prepare(`
          UPDATE appointments
          SET service_id = ?,
              trainer_id = ?,
              customer_name = ?,
              customer_phone = ?,
              customer_email = ?,
              appointment_date = ?,
              start_time = ?,
              end_time = ?,
              duration_minutes = ?,
              status = ?,
              notes = ?,
              reschedule_requested_date = ?,
              reschedule_requested_time = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          resolvedServiceId,
          resolvedTrainerId,
          row.customer_name || 'Guest',
          row.customer_phone || '',
          (row.customer_email || '').toLowerCase(),
          String(row.appointment_date).slice(0, 10),
          row.start_time || '06:00',
          row.end_time || '07:00',
          Math.max(15, Number(row.duration_minutes) || 60),
          validStatus,
          row.notes || '',
          row.reschedule_requested_date ? String(row.reschedule_requested_date).slice(0, 10) : null,
          row.reschedule_requested_time || null,
          row.updated_at || new Date().toISOString(),
          existing.id
        );
      } catch (err) {
        console.error('Skipping conflicting Supabase booking update:', row.booking_ref, err);
      }
    }
  }
}

app.get('/api/admin/dashboard', requireAdmin, async (_req: AdminRequest, res: Response) => {
  await reconcileAppointmentsFromSupabase();
  const istNow = getIstNow();
  const counts = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
      FROM appointments
    `)
    .get() as Record<string, number>;

  const upcomingSessions = db
    .prepare(`
      SELECT a.*, s.name AS service_name, t.name AS trainer_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN trainers t ON t.id = a.trainer_id
      WHERE a.status IN ('Pending', 'Confirmed')
        AND a.appointment_date >= ?
      ORDER BY a.appointment_date ASC, a.start_time ASC
      LIMIT 12
    `)
    .all(istNow.dateStr);

  const newEnquiriesCount = (
    db.prepare(`SELECT COUNT(*) AS cnt FROM enquiries WHERE status = 'New'`).get() as { cnt: number }
  ).cnt;

  res.json({
    stats: {
      totalBookings: counts.total || 0,
      pendingBookings: counts.pending || 0,
      confirmedBookings: counts.confirmed || 0,
      cancelledBookings: counts.cancelled || 0,
      completedBookings: counts.completed || 0,
      upcomingSessionsCount: upcomingSessions.length,
      newEnquiriesCount,
    },
    upcomingSessions,
  });
});

// Admin Appointments Management
app.get('/api/admin/appointments', requireAdmin, async (req: AdminRequest, res: Response) => {
  await reconcileAppointmentsFromSupabase();
  const search = String(req.query.search || '').trim().toLowerCase();
  const date = String(req.query.date || '').trim();
  const serviceId = req.query.serviceId ? Number(req.query.serviceId) : null;
  const status = String(req.query.status || '').trim();

  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (date) {
    clauses.push('a.appointment_date = ?');
    params.push(date);
  }
  if (serviceId && Number.isInteger(serviceId)) {
    clauses.push('a.service_id = ?');
    params.push(serviceId);
  }
  if (status && ['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(status)) {
    clauses.push('a.status = ?');
    params.push(status);
  }
  if (search) {
    clauses.push(
      `(lower(a.booking_ref) LIKE ? OR lower(a.customer_name) LIKE ? OR lower(a.customer_email) LIKE ? OR a.customer_phone LIKE ? OR lower(a.notes) LIKE ?)`
    );
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT a.*, s.name AS service_name, t.name AS trainer_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN trainers t ON t.id = a.trainer_id
      ${whereSql}
      ORDER BY a.appointment_date DESC, a.start_time DESC, a.id DESC
    `)
    .all(...params);

  res.json(rows);
});

app.post('/api/admin/appointments', requireAdmin, async (req: AdminRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const serviceId = Number(body.service_id);
  const trainerId =
    body.trainer_id === null || body.trainer_id === undefined || body.trainer_id === '' || body.trainer_id === 'any'
      ? null
      : Number(body.trainer_id);
  const customerName = String(body.customer_name || '').trim();
  const customerPhone = String(body.customer_phone || '').trim();
  const customerEmail = String(body.customer_email || '').trim().toLowerCase();
  const appointmentDate = String(body.appointment_date || '').trim();
  const startTime = String(body.start_time || '').trim();
  const notes = String(body.notes || '').trim().slice(0, 1000);
  const requestedStatus = String(body.status || 'Confirmed').trim() as AppointmentStatus;

  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    res.status(400).json({ error: 'Please select a valid service.' });
    return;
  }
  if (trainerId !== null && (!Number.isInteger(trainerId) || trainerId <= 0)) {
    res.status(400).json({ error: 'Invalid trainer selection.' });
    return;
  }
  if (customerName.length < 2 || customerName.length > 100) {
    res.status(400).json({ error: 'Customer name must be 2–100 characters.' });
    return;
  }
  if (!isValidPhone(customerPhone)) {
    res.status(400).json({ error: 'Please enter a valid phone number.' });
    return;
  }
  if (!isValidEmail(customerEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!isValidDateStr(appointmentDate) || parseTimeToMinutes(startTime) < 0) {
    res.status(400).json({ error: 'Please provide a valid appointment date and time.' });
    return;
  }
  if (!['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(requestedStatus)) {
    res.status(400).json({ error: 'Invalid appointment status.' });
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    const service = db
      .prepare('SELECT id, name, duration_minutes FROM services WHERE id = ?')
      .get(serviceId) as { id: number; name: string; duration_minutes: number } | undefined;

    if (!service) {
      db.exec('ROLLBACK');
      res.status(400).json({ error: 'Selected service does not exist.' });
      return;
    }

    if (requestedStatus === 'Pending' || requestedStatus === 'Confirmed') {
      if (trainerId !== null) {
        const conflict = db
          .prepare(`
            SELECT id FROM appointments
            WHERE appointment_date = ? AND start_time = ? AND trainer_id = ? AND status != 'Cancelled'
          `)
          .get(appointmentDate, startTime, trainerId);
        if (conflict) {
          db.exec('ROLLBACK');
          res.status(409).json({ error: 'Selected trainer already has an active booking at this date and time.' });
          return;
        }
      }
    }

    db.prepare(`
      INSERT INTO users (email, full_name, phone, role)
      VALUES (?, ?, ?, 'customer')
      ON CONFLICT(email) DO UPDATE SET
        full_name = excluded.full_name,
        phone = excluded.phone
    `).run(customerEmail, customerName, customerPhone);

    const userRow = db.prepare('SELECT id FROM users WHERE email = ?').get(customerEmail) as { id: number };

    let bookingRef = generateBookingRef(appointmentDate);
    while (db.prepare('SELECT 1 FROM appointments WHERE booking_ref = ?').get(bookingRef)) {
      bookingRef = generateBookingRef(appointmentDate);
    }

    const duration = Math.max(15, service.duration_minutes || 60);
    const endTime = minutesToHHMM(parseTimeToMinutes(startTime) + duration);

    const info = db
      .prepare(`
        INSERT INTO appointments (
          booking_ref, user_id, service_id, trainer_id,
          customer_name, customer_phone, customer_email,
          appointment_date, start_time, end_time, duration_minutes,
          status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        bookingRef,
        userRow.id,
        serviceId,
        trainerId,
        customerName,
        customerPhone,
        customerEmail,
        appointmentDate,
        startTime,
        endTime,
        duration,
        requestedStatus,
        notes
      );

    db.exec('COMMIT');

    const created = db
      .prepare(`
        SELECT a.*, s.name AS service_name, t.name AS trainer_name
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        LEFT JOIN trainers t ON t.id = a.trainer_id
        WHERE a.id = ?
      `)
      .get(Number(info.lastInsertRowid)) as unknown as AppointmentItem;

    await syncAppointmentToSupabase(created);

    res.status(201).json(created);
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    console.error('Admin appointment creation failed:', error);
    res.status(500).json({ error: 'Unable to create appointment.' });
  }
});

app.patch('/api/admin/appointments/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid appointment ID.' });
    return;
  }

  const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as {
    id: number;
    booking_ref: string;
    service_id: number;
    trainer_id: number | null;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    status: AppointmentStatus;
    notes: string;
  } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  const newStatus = (req.body?.status as AppointmentStatus | undefined) || existing.status;
  if (!['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(newStatus)) {
    res.status(400).json({ error: 'Invalid appointment status.' });
    return;
  }

  const newCustomerName =
    req.body?.customer_name !== undefined ? String(req.body.customer_name).trim() : existing.customer_name;
  const newCustomerPhone =
    req.body?.customer_phone !== undefined ? String(req.body.customer_phone).trim() : existing.customer_phone;
  const newCustomerEmail =
    req.body?.customer_email !== undefined
      ? String(req.body.customer_email).trim().toLowerCase()
      : existing.customer_email;
  const newNotes =
    req.body?.notes !== undefined ? String(req.body.notes).trim().slice(0, 1000) : existing.notes;

  if (newCustomerName.length < 2 || newCustomerName.length > 100) {
    res.status(400).json({ error: 'Customer name must be 2–100 characters.' });
    return;
  }
  if (!isValidPhone(newCustomerPhone)) {
    res.status(400).json({ error: 'Please enter a valid phone number.' });
    return;
  }
  if (!isValidEmail(newCustomerEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const newServiceId =
    req.body?.service_id !== undefined ? Number(req.body.service_id) : existing.service_id;
  if (!Number.isInteger(newServiceId) || newServiceId <= 0) {
    res.status(400).json({ error: 'Invalid service selection.' });
    return;
  }
  const serviceRow = db
    .prepare('SELECT id, duration_minutes FROM services WHERE id = ?')
    .get(newServiceId) as { id: number; duration_minutes: number } | undefined;
  if (!serviceRow) {
    res.status(400).json({ error: 'Selected service not found.' });
    return;
  }

  const newDate = req.body?.appointment_date ? String(req.body.appointment_date).trim() : existing.appointment_date;
  const newTime = req.body?.start_time ? String(req.body.start_time).trim() : existing.start_time;
  const newTrainerId =
    req.body?.trainer_id !== undefined
      ? req.body.trainer_id === null || req.body.trainer_id === '' || req.body.trainer_id === 'any'
        ? null
        : Number(req.body.trainer_id)
      : existing.trainer_id;

  if (newTrainerId !== null && (!Number.isInteger(newTrainerId) || newTrainerId <= 0)) {
    res.status(400).json({ error: 'Invalid trainer selection.' });
    return;
  }
  if (!isValidDateStr(newDate) || parseTimeToMinutes(newTime) < 0) {
    res.status(400).json({ error: 'Invalid appointment date or time.' });
    return;
  }

  const scheduleChanged =
    newDate !== existing.appointment_date ||
    newTime !== existing.start_time ||
    newTrainerId !== existing.trainer_id ||
    (existing.status === 'Cancelled' && (newStatus === 'Pending' || newStatus === 'Confirmed'));

  if (scheduleChanged && (newStatus === 'Pending' || newStatus === 'Confirmed')) {
    if (newTrainerId !== null) {
      const conflict = db
        .prepare(`
          SELECT id FROM appointments
          WHERE id != ? AND appointment_date = ? AND start_time = ? AND trainer_id = ? AND status != 'Cancelled'
        `)
        .get(existing.id, newDate, newTime, newTrainerId);
      if (conflict) {
        res.status(409).json({ error: 'Target trainer already has an active booking at this date and time.' });
        return;
      }
    }
  }

  const duration =
    newServiceId !== existing.service_id
      ? Math.max(15, serviceRow.duration_minutes || 60)
      : existing.duration_minutes;
  const endTime = minutesToHHMM(parseTimeToMinutes(newTime) + duration);

  db.prepare(`
    UPDATE appointments
    SET status = ?,
        service_id = ?,
        trainer_id = ?,
        customer_name = ?,
        customer_phone = ?,
        customer_email = ?,
        appointment_date = ?,
        start_time = ?,
        end_time = ?,
        duration_minutes = ?,
        notes = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    newStatus,
    newServiceId,
    newTrainerId,
    newCustomerName,
    newCustomerPhone,
    newCustomerEmail,
    newDate,
    newTime,
    endTime,
    duration,
    newNotes,
    id
  );

  const updated = db
    .prepare(`
      SELECT a.*, s.name AS service_name, t.name AS trainer_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN trainers t ON t.id = a.trainer_id
      WHERE a.id = ?
    `)
    .get(id) as unknown as AppointmentItem;

  await updateAppointmentInSupabase(updated);

  res.json(updated);
});

app.delete('/api/admin/appointments/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid appointment ID.' });
    return;
  }

  const existing = db
    .prepare('SELECT id, booking_ref FROM appointments WHERE id = ?')
    .get(id) as { id: number; booking_ref: string } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  await deleteAppointmentInSupabase(existing.booking_ref);

  res.json({ deleted: true, booking_ref: existing.booking_ref });
});

// Admin Services Management
app.get('/api/admin/services', requireAdmin, (_req: AdminRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY sort_order ASC, id ASC').all());
});

app.post('/api/admin/services', requireAdmin, async (req: AdminRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || 'General Fitness').trim();
  const description = String(req.body?.description || '').trim();
  const durationMinutes = Math.max(15, Number(req.body?.duration_minutes) || 60);
  const price =
    req.body?.price === null || req.body?.price === undefined || req.body?.price === ''
      ? null
      : Math.max(0, Math.round(Number(req.body.price)));
  const imageUrl = String(req.body?.image_url || '/src/assets/images/service_strength_barbell_1795614906785.jpg').trim();
  const isEnabled = req.body?.is_enabled === false || req.body?.is_enabled === 0 ? 0 : 1;

  if (name.length < 2) {
    res.status(400).json({ error: 'Service name is required.' });
    return;
  }

  const baseSlug = slugify(name) || `service-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;
  while (db.prepare('SELECT 1 FROM services WHERE slug = ?').get(slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM services').get() as { m: number }).m;
  const info = db
    .prepare(`
      INSERT INTO services (slug, name, category, description, duration_minutes, price, image_url, is_enabled, is_proposed, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `)
    .run(slug, name, category, description, durationMinutes, price, imageUrl, isEnabled, maxSort + 1);

  const createdService = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as ServiceItem;
  await syncServiceToSupabase(createdService);
  res.status(201).json(createdService);
});

app.patch('/api/admin/services/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Service not found.' });
    return;
  }

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : String(existing.name);
  const category = req.body?.category !== undefined ? String(req.body.category).trim() : String(existing.category);
  const description =
    req.body?.description !== undefined ? String(req.body.description).trim() : String(existing.description);
  const durationMinutes =
    req.body?.duration_minutes !== undefined
      ? Math.max(15, Number(req.body.duration_minutes) || 60)
      : Number(existing.duration_minutes);
  const price =
    req.body?.price !== undefined
      ? req.body.price === null || req.body.price === ''
        ? null
        : Math.max(0, Math.round(Number(req.body.price)))
      : existing.price === null
        ? null
        : Number(existing.price);
  const imageUrl = req.body?.image_url !== undefined ? String(req.body.image_url).trim() : String(existing.image_url);
  const isEnabled =
    req.body?.is_enabled !== undefined ? (req.body.is_enabled ? 1 : 0) : Number(existing.is_enabled);
  const isProposed =
    req.body?.is_proposed !== undefined ? (req.body.is_proposed ? 1 : 0) : Number(existing.is_proposed);

  db.prepare(`
    UPDATE services
    SET name = ?, category = ?, description = ?, duration_minutes = ?, price = ?, image_url = ?, is_enabled = ?, is_proposed = ?
    WHERE id = ?
  `).run(name, category, description, durationMinutes, price, imageUrl, isEnabled, isProposed, id);

  const updatedService = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as unknown as ServiceItem;
  await syncServiceToSupabase(updatedService);
  res.json(updatedService);
});

app.delete('/api/admin/services/:id', requireAdmin, (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  const hasAppointments = db.prepare('SELECT 1 FROM appointments WHERE service_id = ? LIMIT 1').get(id);
  if (hasAppointments) {
    // Disable instead of violating FK history
    db.prepare('UPDATE services SET is_enabled = 0 WHERE id = ?').run(id);
    res.json({ disabled: true, message: 'Service has booking history and was disabled.' });
    return;
  }
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  res.json({ deleted: true });
});

// Admin Trainers Management
app.get('/api/admin/trainers', requireAdmin, (_req: AdminRequest, res: Response) => {
  res.json(getTrainersWithAvailability(false));
});

app.post('/api/admin/trainers', requireAdmin, async (req: AdminRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const specialization = String(req.body?.specialization || '').trim();
  const experience = String(req.body?.experience || '').trim();
  const qualifications = String(req.body?.qualifications || '').trim();
  const bio = String(req.body?.bio || '').trim();
  const photoUrl = String(req.body?.photo_url || '/src/assets/images/service_strength_barbell_1795614906785.jpg').trim();
  const isPlaceholder = req.body?.is_placeholder ? 1 : 0;

  if (name.length < 2) {
    res.status(400).json({ error: 'Trainer name is required.' });
    return;
  }

  const info = db
    .prepare(`
      INSERT INTO trainers (name, specialization, experience, qualifications, bio, photo_url, is_placeholder, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `)
    .run(name, specialization, experience, qualifications, bio, photoUrl, isPlaceholder);

  const trainerId = Number(info.lastInsertRowid);
  const insertAvail = db.prepare(`
    INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time, is_available)
    VALUES (?, ?, ?, ?, 1)
  `);
  for (let dow = 0; dow <= 6; dow++) {
    insertAvail.run(trainerId, dow, dow === 0 ? '06:30' : '05:30', dow === 0 ? '13:00' : '22:00');
  }

  const createdTrainer = getTrainersWithAvailability(false).find((t) => t.id === trainerId);
  if (createdTrainer) await syncTrainerToSupabase(createdTrainer);
  res.status(201).json(createdTrainer);
});

app.patch('/api/admin/trainers/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM trainers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Trainer not found.' });
    return;
  }

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : String(existing.name);
  const specialization =
    req.body?.specialization !== undefined ? String(req.body.specialization).trim() : String(existing.specialization);
  const experience =
    req.body?.experience !== undefined ? String(req.body.experience).trim() : String(existing.experience);
  const qualifications =
    req.body?.qualifications !== undefined ? String(req.body.qualifications).trim() : String(existing.qualifications);
  const bio = req.body?.bio !== undefined ? String(req.body.bio).trim() : String(existing.bio);
  const photoUrl = req.body?.photo_url !== undefined ? String(req.body.photo_url).trim() : String(existing.photo_url);
  const isPlaceholder =
    req.body?.is_placeholder !== undefined ? (req.body.is_placeholder ? 1 : 0) : Number(existing.is_placeholder);
  const isActive = req.body?.is_active !== undefined ? (req.body.is_active ? 1 : 0) : Number(existing.is_active);

  db.prepare(`
    UPDATE trainers
    SET name = ?, specialization = ?, experience = ?, qualifications = ?, bio = ?, photo_url = ?, is_placeholder = ?, is_active = ?
    WHERE id = ?
  `).run(name, specialization, experience, qualifications, bio, photoUrl, isPlaceholder, isActive, id);

  const updatedTrainer = getTrainersWithAvailability(false).find((t) => t.id === id);
  if (updatedTrainer) await syncTrainerToSupabase(updatedTrainer);
  res.json(updatedTrainer);
});

app.put('/api/admin/trainers/:id/availability', requireAdmin, (req: AdminRequest, res: Response) => {
  const trainerId = Number(req.params.id);
  const slots = Array.isArray(req.body?.availability) ? req.body.availability : [];
  if (!db.prepare('SELECT 1 FROM trainers WHERE id = ?').get(trainerId)) {
    res.status(404).json({ error: 'Trainer not found.' });
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time, is_available)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(trainer_id, day_of_week) DO UPDATE SET
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      is_available = excluded.is_available
  `);

  for (const item of slots) {
    const dow = Number(item.day_of_week);
    if (dow >= 0 && dow <= 6) {
      upsert.run(
        trainerId,
        dow,
        String(item.start_time || '06:00'),
        String(item.end_time || '21:00'),
        item.is_available ? 1 : 0
      );
    }
  }

  res.json(getTrainersWithAvailability(false).find((t) => t.id === trainerId));
});

app.delete('/api/admin/trainers/:id', requireAdmin, (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM trainers WHERE id = ?').run(id);
  res.json({ deleted: true });
});

// Admin Membership Plans Management
app.get('/api/admin/memberships', requireAdmin, (_req: AdminRequest, res: Response) => {
  res.json(getMembershipPlans(false));
});

app.post('/api/admin/memberships', requireAdmin, async (req: AdminRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const durationLabel = String(req.body?.duration_label || '').trim();
  const description = String(req.body?.description || '').trim();
  const price =
    req.body?.price === null || req.body?.price === undefined || req.body?.price === ''
      ? null
      : Math.max(0, Math.round(Number(req.body.price)));
  const benefits = Array.isArray(req.body?.benefits)
    ? req.body.benefits.map((b: unknown) => String(b).trim()).filter(Boolean)
    : [];
  const isActive = req.body?.is_active === false || req.body?.is_active === 0 ? 0 : 1;

  if (name.length < 2) {
    res.status(400).json({ error: 'Plan name is required.' });
    return;
  }

  const baseSlug = slugify(name) || `plan-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;
  while (db.prepare('SELECT 1 FROM membership_plans WHERE slug = ?').get(slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM membership_plans').get() as { m: number }).m;
  const info = db
    .prepare(`
      INSERT INTO membership_plans (slug, name, duration_label, price, description, benefits_json, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(slug, name, durationLabel, price, description, JSON.stringify(benefits), isActive, maxSort + 1);

  const createdPlan = getMembershipPlans(false).find((p) => p.id === Number(info.lastInsertRowid)) as
    | (Record<string, unknown> & { id: number; slug: string; name: string; duration_label: string; price: number | null; description: string; benefits: string[]; is_active: number; sort_order: number })
    | undefined;
  if (createdPlan) await syncMembershipToSupabase(createdPlan);
  res.status(201).json(createdPlan);
});

app.patch('/api/admin/memberships/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Membership plan not found.' });
    return;
  }

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : String(existing.name);
  const durationLabel =
    req.body?.duration_label !== undefined ? String(req.body.duration_label).trim() : String(existing.duration_label);
  const description =
    req.body?.description !== undefined ? String(req.body.description).trim() : String(existing.description);
  const price =
    req.body?.price !== undefined
      ? req.body.price === null || req.body.price === ''
        ? null
        : Math.max(0, Math.round(Number(req.body.price)))
      : existing.price === null
        ? null
        : Number(existing.price);
  const benefitsJson =
    req.body?.benefits !== undefined
      ? JSON.stringify(
          (Array.isArray(req.body.benefits) ? req.body.benefits : [])
            .map((b: unknown) => String(b).trim())
            .filter(Boolean)
        )
      : String(existing.benefits_json);
  const isActive = req.body?.is_active !== undefined ? (req.body.is_active ? 1 : 0) : Number(existing.is_active);

  db.prepare(`
    UPDATE membership_plans
    SET name = ?, duration_label = ?, price = ?, description = ?, benefits_json = ?, is_active = ?
    WHERE id = ?
  `).run(name, durationLabel, price, description, benefitsJson, isActive, id);

  const updatedPlan = getMembershipPlans(false).find((p) => p.id === id) as
    | (Record<string, unknown> & { id: number; slug: string; name: string; duration_label: string; price: number | null; description: string; benefits: string[]; is_active: number; sort_order: number })
    | undefined;
  if (updatedPlan) await syncMembershipToSupabase(updatedPlan);
  res.json(updatedPlan);
});

app.delete('/api/admin/memberships/:id', requireAdmin, (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM membership_plans WHERE id = ?').run(id);
  res.json({ deleted: true });
});

// Admin Gallery Management (supports safe local file upload from base64 data URI or verified URL)
app.get('/api/admin/gallery', requireAdmin, (_req: AdminRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM gallery_images ORDER BY sort_order ASC, id DESC').all());
});

app.post('/api/admin/gallery', requireAdmin, async (req: AdminRequest, res: Response) => {
  const title = String(req.body?.title || '').trim();
  const category = String(req.body?.category || 'Gym Interior') as GalleryCategory;
  const caption = String(req.body?.caption || '').trim();
  const isVerifiedPhoto = req.body?.is_verified_photo === false ? 0 : 1;
  const validCategories: GalleryCategory[] = [
    'Gym Interior',
    'Equipment',
    'Training',
    'Workout Environment',
    'Fitness Activities',
  ];

  if (title.length < 2) {
    res.status(400).json({ error: 'Photograph title is required.' });
    return;
  }
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: 'Invalid gallery category.' });
    return;
  }

  let finalUrl = '';
  const dataUri = String(req.body?.image_data || '').trim();
  const externalUrl = String(req.body?.image_url || '').trim();

  if (dataUri) {
    const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri);
    if (!match) {
      res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are supported.' });
      return;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 2.5 * 1024 * 1024) {
      res.status(400).json({ error: 'Image must be smaller than 2.5 MB.' });
      return;
    }
    const filename = `${crypto.randomUUID()}.${ext}`;
    const targetPath = path.resolve(uploadsDir, filename);
    fs.writeFileSync(targetPath, buffer);
    finalUrl = `/uploads/${filename}`;
  } else if (externalUrl && (externalUrl.startsWith('https://') || externalUrl.startsWith('/'))) {
    finalUrl = externalUrl;
  } else {
    res.status(400).json({ error: 'Please upload an image file or provide a valid https:// URL.' });
    return;
  }

  const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM gallery_images').get() as { m: number }).m;
  const info = db
    .prepare(`
      INSERT INTO gallery_images (title, category, image_url, caption, is_verified_photo, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(title, category, finalUrl, caption, isVerifiedPhoto, maxSort + 1);

  const createdGallery = db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as GalleryImageItem;
  await syncGalleryToSupabase(createdGallery);
  res.status(201).json(createdGallery);
});

app.delete('/api/admin/gallery/:id', requireAdmin, (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT image_url FROM gallery_images WHERE id = ?').get(id) as
    | { image_url: string }
    | undefined;
  if (existing && existing.image_url.startsWith('/uploads/')) {
    const fname = existing.image_url.slice('/uploads/'.length);
    if (/^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(fname)) {
      const target = path.resolve(uploadsDir, fname);
      if (target.startsWith(uploadsDir + path.sep) && fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    }
  }
  db.prepare('DELETE FROM gallery_images WHERE id = ?').run(id);
  res.json({ deleted: true });
});

// Admin Business Settings
app.get('/api/admin/settings', requireAdmin, (_req: AdminRequest, res: Response) => {
  res.json(getFormattedSettings());
});

app.put('/api/admin/settings', requireAdmin, async (req: AdminRequest, res: Response) => {
  const current = getFormattedSettings();
  if (!current) {
    res.status(500).json({ error: 'Settings record missing.' });
    return;
  }

  const b = req.body as Record<string, unknown>;
  const holidays = Array.isArray(b.holidays)
    ? b.holidays
        .filter((h: unknown) => typeof h === 'object' && h !== null && isValidDateStr(String((h as { date?: unknown }).date || '')))
        .map((h: unknown) => ({
          date: String((h as { date: string }).date),
          reason: String((h as { reason?: string }).reason || 'Holiday').trim(),
        }))
    : current.holidays;

  db.prepare(`
    UPDATE business_settings
    SET business_name = ?,
        category = ?,
        address = ?,
        city = ?,
        state = ?,
        postal_code = ?,
        phone = ?,
        whatsapp_number = ?,
        email = ?,
        mon_sat_open = ?,
        mon_sat_close = ?,
        sun_open = ?,
        sun_close = ?,
        holidays_json = ?,
        slot_interval_minutes = ?,
        auto_confirm_bookings = ?,
        updated_at = datetime('now')
    WHERE id = 1
  `).run(
    b.business_name !== undefined ? String(b.business_name).trim() : current.business_name,
    b.category !== undefined ? String(b.category).trim() : current.category,
    b.address !== undefined ? String(b.address).trim() : current.address,
    b.city !== undefined ? String(b.city).trim() : current.city,
    b.state !== undefined ? String(b.state).trim() : current.state,
    b.postal_code !== undefined ? String(b.postal_code).trim() : current.postal_code,
    b.phone !== undefined ? String(b.phone).trim() : current.phone,
    b.whatsapp_number !== undefined ? String(b.whatsapp_number).trim() : current.whatsapp_number,
    b.email !== undefined ? String(b.email).trim() : current.email,
    b.mon_sat_open !== undefined ? String(b.mon_sat_open).trim() : current.mon_sat_open,
    b.mon_sat_close !== undefined ? String(b.mon_sat_close).trim() : current.mon_sat_close,
    b.sun_open !== undefined ? String(b.sun_open).trim() : current.sun_open,
    b.sun_close !== undefined ? String(b.sun_close).trim() : current.sun_close,
    JSON.stringify(holidays),
    b.slot_interval_minutes !== undefined ? Math.max(15, Number(b.slot_interval_minutes) || 60) : current.slot_interval_minutes,
    b.auto_confirm_bookings !== undefined ? (b.auto_confirm_bookings ? 1 : 0) : current.auto_confirm_bookings
  );

  const updatedSettings = getFormattedSettings();
  if (updatedSettings) await syncSettingsToSupabase(updatedSettings);
  res.json(updatedSettings);
});

// Admin Enquiries
app.get('/api/admin/enquiries', requireAdmin, (_req: AdminRequest, res: Response) => {
  res.json(db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all());
});

app.patch('/api/admin/enquiries/:id', requireAdmin, (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  const status = req.body?.status === 'Reviewed' ? 'Reviewed' : 'New';
  db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
  res.json(db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id));
});

// Vite dev middleware or production static assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Play on Fitness server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
