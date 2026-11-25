import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const configuredDbPath = process.env.DB_PATH?.trim();
const dbFilePath = configuredDbPath
  ? path.resolve(configuredDbPath)
  : path.resolve(process.cwd(), 'data', 'playonfitness.db');

fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

export const db = new DatabaseSync(dbFilePath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      price INTEGER,
      image_url TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      is_proposed INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialization TEXT NOT NULL,
      experience TEXT NOT NULL,
      qualifications TEXT NOT NULL,
      bio TEXT NOT NULL,
      photo_url TEXT NOT NULL DEFAULT '',
      is_placeholder INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trainer_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      UNIQUE(trainer_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
      trainer_id INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')),
      notes TEXT NOT NULL DEFAULT '',
      reschedule_requested_date TEXT,
      reschedule_requested_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date_status
      ON appointments (appointment_date, status);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_trainer_slot
      ON appointments (appointment_date, start_time, trainer_id)
      WHERE status != 'Cancelled' AND trainer_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      duration_label TEXT NOT NULL,
      price INTEGER,
      description TEXT NOT NULL,
      benefits_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Gym Interior', 'Equipment', 'Training', 'Workout Environment', 'Fitness Activities')),
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      is_verified_photo INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT NOT NULL,
      category TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      whatsapp_number TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      mon_sat_open TEXT NOT NULL DEFAULT '05:30',
      mon_sat_close TEXT NOT NULL DEFAULT '22:00',
      sun_open TEXT NOT NULL DEFAULT '06:30',
      sun_close TEXT NOT NULL DEFAULT '13:00',
      holidays_json TEXT NOT NULL DEFAULT '[]',
      slot_interval_minutes INTEGER NOT NULL DEFAULT 60,
      auto_confirm_bookings INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('contact', 'membership')),
      plan_name TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Reviewed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const settingsCount = db.prepare('SELECT COUNT(*) AS count FROM business_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO business_settings (
        id, business_name, category, address, city, state, postal_code,
        phone, whatsapp_number, email, mon_sat_open, mon_sat_close, sun_open, sun_close,
        holidays_json, slot_interval_minutes, auto_confirm_bookings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'Play on Fitness',
      'Gym / Fitness Centre',
      '2nd Floor, 309, 100 Feet Ring Road, near Delmia Circle, JP Nagar',
      'Bengaluru',
      'Karnataka',
      '560078',
      '',
      '',
      '',
      '05:30',
      '22:00',
      '06:30',
      '13:00',
      '[]',
      60,
      0
    );
  }

  const servicesCount = db.prepare('SELECT COUNT(*) AS count FROM services').get() as { count: number };
  if (servicesCount.count === 0) {
    const defaultServices = [
      {
        slug: 'gym-workout',
        name: 'Gym Workout',
        category: 'Floor Training',
        description: 'Structured access to free weights, racks, machines, and general floor workout routines tailored to your schedule.',
        duration_minutes: 60,
        image_url: '/src/assets/images/hero_strength_arena_1795614906522.jpg',
        sort_order: 1,
      },
      {
        slug: 'cardio-training',
        name: 'Cardio Training',
        category: 'Endurance',
        description: 'Heart-rate conditioning sessions focused on stamina, aerobic capacity, and steady metabolic work.',
        duration_minutes: 45,
        image_url: '/src/assets/images/service_cardio_conditioning_1795614908734.jpg',
        sort_order: 2,
      },
      {
        slug: 'strength-training',
        name: 'Strength Training',
        category: 'Barbell & Resistance',
        description: 'Progressive resistance programming centred on compound barbell lifts, hypertrophy, and measurable strength gains.',
        duration_minutes: 60,
        image_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
        sort_order: 3,
      },
      {
        slug: 'functional-training',
        name: 'Functional Training',
        category: 'Movement & Conditioning',
        description: 'Multi-planar movement patterns, sled work, and athletic stability drills built for everyday performance.',
        duration_minutes: 60,
        image_url: '/src/assets/images/service_functional_kettlebell_1795614907309.jpg',
        sort_order: 4,
      },
      {
        slug: 'crossfit',
        name: 'CrossFit',
        category: 'High-Intensity Conditioning',
        description: 'High-output mixed-modal workouts combining Olympic lifting mechanics, bodyweight movements, and interval conditioning.',
        duration_minutes: 60,
        image_url: '/src/assets/images/service_functional_kettlebell_1795614907309.jpg',
        sort_order: 5,
      },
      {
        slug: 'personal-training',
        name: 'Personal Training',
        category: '1-on-1 Coaching',
        description: 'Dedicated one-on-one coaching with individualized programming, technique cues, and accountability.',
        duration_minutes: 60,
        image_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
        sort_order: 6,
      },
      {
        slug: 'stretching-and-mobility',
        name: 'Stretching and Mobility',
        category: 'Recovery & Range',
        description: 'Guided joint mobility, flexibility drills, and active recovery sessions to support pain-free movement.',
        duration_minutes: 45,
        image_url: '/src/assets/images/service_mobility_coaching_1795614908804.jpg',
        sort_order: 7,
      },
      {
        slug: 'kettlebell-training',
        name: 'Kettlebell Training',
        category: 'Ballistic Strength',
        description: 'Focused kettlebell technique covering swings, Turkish get-ups, cleans, and posterior-chain conditioning.',
        duration_minutes: 45,
        image_url: '/src/assets/images/service_functional_kettlebell_1795614907309.jpg',
        sort_order: 8,
      },
      {
        slug: 'fitness-guidance',
        name: 'Fitness Guidance',
        category: 'Assessment & Orientation',
        description: 'Initial movement orientation, goal mapping, and practical workout structuring for new and returning members.',
        duration_minutes: 45,
        image_url: '/src/assets/images/service_mobility_coaching_1795614908804.jpg',
        sort_order: 9,
      },
    ];

    const insertService = db.prepare(`
      INSERT INTO services (slug, name, category, description, duration_minutes, price, image_url, is_enabled, is_proposed, sort_order)
      VALUES (?, ?, ?, ?, ?, NULL, ?, 1, 1, ?)
    `);
    for (const s of defaultServices) {
      insertService.run(s.slug, s.name, s.category, s.description, s.duration_minutes, s.image_url, s.sort_order);
    }
  }

  const trainersCount = db.prepare('SELECT COUNT(*) AS count FROM trainers').get() as { count: number };
  if (trainersCount.count === 0) {
    const placeholderTrainers = [
      {
        name: 'Trainer Profile 01 (Pending Details)',
        specialization: 'Strength & Barbell Conditioning',
        experience: 'Pending owner verification',
        qualifications: 'Pending owner verification',
        bio: 'Placeholder coach slot reserved for verified trainer details configured by Play on Fitness management.',
        photo_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
      },
      {
        name: 'Trainer Profile 02 (Pending Details)',
        specialization: 'Functional & Kettlebell Training',
        experience: 'Pending owner verification',
        qualifications: 'Pending owner verification',
        bio: 'Placeholder coach slot reserved for verified trainer details configured by Play on Fitness management.',
        photo_url: '/src/assets/images/service_functional_kettlebell_1795614907309.jpg',
      },
      {
        name: 'Trainer Profile 03 (Pending Details)',
        specialization: 'Personal Training & Mobility',
        experience: 'Pending owner verification',
        qualifications: 'Pending owner verification',
        bio: 'Placeholder coach slot reserved for verified trainer details configured by Play on Fitness management.',
        photo_url: '/src/assets/images/service_mobility_coaching_1795614908804.jpg',
      },
    ];

    const insertTrainer = db.prepare(`
      INSERT INTO trainers (name, specialization, experience, qualifications, bio, photo_url, is_placeholder, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
    `);
    const insertAvail = db.prepare(`
      INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time, is_available)
      VALUES (?, ?, ?, ?, 1)
    `);

    for (const t of placeholderTrainers) {
      const info = insertTrainer.run(t.name, t.specialization, t.experience, t.qualifications, t.bio, t.photo_url);
      const trainerId = Number(info.lastInsertRowid);
      for (let dow = 0; dow <= 6; dow++) {
        if (dow === 0) {
          insertAvail.run(trainerId, dow, '06:30', '13:00');
        } else {
          insertAvail.run(trainerId, dow, '05:30', '22:00');
        }
      }
    }
  }

  const plansCount = db.prepare('SELECT COUNT(*) AS count FROM membership_plans').get() as { count: number };
  if (plansCount.count === 0) {
    const defaultPlans = [
      {
        slug: 'daily-pass',
        name: 'Daily Pass',
        duration_label: '1 Day Access',
        description: 'Single-day training floor access for drop-in athletes and visitors in JP Nagar.',
        benefits: ['Full gym floor access during business hours', 'Strength and cardio equipment zones', 'Locker & changing room access'],
        sort_order: 1,
      },
      {
        slug: 'monthly-membership',
        name: 'Monthly Membership',
        duration_label: '1 Month',
        description: 'Flexible month-to-month access to all primary training zones without long-term commitment.',
        benefits: ['Unlimited floor access Mon–Sun', 'Free weights, racks & cardio zone', 'Initial floor orientation on request'],
        sort_order: 2,
      },
      {
        slug: 'quarterly-membership',
        name: 'Quarterly Membership',
        duration_label: '3 Months',
        description: 'Structured 90-day training cycle designed for building consistent weekly training habits.',
        benefits: ['Unlimited gym floor access Mon–Sun', 'Access to strength & functional areas', 'Routine check-in guidance'],
        sort_order: 3,
      },
      {
        slug: 'half-yearly-membership',
        name: 'Half-Yearly Membership',
        duration_label: '6 Months',
        description: 'Six-month commitment supporting progressive strength blocks and steady conditioning.',
        benefits: ['Full 6-month facility access', 'All strength, cardio & mobility zones', 'Priority booking for floor guidance'],
        sort_order: 4,
      },
      {
        slug: 'annual-membership',
        name: 'Annual Membership',
        duration_label: '12 Months',
        description: 'Year-round membership built for dedicated lifters and long-term athletic progression.',
        benefits: ['Full 12-month facility access', 'All strength, functional & cardio equipment', 'Seasonal fitness check-ins'],
        sort_order: 5,
      },
      {
        slug: 'personal-training',
        name: 'Personal Training',
        duration_label: 'Custom Session Pack',
        description: 'Dedicated one-on-one coaching tailored around your movement profile, schedule, and goals.',
        benefits: ['1-on-1 coaching sessions', 'Individualized training progression', 'Technique feedback & accountability'],
        sort_order: 6,
      },
    ];

    const insertPlan = db.prepare(`
      INSERT INTO membership_plans (slug, name, duration_label, price, description, benefits_json, is_active, sort_order)
      VALUES (?, ?, ?, NULL, ?, ?, 1, ?)
    `);
    for (const p of defaultPlans) {
      insertPlan.run(p.slug, p.name, p.duration_label, p.description, JSON.stringify(p.benefits), p.sort_order);
    }
  }

  const galleryCount = db.prepare('SELECT COUNT(*) AS count FROM gallery_images').get() as { count: number };
  if (galleryCount.count === 0) {
    const initialPreviews = [
      {
        title: 'Strength Floor Concept',
        category: 'Gym Interior',
        image_url: '/src/assets/images/hero_strength_arena_1795614906522.jpg',
        caption: 'Representative visual preview — owner can upload verified Play on Fitness facility photographs in the Admin Dashboard.',
        sort_order: 1,
      },
      {
        title: 'Calibrated Barbell Station',
        category: 'Equipment',
        image_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
        caption: 'Representative equipment visual — replace with verified facility photographs via Admin Settings.',
        sort_order: 2,
      },
      {
        title: 'Functional & Kettlebell Lane',
        category: 'Training',
        image_url: '/src/assets/images/service_functional_kettlebell_1795614907309.jpg',
        caption: 'Representative functional zone visual — verified business photos can be uploaded by the owner.',
        sort_order: 3,
      },
      {
        title: 'Conditioning Ergometer Zone',
        category: 'Workout Environment',
        image_url: '/src/assets/images/service_cardio_conditioning_1795614908734.jpg',
        caption: 'Representative conditioning floor visual — verified business photos can be uploaded by the owner.',
        sort_order: 4,
      },
      {
        title: 'Mobility & Recovery Studio',
        category: 'Fitness Activities',
        image_url: '/src/assets/images/service_mobility_coaching_1795614908804.jpg',
        caption: 'Representative mobility zone visual — verified business photos can be uploaded by the owner.',
        sort_order: 5,
      },
    ];
    const insertGallery = db.prepare(`
      INSERT INTO gallery_images (title, category, image_url, caption, is_verified_photo, sort_order)
      VALUES (?, ?, ?, ?, 0, ?)
    `);
    for (const g of initialPreviews) {
      insertGallery.run(g.title, g.category, g.image_url, g.caption, g.sort_order);
    }
  }
}
