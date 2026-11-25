import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Search, XCircle } from 'lucide-react';
import type { AppointmentItem, TimeSlotOption } from '../types';
import type { AppRoute } from '../components/Navbar';
import { api, formatDateReadable, formatIstTodayStr, formatTime12h } from '../lib/api';

interface BookingStatusPageProps {
  initialRef?: string;
  initialContact?: string;
  onNavigate: (route: AppRoute) => void;
}

export function BookingStatusPage({
  initialRef = '',
  initialContact = '',
  onNavigate,
}: BookingStatusPageProps) {
  const [bookingRef, setBookingRef] = useState(initialRef);
  const [contact, setContact] = useState(initialContact);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appointment, setAppointment] = useState<AppointmentItem | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  // Reschedule state
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(formatIstTodayStr());
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (initialRef && initialContact) {
      setLoading(true);
      api
        .lookupAppointment(initialRef, initialContact)
        .then((res) => setAppointment(res))
        .catch((err) => setError(err instanceof Error ? err.message : 'Unable to find booking.'))
        .finally(() => setLoading(false));
    }
  }, [initialRef, initialContact]);

  useEffect(() => {
    if (!rescheduling || !appointment || !newDate) return;
    setSlotsLoading(true);
    api
      .getAvailability(newDate, appointment.service_id, appointment.trainer_id)
      .then((res) => {
        setSlots(res.closed ? [] : res.slots);
        setNewTime('');
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [rescheduling, appointment, newDate]);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setActionMsg('');
    setRescheduling(false);
    setLoading(true);
    try {
      const res = await api.lookupAppointment(bookingRef.trim(), contact.trim());
      setAppointment(res);
    } catch (err) {
      setAppointment(null);
      setError(err instanceof Error ? err.message : 'Booking not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    setError('');
    setActionMsg('');
    setLoading(true);
    try {
      const updated = await api.cancelAppointment(appointment.booking_ref, contact.trim() || appointment.customer_email);
      setAppointment(updated);
      setActionMsg('Your appointment has been cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !newDate || !newTime) return;
    setError('');
    setActionMsg('');
    setLoading(true);
    try {
      const updated = await api.rescheduleAppointment({
        booking_ref: appointment.booking_ref,
        contact: contact.trim() || appointment.customer_email,
        appointment_date: newDate,
        start_time: newTime,
      });
      setAppointment(updated);
      setRescheduling(false);
      setActionMsg('Your appointment has been rescheduled and marked Pending confirmation.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reschedule booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#09090B] min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-2">
          Customer Booking Portal
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
          Manage Your Appointment
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Look up your booking status, request a reschedule, or cancel an upcoming session using
          your Booking Reference and Email or Phone.
        </p>

        <form
          onSubmit={handleLookup}
          className="mt-8 bg-[#12141A] border border-white/10 p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
        >
          <div className="sm:col-span-5">
            <label htmlFor="lk-ref" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Booking Reference
            </label>
            <input
              id="lk-ref"
              type="text"
              required
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              placeholder="POF-20261125-XXXX"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>
          <div className="sm:col-span-5">
            <label htmlFor="lk-contact" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email or Phone
            </label>
            <input
              id="lk-contact"
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              Find
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 text-sm text-red-200 bg-red-950/60 border border-red-500/40">
            {error}
          </div>
        )}

        {actionMsg && (
          <div className="mt-6 p-4 text-sm text-emerald-200 bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {actionMsg}
          </div>
        )}

        {appointment && (
          <div className="mt-8 bg-[#12141A] border border-white/10 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <p className="text-xs font-mono text-zinc-400">BOOKING REFERENCE</p>
                <h2 className="font-mono text-2xl font-bold text-white mt-0.5 tabular-nums">
                  {appointment.booking_ref}
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border ${
                  appointment.status === 'Confirmed'
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40'
                    : appointment.status === 'Cancelled'
                      ? 'text-red-300 border-red-500/40 bg-red-950/40'
                      : appointment.status === 'Completed'
                        ? 'text-sky-300 border-sky-500/40 bg-sky-950/40'
                        : 'text-amber-300 border-amber-500/40 bg-amber-950/40'
                }`}
              >
                {appointment.status === 'Cancelled' ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                Status: {appointment.status}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Service</p>
                <p className="text-white font-medium mt-0.5">{appointment.service_name}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Trainer</p>
                <p className="text-white font-medium mt-0.5">
                  {appointment.trainer_name || 'Any Available Coach'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Appointment Date</p>
                <p className="text-white font-mono tabular-nums mt-0.5">
                  {formatDateReadable(appointment.appointment_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Time</p>
                <p className="text-white font-mono tabular-nums mt-0.5">
                  {formatTime12h(appointment.start_time)} – {formatTime12h(appointment.end_time)}
                </p>
              </div>
            </div>

            {(appointment.status === 'Pending' || appointment.status === 'Confirmed') && (
              <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduling((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  {rescheduling ? 'Hide Reschedule' : 'Request Reschedule'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCancel}
                  className="px-5 py-2.5 text-xs font-medium text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/60 rounded-sm cursor-pointer"
                >
                  Cancel Appointment
                </button>
              </div>
            )}

            {rescheduling && (
              <div className="mt-6 p-5 bg-[#09090B] border border-white/10 space-y-4">
                <h3 className="font-display text-lg font-bold text-white">Choose New Date &amp; Time</h3>
                <div>
                  <label htmlFor="rs-date" className="block text-xs text-zinc-400 mb-1.5">
                    New Date
                  </label>
                  <input
                    id="rs-date"
                    type="date"
                    min={formatIstTodayStr()}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="px-3.5 py-2 text-sm bg-[#12141A] border border-white/15 text-white rounded-sm"
                  />
                </div>

                <div>
                  <p className="text-xs text-zinc-400 mb-2">Available Slots</p>
                  {slotsLoading ? (
                    <p className="text-xs text-zinc-500">Loading available slots...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-zinc-500">No open slots on this date.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          onClick={() => setNewTime(s.time)}
                          className={`py-2 px-3 text-xs font-mono border cursor-pointer ${
                            newTime === s.time
                              ? 'bg-[#FF5A1F] text-zinc-950 border-[#FF5A1F] font-semibold'
                              : 'bg-[#12141A] text-zinc-200 border-white/15'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!newTime || loading}
                    onClick={handleReschedule}
                    className="px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] disabled:opacity-50 rounded-sm cursor-pointer"
                  >
                    Save New Slot
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => onNavigate('/book')}
            className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Need a new appointment? Go to Session Booking
          </button>
        </div>
      </div>
    </div>
  );
}
