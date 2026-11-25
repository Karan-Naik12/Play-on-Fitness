import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  User,
} from 'lucide-react';
import type {
  AppointmentItem,
  BusinessSettings,
  ServiceItem,
  TimeSlotOption,
  TrainerItem,
} from '../types';
import type { AppRoute } from '../components/Navbar';
import {
  api,
  formatDateReadable,
  formatINR,
  formatIstTodayStr,
  formatTime12h,
} from '../lib/api';

interface BookingPageProps {
  settings: BusinessSettings | null;
  services: ServiceItem[];
  trainers: TrainerItem[];
  initialServiceId: number | null;
  initialTrainerId: number | null;
  onNavigate: (route: AppRoute) => void;
  onManageRef: (bookingRef: string, contact: string) => void;
}

const STEPS = [
  { num: 1, label: 'Service' },
  { num: 2, label: 'Trainer' },
  { num: 3, label: 'Date' },
  { num: 4, label: 'Time' },
  { num: 5, label: 'Details' },
  { num: 6, label: 'Summary' },
  { num: 7, label: 'Confirmed' },
];

export function BookingPage({
  settings,
  services,
  trainers,
  initialServiceId,
  initialTrainerId,
  onNavigate,
  onManageRef,
}: BookingPageProps) {
  const todayStr = useMemo(() => formatIstTodayStr(), []);
  const [step, setStep] = useState<number>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    initialServiceId ?? services[0]?.id ?? null
  );
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(
    initialTrainerId ?? null
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsClosedReason, setSlotsClosedReason] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<AppointmentItem | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (initialServiceId && services.some((s) => s.id === initialServiceId)) {
      setSelectedServiceId(initialServiceId);
    } else if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [initialServiceId, services, selectedServiceId]);

  useEffect(() => {
    if (initialTrainerId && trainers.some((t) => t.id === initialTrainerId)) {
      setSelectedTrainerId(initialTrainerId);
    }
  }, [initialTrainerId, trainers]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const selectedTrainer = useMemo(
    () => trainers.find((t) => t.id === selectedTrainerId) || null,
    [trainers, selectedTrainerId]
  );

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of settings?.holidays || []) {
      map.set(h.date, h.reason || 'Holiday');
    }
    return map;
  }, [settings]);

  // Fetch available slots whenever date, service, or trainer changes on steps >= 3
  useEffect(() => {
    if (!selectedServiceId || !selectedDate) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsClosedReason('');
    api
      .getAvailability(selectedDate, selectedServiceId, selectedTrainerId)
      .then((res) => {
        if (cancelled) return;
        if (res.closed) {
          setSlots([]);
          setSlotsClosedReason(res.closedReason || 'No sessions available on this date.');
        } else {
          setSlots(res.slots);
          if (res.slots.length === 0) {
            setSlotsClosedReason('All appointment slots on this date are booked or past.');
          }
        }
        setSelectedTime((prev) => (res.slots.some((s) => s.time === prev) ? prev : ''));
      })
      .catch((err) => {
        if (cancelled) return;
        setSlots([]);
        setSlotsClosedReason(err instanceof Error ? err.message : 'Unable to check availability.');
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedServiceId, selectedTrainerId]);

  // Build calendar days for the displayed month
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: Array<{ dateStr: string; day: number } | null> = [];
    for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, day: d });
    }
    return cells;
  }, [calendarMonth]);

  const monthTitle = useMemo(() => {
    const dt = new Date(Date.UTC(calendarMonth.year, calendarMonth.month, 1));
    return dt.toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  }, [calendarMonth]);

  const validateDetails = (): boolean => {
    setFormError('');
    if (customerName.trim().length < 2) {
      setFormError('Please enter your full name.');
      return false;
    }
    const phoneDigits = customerPhone.replace(/[^\d+]/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setFormError('Please enter a valid phone number.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customerEmail.trim())) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleConfirmBooking = async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const created = await api.createAppointment({
        service_id: selectedServiceId,
        trainer_id: selectedTrainerId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        appointment_date: selectedDate,
        start_time: selectedTime,
        notes: notes.trim(),
      });
      setConfirmedBooking(created);
      setStep(7);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to confirm appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyBookingRef = async () => {
    if (!confirmedBooking) return;
    try {
      await navigator.clipboard.writeText(confirmedBooking.booking_ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-[#09090B] min-h-screen pb-20">
      <section className="py-12 sm:py-16 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-2">
                Online Scheduling
              </p>
              <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
                Book Your Training Session
              </h1>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/booking-status')}
              className="text-xs font-medium text-zinc-300 hover:text-white underline underline-offset-4 cursor-pointer self-start sm:self-auto"
            >
              Already booked? Manage or Reschedule
            </button>
          </div>

          {/* 7-Step Progress Strip */}
          <nav aria-label="Booking steps" className="mt-8 overflow-x-auto pb-2">
            <ol className="flex items-center gap-2 min-w-max">
              {STEPS.map((s) => {
                const isCurrent = step === s.num;
                const isDone = step > s.num || (step === 7 && s.num === 7);
                return (
                  <li key={s.num} className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={s.num > step || step === 7}
                      onClick={() => {
                        if (s.num < step && step < 7) setStep(s.num);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#FF5A1F] text-zinc-950 border-[#FF5A1F] font-semibold'
                          : isDone
                            ? 'bg-white/5 text-white border-white/20 cursor-pointer'
                            : 'bg-[#12141A] text-zinc-500 border-white/10 cursor-default'
                      }`}
                    >
                      <span className="font-mono tabular-nums">{s.num}</span>
                      <span>{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </section>

      <section className="pt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#12141A] border border-white/10 p-6 sm:p-8">
            {/* STEP 1: Select Service */}
            {step === 1 && (
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Step 1: Select a Service
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Choose the training category you want to reserve.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((srv) => {
                    const active = selectedServiceId === srv.id;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`text-left p-4 border transition-colors cursor-pointer flex flex-col justify-between ${
                          active
                            ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]'
                            : 'bg-[#09090B] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1.5">
                            <span>{srv.category}</span>
                            <span className="font-mono tabular-nums">{srv.duration_minutes} min</span>
                          </div>
                          <h3 className="font-display text-xl font-bold text-white">{srv.name}</h3>
                          <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2">{srv.description}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-200">{formatINR(srv.price)}</span>
                          {active && <span className="text-[#FF7833] font-semibold">Selected</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedServiceId}
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] disabled:opacity-50 rounded-sm cursor-pointer"
                  >
                    Continue to Trainer
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Select Trainer */}
            {step === 2 && (
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Step 2: Select a Trainer
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Pick a preferred coach or select any available trainer for your session.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTrainerId(null)}
                    className={`text-left p-5 border transition-colors cursor-pointer ${
                      selectedTrainerId === null
                        ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]'
                        : 'bg-[#09090B] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#FF7833]">Flexible Option</span>
                      {selectedTrainerId === null && (
                        <Check className="w-4 h-4 text-[#FF7833]" aria-hidden="true" />
                      )}
                    </div>
                    <h3 className="mt-1 font-display text-xl font-bold text-white">
                      Any Available Coach
                    </h3>
                    <p className="mt-1.5 text-xs text-zinc-400">
                      Maximizes available time slots across all active coaches and floor hours.
                    </p>
                  </button>

                  {trainers.map((t) => {
                    const active = selectedTrainerId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTrainerId(t.id)}
                        className={`text-left p-5 border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]'
                            : 'bg-[#09090B] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-400">{t.specialization}</span>
                          {active && <Check className="w-4 h-4 text-[#FF7833]" aria-hidden="true" />}
                        </div>
                        <h3 className="mt-1 font-display text-xl font-bold text-white">{t.name}</h3>
                        <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2">{t.bio}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white border border-white/15 rounded-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                  >
                    Continue to Date
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Select Date */}
            {step === 3 && (
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Step 3: Select Appointment Date
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Past dates and centre holidays cannot be booked.
                </p>

                <div className="mt-6 max-w-md bg-[#09090B] border border-white/10 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() =>
                        setCalendarMonth((prev) =>
                          prev.month === 0
                            ? { year: prev.year - 1, month: 11 }
                            : { year: prev.year, month: prev.month - 1 }
                        )
                      }
                      className="w-9 h-9 flex items-center justify-center border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-display text-lg font-bold text-white">{monthTitle}</span>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() =>
                        setCalendarMonth((prev) =>
                          prev.month === 11
                            ? { year: prev.year + 1, month: 0 }
                            : { year: prev.year, month: prev.month + 1 }
                        )
                      }
                      className="w-9 h-9 flex items-center justify-center border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500 font-mono mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} className="py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, i) => {
                      if (!cell) return <div key={`empty-${i}`} />;
                      const isPast = cell.dateStr < todayStr;
                      const holidayReason = holidayMap.get(cell.dateStr);
                      const disabled = isPast || Boolean(holidayReason);
                      const isSelected = selectedDate === cell.dateStr;

                      return (
                        <button
                          key={cell.dateStr}
                          type="button"
                          disabled={disabled}
                          title={holidayReason || undefined}
                          onClick={() => setSelectedDate(cell.dateStr)}
                          className={`h-10 text-xs font-mono tabular-nums rounded-sm border transition-colors ${
                            isSelected
                              ? 'bg-[#FF5A1F] text-zinc-950 border-[#FF5A1F] font-bold cursor-pointer'
                              : disabled
                                ? 'bg-transparent text-zinc-700 border-transparent cursor-not-allowed line-through'
                                : 'bg-[#12141A] text-zinc-200 border-white/10 hover:border-[#FF5A1F]/60 cursor-pointer'
                          }`}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 text-xs text-zinc-400">
                  Selected Date:{' '}
                  <span className="text-white font-semibold">{formatDateReadable(selectedDate)}</span>
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white border border-white/15 rounded-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!selectedDate || holidayMap.has(selectedDate)}
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] disabled:opacity-50 rounded-sm cursor-pointer"
                  >
                    View Available Time Slots
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Available Time Slots */}
            {step === 4 && (
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Step 4: Select Available Time Slot
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Showing open slots for{' '}
                  <span className="text-white font-medium">{selectedService?.name}</span> on{' '}
                  <span className="text-white font-medium">{formatDateReadable(selectedDate)}</span>.
                </p>

                <div className="mt-6">
                  {slotsLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="h-12 bg-white/5 animate-pulse border border-white/10" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="p-6 bg-[#09090B] border border-white/10 text-sm text-zinc-300 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[#FF6B2C] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">No open slots available</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {slotsClosedReason || 'Please select another date or trainer.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const active = selectedTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-3 px-4 border text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#FF5A1F] text-zinc-950 border-[#FF5A1F]'
                                : 'bg-[#09090B] text-zinc-100 border-white/15 hover:border-[#FF5A1F]'
                            }`}
                          >
                            <div className="font-mono text-sm font-semibold tabular-nums">
                              {slot.label}
                            </div>
                            <div
                              className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                                active ? 'text-zinc-900' : 'text-zinc-500'
                              }`}
                            >
                              until {formatTime12h(slot.end_time)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white border border-white/15 rounded-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Change Date
                  </button>
                  <button
                    type="button"
                    disabled={!selectedTime}
                    onClick={() => setStep(5)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] disabled:opacity-50 rounded-sm cursor-pointer"
                  >
                    Enter Your Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Customer Details */}
            {step === 5 && (
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Step 5: Customer Details
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Enter your contact information to receive your booking reference.
                </p>

                <div className="mt-5 p-4 bg-[#09090B] border border-white/10 flex flex-wrap gap-6 text-xs text-zinc-300">
                  <div>
                    <span className="text-zinc-500">Service: </span>
                    <span className="text-white font-medium">{selectedService?.name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Date: </span>
                    <span className="text-white font-medium">{formatDateReadable(selectedDate)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Time: </span>
                    <span className="text-white font-mono tabular-nums">{formatTime12h(selectedTime)}</span>
                  </div>
                </div>

                {formError && (
                  <div className="mt-4 p-3 text-xs text-red-200 bg-red-950/60 border border-red-500/40">
                    {formError}
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="bk-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      id="bk-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="bk-phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        id="bk-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 98..."
                        className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                      />
                    </div>
                    <div>
                      <label htmlFor="bk-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        id="bk-email"
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bk-notes" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Additional Message (Optional)
                    </label>
                    <textarea
                      id="bk-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Fitness goals, injury notes, or questions for your coach..."
                      className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                    />
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white border border-white/15 rounded-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateDetails()) setStep(6);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                  >
                    Review Booking Summary
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: Booking Summary */}
            {step === 6 && (
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Step 6: Booking Summary
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Verify your session details before confirming your appointment.
                </p>

                {submitError && (
                  <div className="mt-4 p-3.5 text-xs text-red-200 bg-red-950/60 border border-red-500/40">
                    {submitError}
                  </div>
                )}

                <div className="mt-6 bg-[#09090B] border border-white/10 divide-y divide-white/10 text-sm">
                  <div className="p-4 flex justify-between gap-4">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                      Service
                    </span>
                    <span className="text-white font-medium text-right">
                      {selectedService?.name} ({selectedService?.duration_minutes} min)
                    </span>
                  </div>
                  <div className="p-4 flex justify-between gap-4">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                      Trainer
                    </span>
                    <span className="text-white font-medium text-right">
                      {selectedTrainer ? selectedTrainer.name : 'Any Available Coach'}
                    </span>
                  </div>
                  <div className="p-4 flex justify-between gap-4">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                      Date &amp; Time
                    </span>
                    <span className="text-white font-mono tabular-nums text-right">
                      {formatDateReadable(selectedDate)} · {formatTime12h(selectedTime)}
                    </span>
                  </div>
                  <div className="p-4 flex justify-between gap-4">
                    <span className="text-zinc-400">Rate</span>
                    <span className="text-white font-mono tabular-nums">
                      {formatINR(selectedService?.price)}
                    </span>
                  </div>
                  <div className="p-4 flex justify-between gap-4">
                    <span className="text-zinc-400">Customer</span>
                    <span className="text-white text-right">
                      {customerName}
                      <span className="block text-xs text-zinc-400 mt-0.5">
                        {customerPhone} · {customerEmail}
                      </span>
                    </span>
                  </div>
                  {notes && (
                    <div className="p-4 flex justify-between gap-4">
                      <span className="text-zinc-400">Notes</span>
                      <span className="text-zinc-300 text-right max-w-md">{notes}</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white border border-white/15 rounded-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Edit Details
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] disabled:opacity-60 rounded-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {submitting ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: Confirmation */}
            {step === 7 && confirmedBooking && (
              <div className="py-4">
                <div className="flex items-start gap-4 pb-6 border-b border-white/10">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                      Status: {confirmedBooking.status}
                    </p>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
                      Appointment Reserved
                    </h2>
                    <p className="mt-1 text-sm text-zinc-300">
                      Save your booking reference below to check status, reschedule, or cancel anytime.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-5 bg-[#09090B] border border-[#FF5A1F]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-400">Booking Reference</p>
                    <p className="font-mono text-2xl font-bold text-white tracking-wider tabular-nums mt-0.5">
                      {confirmedBooking.booking_ref}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyBookingRef}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-sm cursor-pointer self-start sm:self-auto"
                  >
                    {copiedRef ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedRef ? 'Copied' : 'Copy Reference'}
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-[#09090B] border border-white/10 p-5">
                  <div>
                    <p className="text-xs text-zinc-500">Service</p>
                    <p className="text-white font-medium mt-0.5">{confirmedBooking.service_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Trainer</p>
                    <p className="text-white font-medium mt-0.5">
                      {confirmedBooking.trainer_name || 'Any Available Coach'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Date &amp; Time</p>
                    <p className="text-white font-mono tabular-nums mt-0.5">
                      {formatDateReadable(confirmedBooking.appointment_date)} ·{' '}
                      {formatTime12h(confirmedBooking.start_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Location</p>
                    <p className="text-zinc-300 mt-0.5">
                      2nd Floor, 309, 100 Feet Ring Road, JP Nagar
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onManageRef(confirmedBooking.booking_ref, confirmedBooking.customer_email)
                    }
                    className="px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                  >
                    Manage / Reschedule Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedBooking(null);
                      setSelectedTime('');
                      setNotes('');
                      setStep(1);
                    }}
                    className="px-6 py-3 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-sm cursor-pointer"
                  >
                    Book Another Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
