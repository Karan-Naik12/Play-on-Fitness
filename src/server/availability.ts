import { db } from './db.ts';
import type { HolidayEntry, TimeSlotOption } from '../types.ts';

export function getIstNow(): { dateStr: string; timeMinutes: number } {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateStr = dateFormatter.format(now);
  const [hh, mm] = timeFormatter.format(now).split(':').map(Number);
  return { dateStr, timeMinutes: (hh || 0) * 60 + (mm || 0) };
}

export function parseTimeToMinutes(hhmm: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return -1;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return -1;
  return hours * 60 + mins;
}

export function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return utcDate.getUTCDay();
}

export function isValidDateStr(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

interface AvailabilityResult {
  closed: boolean;
  closedReason?: string;
  businessHours?: { open: string; close: string };
  slots: TimeSlotOption[];
}

export function computeAvailableSlots(params: {
  date: string;
  serviceId: number;
  trainerId: number | null;
  excludeAppointmentId?: number;
}): AvailabilityResult {
  const { date, serviceId, trainerId, excludeAppointmentId } = params;

  if (!isValidDateStr(date)) {
    return { closed: true, closedReason: 'Invalid date format.', slots: [] };
  }

  const istNow = getIstNow();
  if (date < istNow.dateStr) {
    return { closed: true, closedReason: 'Bookings cannot be made for past dates.', slots: [] };
  }

  const settings = db
    .prepare('SELECT * FROM business_settings WHERE id = 1')
    .get() as {
      mon_sat_open: string;
      mon_sat_close: string;
      sun_open: string;
      sun_close: string;
      holidays_json: string;
      slot_interval_minutes: number;
    } | undefined;

  if (!settings) {
    return { closed: true, closedReason: 'Business settings unavailable.', slots: [] };
  }

  let holidays: HolidayEntry[] = [];
  try {
    holidays = JSON.parse(settings.holidays_json || '[]') as HolidayEntry[];
  } catch {
    holidays = [];
  }

  const holidayMatch = holidays.find((h) => h.date === date);
  if (holidayMatch) {
    return {
      closed: true,
      closedReason: `Closed for holiday${holidayMatch.reason ? `: ${holidayMatch.reason}` : '.'}`,
      slots: [],
    };
  }

  const service = db
    .prepare('SELECT id, duration_minutes, is_enabled FROM services WHERE id = ?')
    .get(serviceId) as { id: number; duration_minutes: number; is_enabled: number } | undefined;

  if (!service || !service.is_enabled) {
    return { closed: true, closedReason: 'Selected service is not currently available.', slots: [] };
  }

  const dow = getDayOfWeek(date);
  const openStr = dow === 0 ? settings.sun_open : settings.mon_sat_open;
  const closeStr = dow === 0 ? settings.sun_close : settings.mon_sat_close;

  let windowStart = parseTimeToMinutes(openStr);
  let windowEnd = parseTimeToMinutes(closeStr);

  if (windowStart < 0 || windowEnd < 0 || windowEnd <= windowStart) {
    return { closed: true, closedReason: 'Facility is closed on this day.', slots: [] };
  }

  if (trainerId !== null) {
    const trainer = db
      .prepare('SELECT id, is_active FROM trainers WHERE id = ?')
      .get(trainerId) as { id: number; is_active: number } | undefined;

    if (!trainer || !trainer.is_active) {
      return { closed: true, closedReason: 'Selected trainer is not active.', slots: [] };
    }

    const trainerAvail = db
      .prepare('SELECT start_time, end_time, is_available FROM trainer_availability WHERE trainer_id = ? AND day_of_week = ?')
      .get(trainerId, dow) as { start_time: string; end_time: string; is_available: number } | undefined;

    if (trainerAvail) {
      if (!trainerAvail.is_available) {
        return {
          closed: true,
          closedReason: 'Selected trainer is not available on this day of the week.',
          businessHours: { open: openStr, close: closeStr },
          slots: [],
        };
      }
      const tStart = parseTimeToMinutes(trainerAvail.start_time);
      const tEnd = parseTimeToMinutes(trainerAvail.end_time);
      if (tStart >= 0 && tEnd > tStart) {
        windowStart = Math.max(windowStart, tStart);
        windowEnd = Math.min(windowEnd, tEnd);
      }
    }
  }

  if (windowEnd <= windowStart) {
    return {
      closed: true,
      closedReason: 'No overlapping coaching hours on this date.',
      businessHours: { open: openStr, close: closeStr },
      slots: [],
    };
  }

  // Query active appointments on this date
  const existingAppointments = db
    .prepare(`
      SELECT id, trainer_id, start_time, end_time
      FROM appointments
      WHERE appointment_date = ? AND status != 'Cancelled'
    `)
    .all(date) as Array<{ id: number; trainer_id: number | null; start_time: string; end_time: string }>;

  const activeTrainersCount = (
    db.prepare('SELECT COUNT(*) AS cnt FROM trainers WHERE is_active = 1').get() as { cnt: number }
  ).cnt;

  const duration = Math.max(15, service.duration_minutes || 60);
  const step = Math.max(15, settings.slot_interval_minutes || 60);
  const slots: TimeSlotOption[] = [];

  for (let startMin = windowStart; startMin + duration <= windowEnd; startMin += step) {
    const endMin = startMin + duration;
    const startHHMM = minutesToHHMM(startMin);
    const endHHMM = minutesToHHMM(endMin);

    // Block past slots on today's IST date (with 15 min lead buffer)
    if (date === istNow.dateStr && startMin <= istNow.timeMinutes + 15) {
      continue;
    }

    const overlapping = existingAppointments.filter((appt) => {
      if (excludeAppointmentId && appt.id === excludeAppointmentId) return false;
      const aStart = parseTimeToMinutes(appt.start_time);
      const aEnd = parseTimeToMinutes(appt.end_time);
      return startMin < aEnd && endMin > aStart;
    });

    let isBooked = false;
    const maxConcurrent = Math.max(1, activeTrainersCount);
    if (trainerId !== null) {
      // Specific trainer requested: unavailable if this trainer already has an overlapping booking or capacity is full
      isBooked =
        overlapping.some((appt) => appt.trainer_id === trainerId) ||
        overlapping.length >= maxConcurrent;
    } else {
      // Any available coach/floor slot: unavailable if all active coach slots at this time are taken
      if (overlapping.length >= maxConcurrent) {
        isBooked = true;
      }
    }

    // Never show booked slots as available
    if (!isBooked) {
      slots.push({
        time: startHHMM,
        end_time: endHHMM,
        label: formatTime12h(startHHMM),
        available: true,
      });
    }
  }

  return {
    closed: false,
    businessHours: { open: openStr, close: closeStr },
    slots,
  };
}
