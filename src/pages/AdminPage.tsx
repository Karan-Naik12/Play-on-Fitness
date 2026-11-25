import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Download,
  Dumbbell,
  Eye,
  Image as ImageIcon,
  Layers,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  AdminDashboardStats,
  AppointmentItem,
  AppointmentStatus,
  BusinessSettings,
  EnquiryItem,
  GalleryCategory,
  GalleryImageItem,
  MembershipPlanItem,
  ServiceItem,
  TrainerAvailabilitySlot,
  TrainerItem,
} from '../types';
import { api, formatDateReadable, formatINR, formatIstTodayStr, formatTime12h } from '../lib/api';
import { ResilientImage } from '../components/ResilientImage';

interface AdminPageProps {
  onRefreshSiteData: () => void;
}

type AdminTab =
  | 'overview'
  | 'bookings'
  | 'services'
  | 'trainers'
  | 'memberships'
  | 'gallery'
  | 'enquiries'
  | 'settings';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GALLERY_CATEGORIES: GalleryCategory[] = [
  'Gym Interior',
  'Equipment',
  'Training',
  'Workout Environment',
  'Fitness Activities',
];

export function AdminPage({ onRefreshSiteData }: AdminPageProps) {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const [authStatus, setAuthStatus] = useState<{
    configured: boolean;
    hasEnvPasscode: boolean;
    hasClaimedAdmin: boolean;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Login / Setup fields
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [upcoming, setUpcoming] = useState<AppointmentItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerItem[]>([]);
  const [plans, setPlans] = useState<MembershipPlanItem[]>([]);
  const [gallery, setGallery] = useState<GalleryImageItem[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Booking Filters & Modals
  const [bkSearch, setBkSearch] = useState('');
  const [bkDate, setBkDate] = useState('');
  const [bkServiceId, setBkServiceId] = useState('');
  const [bkStatus, setBkStatus] = useState('');
  const [viewingBooking, setViewingBooking] = useState<AppointmentItem | null>(null);
  const [editingBooking, setEditingBooking] = useState<AppointmentItem | null>(null);
  const [editDraft, setEditDraft] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    service_id: 0,
    trainer_id: 'any',
    appointment_date: formatIstTodayStr(),
    start_time: '06:30',
    status: 'Confirmed' as AppointmentStatus,
    notes: '',
  });
  const [editAvailableSlots, setEditAvailableSlots] = useState<string[]>([]);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBookingDraft, setNewBookingDraft] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    service_id: 0,
    trainer_id: 'any',
    appointment_date: formatIstTodayStr(),
    start_time: '06:30',
    status: 'Confirmed' as AppointmentStatus,
    notes: '',
  });
  const [confirmBookingAction, setConfirmBookingAction] = useState<{
    type: 'cancel' | 'delete';
    booking: AppointmentItem;
  } | null>(null);
  const [savingBooking, setSavingBooking] = useState(false);
  const [refreshingBookings, setRefreshingBookings] = useState(false);

  // New Service Form
  const [showNewService, setShowNewService] = useState(false);
  const [srvForm, setSrvForm] = useState({
    name: '',
    category: 'Strength & Conditioning',
    description: '',
    duration_minutes: '60',
    price: '',
    image_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
  });
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Trainer Edit / New
  const [showNewTrainer, setShowNewTrainer] = useState(false);
  const [trnForm, setTrnForm] = useState({
    name: '',
    specialization: '',
    experience: '',
    qualifications: '',
    bio: '',
    photo_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
  });
  const [editingTrainer, setEditingTrainer] = useState<TrainerItem | null>(null);
  const [availTrainer, setAvailTrainer] = useState<TrainerItem | null>(null);
  const [availDraft, setAvailDraft] = useState<TrainerAvailabilitySlot[]>([]);

  // Membership Plan Edit / New
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    duration_label: '',
    price: '',
    description: '',
    benefitsText: '',
  });
  const [editingPlan, setEditingPlan] = useState<MembershipPlanItem | null>(null);
  const [editingBenefitsText, setEditingBenefitsText] = useState('');

  // Gallery Upload Form
  const [galTitle, setGalTitle] = useState('');
  const [galCategory, setGalCategory] = useState<GalleryCategory>('Gym Interior');
  const [galCaption, setGalCaption] = useState('');
  const [galDataUri, setGalDataUri] = useState('');
  const [galUrl, setGalUrl] = useState('');

  // Holiday Draft
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    api
      .getAdminAuthStatus()
      .then((s) => setAuthStatus(s))
      .catch(() => setAuthError('Unable to check admin status.'))
      .finally(() => setAuthLoading(false));
  }, []);

  const loadAllAdminData = useCallback(
    async (authToken: string) => {
      try {
        const [dash, appts, srvs, trns, mPlans, gal, enq, sett] = await Promise.all([
          api.getAdminDashboard(authToken),
          api.getAdminAppointments(authToken, {
            search: bkSearch,
            date: bkDate,
            serviceId: bkServiceId,
            status: bkStatus,
          }),
          api.getAdminServices(authToken),
          api.getAdminTrainers(authToken),
          api.getAdminMemberships(authToken),
          api.getAdminGallery(authToken),
          api.getAdminEnquiries(authToken),
          api.getAdminSettings(authToken),
        ]);
        setStats(dash.stats);
        setUpcoming(dash.upcomingSessions);
        setAppointments(appts);
        setServices(srvs);
        setTrainers(trns);
        setPlans(mPlans);
        setGallery(gal);
        setEnquiries(enq);
        setSettings(sett);
      } catch (err) {
        showNotice('err', err instanceof Error ? err.message : 'Failed to load admin data.');
      }
    },
    [bkSearch, bkDate, bkServiceId, bkStatus]
  );

  useEffect(() => {
    if (token) {
      loadAllAdminData(token);
    }
  }, [token, loadAllAdminData]);

  const handleSetupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await api.setupAdmin({
        email: authEmail.trim(),
        name: authName.trim(),
        password: authPassword,
      });
      setToken(res.token);
      setAdminUser(res.admin);
      setAuthPassword('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Setup failed.');
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await api.loginAdmin({
        email: authEmail.trim(),
        password: authPassword,
      });
      setToken(res.token);
      setAdminUser(res.admin);
      setAuthPassword('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid credentials.');
    }
  };

  useEffect(() => {
    if (!editingBooking || !editDraft.appointment_date || !editDraft.service_id) {
      setEditAvailableSlots([]);
      return;
    }
    const trainerNum = editDraft.trainer_id === 'any' ? null : Number(editDraft.trainer_id);
    api
      .getAvailability(editDraft.appointment_date, editDraft.service_id, trainerNum)
      .then((res) => {
        if (res.closed) {
          setEditAvailableSlots([]);
        } else {
          setEditAvailableSlots(res.slots.map((s) => s.time));
        }
      })
      .catch(() => setEditAvailableSlots([]));
  }, [editingBooking, editDraft.appointment_date, editDraft.service_id, editDraft.trainer_id]);

  const openEditBooking = (appt: AppointmentItem) => {
    setViewingBooking(null);
    setEditingBooking(appt);
    setEditDraft({
      customer_name: appt.customer_name,
      customer_phone: appt.customer_phone,
      customer_email: appt.customer_email,
      service_id: appt.service_id,
      trainer_id: appt.trainer_id === null ? 'any' : String(appt.trainer_id),
      appointment_date: appt.appointment_date,
      start_time: appt.start_time,
      status: appt.status,
      notes: appt.notes || '',
    });
  };

  const openNewBookingModal = () => {
    const defaultServiceId = services.find((s) => s.is_enabled)?.id || services[0]?.id || 1;
    setNewBookingDraft({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      service_id: defaultServiceId,
      trainer_id: 'any',
      appointment_date: formatIstTodayStr(),
      start_time: '06:30',
      status: 'Confirmed',
      notes: '',
    });
    setShowNewBooking(true);
  };

  const handleRefreshBookings = async () => {
    if (!token) return;
    setRefreshingBookings(true);
    try {
      await loadAllAdminData(token);
      showNotice('ok', 'Booking records refreshed.');
    } finally {
      setRefreshingBookings(false);
    }
  };

  const handleAppointmentStatus = async (id: number, status: AppointmentStatus) => {
    if (!token) return;
    setSavingBooking(true);
    try {
      const updated = await api.updateAdminAppointment(token, id, { status });
      if (viewingBooking && viewingBooking.id === id) {
        setViewingBooking(updated);
      }
      showNotice('ok', `Appointment marked as ${status}.`);
      loadAllAdminData(token);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSavingBooking(false);
    }
  };

  const handleSaveBookingEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editingBooking) return;
    setSavingBooking(true);
    try {
      const updated = await api.updateAdminAppointment(token, editingBooking.id, {
        customer_name: editDraft.customer_name.trim(),
        customer_phone: editDraft.customer_phone.trim(),
        customer_email: editDraft.customer_email.trim(),
        service_id: editDraft.service_id,
        trainer_id: editDraft.trainer_id === 'any' ? null : Number(editDraft.trainer_id),
        appointment_date: editDraft.appointment_date,
        start_time: editDraft.start_time,
        status: editDraft.status,
        notes: editDraft.notes.trim(),
      });
      setEditingBooking(null);
      if (viewingBooking && viewingBooking.id === updated.id) {
        setViewingBooking(updated);
      }
      showNotice('ok', `Appointment ${updated.booking_ref} updated.`);
      loadAllAdminData(token);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Failed to update appointment.');
    } finally {
      setSavingBooking(false);
    }
  };

  const handleCreateAdminBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingBooking(true);
    try {
      const created = await api.createAdminAppointment(token, {
        customer_name: newBookingDraft.customer_name.trim(),
        customer_phone: newBookingDraft.customer_phone.trim(),
        customer_email: newBookingDraft.customer_email.trim(),
        service_id: newBookingDraft.service_id,
        trainer_id: newBookingDraft.trainer_id === 'any' ? null : Number(newBookingDraft.trainer_id),
        appointment_date: newBookingDraft.appointment_date,
        start_time: newBookingDraft.start_time,
        status: newBookingDraft.status,
        notes: newBookingDraft.notes.trim(),
      });
      setShowNewBooking(false);
      showNotice('ok', `Appointment ${created.booking_ref} created.`);
      loadAllAdminData(token);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Failed to create appointment.');
    } finally {
      setSavingBooking(false);
    }
  };

  const handleExecuteConfirmAction = async () => {
    if (!token || !confirmBookingAction) return;
    const { type, booking } = confirmBookingAction;
    setSavingBooking(true);
    try {
      if (type === 'cancel') {
        const updated = await api.updateAdminAppointment(token, booking.id, { status: 'Cancelled' });
        if (viewingBooking && viewingBooking.id === booking.id) {
          setViewingBooking(updated);
        }
        showNotice('ok', `Booking ${booking.booking_ref} has been cancelled.`);
      } else {
        await api.deleteAdminAppointment(token, booking.id);
        if (viewingBooking && viewingBooking.id === booking.id) {
          setViewingBooking(null);
        }
        showNotice('ok', `Booking ${booking.booking_ref} deleted.`);
      }
      setConfirmBookingAction(null);
      loadAllAdminData(token);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSavingBooking(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Booking Ref',
      'Status',
      'Customer Name',
      'Phone',
      'Email',
      'Service',
      'Trainer',
      'Date',
      'Start Time',
      'End Time',
      'Duration (min)',
      'Notes',
      'Created At',
    ];
    const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = appointments.map((a) =>
      [
        a.booking_ref,
        a.status,
        a.customer_name,
        a.customer_phone,
        a.customer_email,
        a.service_name || '',
        a.trainer_name || 'Any Available Coach',
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.duration_minutes,
        a.notes || '',
        a.created_at,
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `play-on-fitness-bookings-${formatIstTodayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.4 * 1024 * 1024) {
      showNotice('err', 'Please choose an image smaller than 2.4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGalDataUri(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-sm text-zinc-400">
        Verifying admin portal status...
      </div>
    );
  }

  // Unauthenticated View (First-run Claim OR Login)
  if (!token) {
    const isFirstRunSetup = authStatus && !authStatus.configured;
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-[#12141A] border border-white/15 p-8">
          <div className="flex items-center gap-2 text-[#FF7833] text-xs font-medium uppercase tracking-widest mb-2">
            <Shield className="w-4 h-4" />
            Owner Portal
          </div>
          <h1 className="font-display text-3xl font-bold text-white">
            {isFirstRunSetup ? 'Claim Owner Admin Account' : 'Admin Dashboard Sign In'}
          </h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            {isFirstRunSetup
              ? 'First-time setup: create the owner credentials for Play on Fitness JP Nagar. Once claimed, this setup locks permanently.'
              : 'Sign in to manage bookings, services, trainers, memberships, gallery photos, and business hours.'}
          </p>

          {authError && (
            <div className="mt-4 p-3 text-xs text-red-200 bg-red-950/60 border border-red-500/40">
              {authError}
            </div>
          )}

          {isFirstRunSetup ? (
            <form onSubmit={handleSetupSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="adm-name" className="block text-xs text-zinc-300 mb-1.5">
                  Owner Name *
                </label>
                <input
                  id="adm-name"
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <div>
                <label htmlFor="adm-email" className="block text-xs text-zinc-300 mb-1.5">
                  Owner Email *
                </label>
                <input
                  id="adm-email"
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <div>
                <label htmlFor="adm-pass" className="block text-xs text-zinc-300 mb-1.5">
                  Password (min 8 chars) *
                </label>
                <input
                  id="adm-pass"
                  type="password"
                  required
                  minLength={8}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                Create Owner Account &amp; Enter
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs text-zinc-300 mb-1.5">
                  Admin Email {authStatus?.hasEnvPasscode ? '(Optional if using Passcode)' : '*'}
                </label>
                <input
                  id="login-email"
                  type="email"
                  required={!authStatus?.hasEnvPasscode}
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <div>
                <label htmlFor="login-pass" className="block text-xs text-zinc-300 mb-1.5">
                  Password / Passcode *
                </label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                Sign In to Admin Dashboard
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const navTabs: Array<{ id: AdminTab; label: string; icon: typeof Calendar }> = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'services', label: 'Services', icon: Dumbbell },
    { id: 'trainers', label: 'Trainers', icon: Users },
    { id: 'memberships', label: 'Memberships', icon: Clock },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'enquiries', label: 'Enquiries', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0D0E12] border-b lg:border-b-0 lg:border-r border-white/10 shrink-0">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-[#FF7833]">ADMIN CONSOLE</p>
            <p className="text-sm font-semibold text-white truncate max-w-[180px]">
              {adminUser?.name || 'Owner'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setToken(null);
              setAdminUser(null);
            }}
            title="Sign Out"
            aria-label="Sign Out"
            className="p-2 text-zinc-400 hover:text-white border border-white/10 rounded-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badgeCount =
              tab.id === 'bookings'
                ? stats?.totalBookings
                : tab.id === 'enquiries' && stats?.newEnquiriesCount
                  ? stats.newEnquiriesCount
                  : undefined;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#FF5A1F] text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {tab.label}
                </span>
                {badgeCount !== undefined && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-zinc-950' : 'text-zinc-400'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8 overflow-x-hidden">
        {notice && (
          <div
            className={`mb-6 px-4 py-3 text-xs border flex items-center justify-between ${
              notice.type === 'ok'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/60 border-red-500/40 text-red-200'
            }`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-display text-3xl font-bold text-white">Dashboard Overview</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                >
                  Manage All Bookings
                </button>
                <button
                  type="button"
                  onClick={handleRefreshBookings}
                  disabled={refreshingBookings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-200 border border-white/15 hover:border-white/30 rounded-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingBookings ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Bookings', value: stats?.totalBookings ?? 0, filterStatus: '' },
                { label: 'Pending', value: stats?.pendingBookings ?? 0, filterStatus: 'Pending' },
                { label: 'Confirmed', value: stats?.confirmedBookings ?? 0, filterStatus: 'Confirmed' },
                { label: 'Cancelled', value: stats?.cancelledBookings ?? 0, filterStatus: 'Cancelled' },
                { label: 'Upcoming', value: stats?.upcomingSessionsCount ?? 0, filterStatus: '' },
                { label: 'New Enquiries', value: stats?.newEnquiriesCount ?? 0, filterStatus: null },
              ].map((kpi) => (
                <button
                  key={kpi.label}
                  type="button"
                  onClick={() => {
                    if (kpi.filterStatus === null) {
                      setActiveTab('enquiries');
                    } else {
                      setBkStatus(kpi.filterStatus);
                      setActiveTab('bookings');
                    }
                  }}
                  className="bg-[#12141A] border border-white/10 hover:border-white/25 p-4 text-left transition-colors cursor-pointer"
                >
                  <p className="text-xs text-zinc-400">{kpi.label}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                    {kpi.value}
                  </p>
                </button>
              ))}
            </div>

            <div className="bg-[#12141A] border border-white/10">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-white">Upcoming Sessions</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs text-[#FF7833] hover:text-[#FF945C] cursor-pointer"
                >
                  View All Bookings
                </button>
              </div>
              {upcoming.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-400">
                  No upcoming active sessions scheduled.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-zinc-400 font-mono">
                      <tr>
                        <th className="py-3 px-4">Ref</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Date &amp; Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {upcoming.map((row) => (
                        <tr key={row.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-mono text-zinc-200 tabular-nums">
                            <button
                              type="button"
                              onClick={() => setViewingBooking(row)}
                              className="hover:text-[#FF7833] cursor-pointer"
                            >
                              {row.booking_ref}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-white font-medium block">{row.customer_name}</span>
                            <span className="text-zinc-500">{row.customer_phone}</span>
                          </td>
                          <td className="py-3 px-4 text-zinc-300">{row.service_name}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-zinc-300">
                            {row.appointment_date} · {formatTime12h(row.start_time)}
                          </td>
                          <td className="py-3 px-4 text-zinc-200">{row.status}</td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewingBooking(row)}
                              className="px-2.5 py-1 bg-white/5 text-zinc-200 border border-white/15 hover:bg-white/10 cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditBooking(row)}
                              className="px-2.5 py-1 bg-white/5 text-zinc-200 border border-white/15 hover:bg-white/10 cursor-pointer"
                            >
                              Edit
                            </button>
                            {row.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleAppointmentStatus(row.id, 'Confirmed')}
                                className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAppointmentStatus(row.id, 'Completed')}
                              className="px-2.5 py-1 bg-white/5 text-zinc-200 border border-white/15 hover:bg-white/10 cursor-pointer"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmBookingAction({ type: 'cancel', booking: row })}
                              className="px-2.5 py-1 bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-white">Booking Management</h1>
                <p className="mt-1 text-xs text-zinc-400">
                  Showing <span className="font-mono text-zinc-200 tabular-nums">{appointments.length}</span>{' '}
                  appointment record{appointments.length === 1 ? '' : 's'} from your database.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshBookings}
                  disabled={refreshingBookings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-200 border border-white/15 hover:border-white/30 rounded-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingBookings ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={appointments.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-200 border border-white/15 hover:border-white/30 rounded-sm cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={openNewBookingModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Booking
                </button>
              </div>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { label: 'All', value: '', count: stats?.totalBookings },
                  { label: 'Pending', value: 'Pending', count: stats?.pendingBookings },
                  { label: 'Confirmed', value: 'Confirmed', count: stats?.confirmedBookings },
                  { label: 'Completed', value: 'Completed', count: stats?.completedBookings },
                  { label: 'Cancelled', value: 'Cancelled', count: stats?.cancelledBookings },
                ] as const
              ).map((item) => {
                const active = bkStatus === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setBkStatus(item.value)}
                    className={`px-3.5 py-1.5 text-xs font-medium border rounded-sm transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#FF5A1F] text-zinc-950 border-[#FF5A1F] font-semibold'
                        : 'bg-[#12141A] text-zinc-300 border-white/10 hover:border-white/25'
                    }`}
                  >
                    {item.label}
                    {item.count !== undefined && (
                      <span className="ml-1.5 font-mono tabular-nums opacity-80">({item.count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search & Filters */}
            <div className="bg-[#12141A] border border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <input
                type="search"
                value={bkSearch}
                onChange={(e) => setBkSearch(e.target.value)}
                placeholder="Search ref, name, email, phone, notes..."
                className="lg:col-span-2 px-3.5 py-2 text-xs bg-[#09090B] border border-white/15 text-white rounded-sm"
              />
              <input
                type="date"
                value={bkDate}
                onChange={(e) => setBkDate(e.target.value)}
                className="px-3.5 py-2 text-xs bg-[#09090B] border border-white/15 text-white rounded-sm"
              />
              <select
                value={bkServiceId}
                onChange={(e) => setBkServiceId(e.target.value)}
                className="px-3.5 py-2 text-xs bg-[#09090B] border border-white/15 text-white rounded-sm"
              >
                <option value="">All Services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={bkStatus}
                onChange={(e) => setBkStatus(e.target.value)}
                className="px-3.5 py-2 text-xs bg-[#09090B] border border-white/15 text-white rounded-sm"
              >
                <option value="">All Statuses</option>
                {(['Pending', 'Confirmed', 'Cancelled', 'Completed'] as AppointmentStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setBkSearch('');
                  setBkDate('');
                  setBkServiceId('');
                  setBkStatus('');
                }}
                className="px-3.5 py-2 text-xs text-zinc-300 border border-white/15 hover:bg-white/5 rounded-sm cursor-pointer"
              >
                Clear Filters
              </button>
            </div>

            <div className="bg-[#12141A] border border-white/10 overflow-x-auto">
              {appointments.length === 0 ? (
                <div className="p-10 text-center text-sm text-zinc-400">
                  No appointments match the current filters.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-zinc-400 font-mono">
                    <tr>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Service &amp; Coach</th>
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {appointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-mono tabular-nums text-white">
                          <button
                            type="button"
                            onClick={() => setViewingBooking(appt)}
                            className="hover:text-[#FF7833] text-left cursor-pointer"
                          >
                            {appt.booking_ref}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-white font-medium">{appt.customer_name}</div>
                          <div className="text-zinc-400 font-mono tabular-nums">{appt.customer_phone}</div>
                          <div className="text-zinc-500">{appt.customer_email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-zinc-200">{appt.service_name}</div>
                          <div className="text-zinc-500">{appt.trainer_name || 'Any Available Coach'}</div>
                          {appt.notes && (
                            <div className="mt-1 text-[11px] text-zinc-400 truncate max-w-[220px]" title={appt.notes}>
                              Note: {appt.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-zinc-200">
                          <div>{formatDateReadable(appt.appointment_date)}</div>
                          <div className="text-zinc-400">
                            {formatTime12h(appt.start_time)} – {formatTime12h(appt.end_time)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 text-[11px] font-medium border ${
                              appt.status === 'Confirmed'
                                ? 'text-emerald-300 border-emerald-500/40'
                                : appt.status === 'Cancelled'
                                  ? 'text-red-300 border-red-500/40'
                                  : appt.status === 'Completed'
                                    ? 'text-sky-300 border-sky-500/40'
                                    : 'text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingBooking(appt)}
                              title="View details"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/15 rounded-sm cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditBooking(appt)}
                              title="Edit appointment"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/15 rounded-sm cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            {appt.status === 'Pending' && (
                              <button
                                type="button"
                                disabled={savingBooking}
                                onClick={() => handleAppointmentStatus(appt.id, 'Confirmed')}
                                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-sm cursor-pointer disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            )}
                            {(appt.status === 'Pending' || appt.status === 'Confirmed') && (
                              <button
                                type="button"
                                disabled={savingBooking}
                                onClick={() => setConfirmBookingAction({ type: 'cancel', booking: appt })}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-sm cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={savingBooking}
                              onClick={() => setConfirmBookingAction({ type: 'delete', booking: appt })}
                              aria-label={`Delete booking ${appt.booking_ref}`}
                              title="Delete booking record"
                              className="p-1.5 text-zinc-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 rounded-sm cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* VIEW APPOINTMENT DETAILS MODAL */}
        {viewingBooking && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-[#12141A] border border-white/15 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-mono text-[#FF7833]">{viewingBooking.booking_ref}</p>
                  <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                    {viewingBooking.customer_name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingBooking(null)}
                  aria-label="Close booking details"
                  className="p-1.5 text-zinc-400 hover:text-white border border-white/15 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#09090B] border border-white/10 p-3.5">
                  <p className="text-zinc-500 uppercase tracking-wider text-[11px]">Status</p>
                  <p className="mt-1 text-sm font-semibold text-white">{viewingBooking.status}</p>
                </div>
                <div className="bg-[#09090B] border border-white/10 p-3.5">
                  <p className="text-zinc-500 uppercase tracking-wider text-[11px]">Service &amp; Duration</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {viewingBooking.service_name} ({viewingBooking.duration_minutes} min)
                  </p>
                </div>
                <div className="bg-[#09090B] border border-white/10 p-3.5">
                  <p className="text-zinc-500 uppercase tracking-wider text-[11px]">Date &amp; Time</p>
                  <p className="mt-1 font-mono tabular-nums text-white">
                    {formatDateReadable(viewingBooking.appointment_date)}
                  </p>
                  <p className="font-mono tabular-nums text-zinc-400 mt-0.5">
                    {formatTime12h(viewingBooking.start_time)} – {formatTime12h(viewingBooking.end_time)}
                  </p>
                </div>
                <div className="bg-[#09090B] border border-white/10 p-3.5">
                  <p className="text-zinc-500 uppercase tracking-wider text-[11px]">Assigned Coach</p>
                  <p className="mt-1 text-sm text-white">
                    {viewingBooking.trainer_name || 'Any Available Coach'}
                  </p>
                </div>
                <div className="bg-[#09090B] border border-white/10 p-3.5">
                  <p className="text-zinc-500 uppercase tracking-wider text-[11px]">Phone</p>
                  <a
                    href={`tel:${viewingBooking.customer_phone}`}
                    className="mt-1 inline-block font-mono text-zinc-200 hover:text-[#FF7833]"
                  >
                    {viewingBooking.customer_phone}
                  </a>
                </div>
                <div className="bg-[#09090B] border border-white/10 p-3.5">
                  <p className="text-zinc-500 uppercase tracking-wider text-[11px]">Email</p>
                  <a
                    href={`mailto:${viewingBooking.customer_email}`}
                    className="mt-1 inline-block text-zinc-200 hover:text-[#FF7833] break-all"
                  >
                    {viewingBooking.customer_email}
                  </a>
                </div>
              </div>

              <div className="bg-[#09090B] border border-white/10 p-3.5 text-xs">
                <p className="text-zinc-500 uppercase tracking-wider text-[11px]">Customer Notes</p>
                <p className="mt-1 text-zinc-200 whitespace-pre-wrap">
                  {viewingBooking.notes || 'No notes added.'}
                </p>
              </div>

              {viewingBooking.reschedule_requested_date && (
                <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 text-xs text-amber-200">
                  Reschedule recorded for {viewingBooking.reschedule_requested_date} at{' '}
                  {viewingBooking.reschedule_requested_time
                    ? formatTime12h(viewingBooking.reschedule_requested_time)
                    : ''}
                  .
                </div>
              )}

              <div className="text-[11px] font-mono text-zinc-500 flex flex-wrap justify-between gap-2">
                <span>Created: {viewingBooking.created_at}</span>
                <span>Updated: {viewingBooking.updated_at}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditBooking(viewingBooking)}
                    className="px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] cursor-pointer"
                  >
                    Edit Appointment
                  </button>
                  {viewingBooking.status === 'Pending' && (
                    <button
                      type="button"
                      disabled={savingBooking}
                      onClick={() => handleAppointmentStatus(viewingBooking.id, 'Confirmed')}
                      className="px-3.5 py-2 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
                    >
                      Confirm
                    </button>
                  )}
                  {(viewingBooking.status === 'Pending' || viewingBooking.status === 'Confirmed') && (
                    <>
                      <button
                        type="button"
                        disabled={savingBooking}
                        onClick={() => handleAppointmentStatus(viewingBooking.id, 'Completed')}
                        className="px-3.5 py-2 text-xs text-zinc-200 border border-white/15 hover:bg-white/10 cursor-pointer"
                      >
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        disabled={savingBooking}
                        onClick={() =>
                          setConfirmBookingAction({ type: 'cancel', booking: viewingBooking })
                        }
                        className="px-3.5 py-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 cursor-pointer"
                      >
                        Cancel Booking
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingBooking(null)}
                  className="px-4 py-2 text-xs text-zinc-300 border border-white/15 hover:bg-white/5 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULL EDIT APPOINTMENT MODAL */}
        {editingBooking && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveBookingEdit}
              className="w-full max-w-2xl bg-[#12141A] border border-white/15 p-6 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs font-mono text-[#FF7833]">{editingBooking.booking_ref}</p>
                  <h2 className="font-display text-2xl font-bold text-white">Edit Appointment</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="p-1.5 text-zinc-400 hover:text-white border border-white/15 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={editDraft.customer_name}
                    onChange={(e) => setEditDraft({ ...editDraft, customer_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editDraft.customer_phone}
                    onChange={(e) => setEditDraft({ ...editDraft, customer_phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editDraft.customer_email}
                    onChange={(e) => setEditDraft({ ...editDraft, customer_email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Service *</label>
                  <select
                    value={editDraft.service_id}
                    onChange={(e) => setEditDraft({ ...editDraft, service_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes}m)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Assigned Coach</label>
                  <select
                    value={editDraft.trainer_id}
                    onChange={(e) => setEditDraft({ ...editDraft, trainer_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  >
                    <option value="any">Any Available Coach</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Status *</label>
                  <select
                    value={editDraft.status}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, status: e.target.value as AppointmentStatus })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  >
                    {(['Pending', 'Confirmed', 'Completed', 'Cancelled'] as AppointmentStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={editDraft.appointment_date}
                    onChange={(e) => setEditDraft({ ...editDraft, appointment_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Start Time (24h HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={editDraft.start_time}
                    onChange={(e) => setEditDraft({ ...editDraft, start_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
              </div>

              {editAvailableSlots.length > 0 && (
                <div>
                  <p className="text-[11px] text-zinc-400 mb-1.5">Quick-pick open slot for selected date:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {editAvailableSlots.map((slotTime) => (
                      <button
                        key={slotTime}
                        type="button"
                        onClick={() => setEditDraft({ ...editDraft, start_time: slotTime })}
                        className={`px-2.5 py-1 text-[11px] font-mono border cursor-pointer ${
                          editDraft.start_time === slotTime
                            ? 'bg-[#FF5A1F] text-zinc-950 border-[#FF5A1F] font-semibold'
                            : 'bg-[#09090B] text-zinc-300 border-white/15 hover:border-white/30'
                        }`}
                      >
                        {formatTime12h(slotTime)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editDraft.notes}
                  onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingBooking}
                  className="px-5 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] cursor-pointer disabled:opacity-50"
                >
                  {savingBooking ? 'Saving...' : 'Save Appointment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CREATE NEW APPOINTMENT MODAL */}
        {showNewBooking && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateAdminBooking}
              className="w-full max-w-2xl bg-[#12141A] border border-white/15 p-6 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-2xl font-bold text-white">Create New Booking</h2>
                <button
                  type="button"
                  onClick={() => setShowNewBooking(false)}
                  className="p-1.5 text-zinc-400 hover:text-white border border-white/15 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={newBookingDraft.customer_name}
                    onChange={(e) =>
                      setNewBookingDraft({ ...newBookingDraft, customer_name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newBookingDraft.customer_phone}
                    onChange={(e) =>
                      setNewBookingDraft({ ...newBookingDraft, customer_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newBookingDraft.customer_email}
                    onChange={(e) =>
                      setNewBookingDraft({ ...newBookingDraft, customer_email: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Service *</label>
                  <select
                    value={newBookingDraft.service_id}
                    onChange={(e) =>
                      setNewBookingDraft({ ...newBookingDraft, service_id: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes}m)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Coach</label>
                  <select
                    value={newBookingDraft.trainer_id}
                    onChange={(e) =>
                      setNewBookingDraft({ ...newBookingDraft, trainer_id: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  >
                    <option value="any">Any Available Coach</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Initial Status</label>
                  <select
                    value={newBookingDraft.status}
                    onChange={(e) =>
                      setNewBookingDraft({
                        ...newBookingDraft,
                        status: e.target.value as AppointmentStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  >
                    {(['Confirmed', 'Pending', 'Completed'] as AppointmentStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newBookingDraft.appointment_date}
                    onChange={(e) =>
                      setNewBookingDraft({ ...newBookingDraft, appointment_date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Start Time (24h HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={newBookingDraft.start_time}
                    onChange={(e) =>
                      setNewBookingDraft({ ...newBookingDraft, start_time: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newBookingDraft.notes}
                  onChange={(e) => setNewBookingDraft({ ...newBookingDraft, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewBooking(false)}
                  className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingBooking}
                  className="px-5 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] cursor-pointer disabled:opacity-50"
                >
                  {savingBooking ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CONFIRM CANCEL / DELETE MODAL */}
        {confirmBookingAction && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#12141A] border border-white/15 p-6 space-y-4">
              <h2 className="font-display text-2xl font-bold text-white">
                {confirmBookingAction.type === 'cancel'
                  ? 'Cancel Appointment?'
                  : 'Delete Booking Record?'}
              </h2>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {confirmBookingAction.type === 'cancel'
                  ? `This will mark booking ${confirmBookingAction.booking.booking_ref} for ${confirmBookingAction.booking.customer_name} as Cancelled and free up the time slot.`
                  : `This will permanently delete booking ${confirmBookingAction.booking.booking_ref} for ${confirmBookingAction.booking.customer_name} from your database.`}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmBookingAction(null)}
                  className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={savingBooking}
                  onClick={handleExecuteConfirmAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 cursor-pointer disabled:opacity-50"
                >
                  {savingBooking
                    ? 'Processing...'
                    : confirmBookingAction.type === 'cancel'
                      ? 'Confirm Cancel'
                      : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-display text-3xl font-bold text-white">Service Management</h1>
              <button
                type="button"
                onClick={() => setShowNewService((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>

            {showNewService && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createAdminService(token, {
                      name: srvForm.name,
                      category: srvForm.category,
                      description: srvForm.description,
                      duration_minutes: Number(srvForm.duration_minutes) || 60,
                      price: srvForm.price ? Number(srvForm.price) : null,
                      image_url: srvForm.image_url,
                      is_enabled: 1,
                    });
                    setShowNewService(false);
                    setSrvForm({
                      name: '',
                      category: 'Strength & Conditioning',
                      description: '',
                      duration_minutes: '60',
                      price: '',
                      image_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
                    });
                    showNotice('ok', 'Service created.');
                    loadAllAdminData(token);
                    onRefreshSiteData();
                  } catch (err) {
                    showNotice('err', err instanceof Error ? err.message : 'Failed to add service.');
                  }
                }}
                className="bg-[#12141A] border border-white/15 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <input
                  type="text"
                  required
                  placeholder="Service Name *"
                  value={srvForm.name}
                  onChange={(e) => setSrvForm({ ...srvForm, name: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={srvForm.category}
                  onChange={(e) => setSrvForm({ ...srvForm, category: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="number"
                  min={15}
                  placeholder="Duration (minutes)"
                  value={srvForm.duration_minutes}
                  onChange={(e) => setSrvForm({ ...srvForm, duration_minutes: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Price in INR (leave blank for Enquiry)"
                  value={srvForm.price}
                  onChange={(e) => setSrvForm({ ...srvForm, price: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <textarea
                  rows={2}
                  placeholder="Short description"
                  value={srvForm.description}
                  onChange={(e) => setSrvForm({ ...srvForm, description: e.target.value })}
                  className="sm:col-span-2 px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewService(false)}
                    className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] cursor-pointer"
                  >
                    Create Service
                  </button>
                </div>
              </form>
            )}

            <div className="bg-[#12141A] border border-white/10 divide-y divide-white/10">
              {services.map((srv) => (
                <div key={srv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{srv.category}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{srv.duration_minutes} min</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-zinc-200">{formatINR(srv.price)}</span>
                      <span>·</span>
                      <span className={srv.is_enabled ? 'text-emerald-400' : 'text-zinc-500'}>
                        {srv.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-white mt-1">{srv.name}</h2>
                    <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{srv.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await api.updateAdminService(token, srv.id, { is_enabled: srv.is_enabled ? 0 : 1 });
                        loadAllAdminData(token);
                        onRefreshSiteData();
                      }}
                      className="px-3 py-1.5 text-xs border border-white/15 text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      {srv.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingService(srv)}
                      className="px-3 py-1.5 text-xs border border-white/15 text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteAdminService(token, srv.id);
                        showNotice('ok', 'Service removed or disabled.');
                        loadAllAdminData(token);
                        onRefreshSiteData();
                      }}
                      aria-label={`Delete ${srv.name}`}
                      className="p-1.5 text-red-400 border border-red-500/20 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {editingService && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.updateAdminService(token, editingService.id, editingService);
                    setEditingService(null);
                    showNotice('ok', 'Service updated.');
                    loadAllAdminData(token);
                    onRefreshSiteData();
                  }}
                  className="w-full max-w-lg bg-[#12141A] border border-white/15 p-6 space-y-4"
                >
                  <h2 className="font-display text-2xl font-bold text-white">Edit Service</h2>
                  <input
                    type="text"
                    required
                    value={editingService.name}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Duration (mins)</label>
                      <input
                        type="number"
                        min={15}
                        value={editingService.duration_minutes}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            duration_minutes: Number(e.target.value) || 60,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Price (INR, blank=enquiry)</label>
                      <input
                        type="number"
                        min={0}
                        value={editingService.price ?? ''}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            price: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={editingService.description}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TRAINERS TAB */}
        {activeTab === 'trainers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-display text-3xl font-bold text-white">Trainer Management</h1>
              <button
                type="button"
                onClick={() => setShowNewTrainer((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Trainer
              </button>
            </div>

            {showNewTrainer && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await api.createAdminTrainer(token, { ...trnForm, is_placeholder: 0 });
                  setShowNewTrainer(false);
                  setTrnForm({
                    name: '',
                    specialization: '',
                    experience: '',
                    qualifications: '',
                    bio: '',
                    photo_url: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
                  });
                  showNotice('ok', 'Trainer profile added.');
                  loadAllAdminData(token);
                  onRefreshSiteData();
                }}
                className="bg-[#12141A] border border-white/15 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <input
                  type="text"
                  required
                  placeholder="Trainer Name *"
                  value={trnForm.name}
                  onChange={(e) => setTrnForm({ ...trnForm, name: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Specialization *"
                  value={trnForm.specialization}
                  onChange={(e) => setTrnForm({ ...trnForm, specialization: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="text"
                  placeholder="Experience"
                  value={trnForm.experience}
                  onChange={(e) => setTrnForm({ ...trnForm, experience: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="text"
                  placeholder="Qualifications"
                  value={trnForm.qualifications}
                  onChange={(e) => setTrnForm({ ...trnForm, qualifications: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <textarea
                  rows={2}
                  placeholder="Short biography"
                  value={trnForm.bio}
                  onChange={(e) => setTrnForm({ ...trnForm, bio: e.target.value })}
                  className="sm:col-span-2 px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTrainer(false)}
                    className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] cursor-pointer"
                  >
                    Add Trainer
                  </button>
                </div>
              </form>
            )}

            <div className="bg-[#12141A] border border-white/10 divide-y divide-white/10">
              {trainers.map((t) => (
                <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#FF7833]">
                      {t.specialization} · {t.is_active ? 'Active' : 'Inactive'}
                    </div>
                    <h2 className="font-display text-xl font-bold text-white mt-0.5">{t.name}</h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Experience: {t.experience} · Qualifications: {t.qualifications}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAvailTrainer(t);
                        setAvailDraft(t.availability || []);
                      }}
                      className="px-3 py-1.5 text-xs border border-white/15 text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTrainer(t)}
                      className="px-3 py-1.5 text-xs border border-white/15 text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteAdminTrainer(token, t.id);
                        loadAllAdminData(token);
                        onRefreshSiteData();
                      }}
                      aria-label={`Delete ${t.name}`}
                      className="p-1.5 text-red-400 border border-red-500/20 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {editingTrainer && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.updateAdminTrainer(token, editingTrainer.id, {
                      ...editingTrainer,
                      is_placeholder: 0,
                    });
                    setEditingTrainer(null);
                    showNotice('ok', 'Trainer updated.');
                    loadAllAdminData(token);
                    onRefreshSiteData();
                  }}
                  className="w-full max-w-lg bg-[#12141A] border border-white/15 p-6 space-y-3"
                >
                  <h2 className="font-display text-2xl font-bold text-white">Edit Trainer</h2>
                  <input
                    type="text"
                    required
                    value={editingTrainer.name}
                    onChange={(e) => setEditingTrainer({ ...editingTrainer, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <input
                    type="text"
                    required
                    value={editingTrainer.specialization}
                    onChange={(e) =>
                      setEditingTrainer({ ...editingTrainer, specialization: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <input
                    type="text"
                    value={editingTrainer.experience}
                    onChange={(e) => setEditingTrainer({ ...editingTrainer, experience: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <input
                    type="text"
                    value={editingTrainer.qualifications}
                    onChange={(e) =>
                      setEditingTrainer({ ...editingTrainer, qualifications: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <textarea
                    rows={3}
                    value={editingTrainer.bio}
                    onChange={(e) => setEditingTrainer({ ...editingTrainer, bio: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={Boolean(editingTrainer.is_active)}
                      onChange={(e) =>
                        setEditingTrainer({ ...editingTrainer, is_active: e.target.checked ? 1 : 0 })
                      }
                    />
                    Active for booking
                  </label>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingTrainer(null)}
                      className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] cursor-pointer"
                    >
                      Save Trainer
                    </button>
                  </div>
                </form>
              </div>
            )}

            {availTrainer && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.updateTrainerAvailability(token, availTrainer.id, availDraft);
                    setAvailTrainer(null);
                    showNotice('ok', 'Trainer weekly schedule saved.');
                    loadAllAdminData(token);
                    onRefreshSiteData();
                  }}
                  className="w-full max-w-xl bg-[#12141A] border border-white/15 p-6 space-y-4"
                >
                  <h2 className="font-display text-2xl font-bold text-white">
                    Availability: {availTrainer.name}
                  </h2>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {DAY_NAMES.map((dayName, dow) => {
                      const slot = availDraft.find((d) => d.day_of_week === dow) || {
                        id: dow,
                        trainer_id: availTrainer.id,
                        day_of_week: dow,
                        start_time: '06:00',
                        end_time: '20:00',
                        is_available: 1,
                      };
                      const updateSlot = (patch: Partial<TrainerAvailabilitySlot>) => {
                        setAvailDraft((prev) => {
                          const exists = prev.some((d) => d.day_of_week === dow);
                          if (!exists) return [...prev, { ...slot, ...patch }];
                          return prev.map((d) => (d.day_of_week === dow ? { ...d, ...patch } : d));
                        });
                      };
                      return (
                        <div
                          key={dow}
                          className="grid grid-cols-12 gap-2 items-center bg-[#09090B] p-2.5 border border-white/10 text-xs"
                        >
                          <label className="col-span-4 flex items-center gap-2 text-white">
                            <input
                              type="checkbox"
                              checked={Boolean(slot.is_available)}
                              onChange={(e) => updateSlot({ is_available: e.target.checked ? 1 : 0 })}
                            />
                            {dayName}
                          </label>
                          <input
                            type="time"
                            value={slot.start_time}
                            disabled={!slot.is_available}
                            onChange={(e) => updateSlot({ start_time: e.target.value })}
                            className="col-span-4 px-2 py-1 bg-[#12141A] border border-white/15 text-white"
                          />
                          <input
                            type="time"
                            value={slot.end_time}
                            disabled={!slot.is_available}
                            onChange={(e) => updateSlot({ end_time: e.target.value })}
                            className="col-span-4 px-2 py-1 bg-[#12141A] border border-white/15 text-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAvailTrainer(null)}
                      className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] cursor-pointer"
                    >
                      Save Availability
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* MEMBERSHIPS TAB */}
        {activeTab === 'memberships' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-display text-3xl font-bold text-white">Membership Plans</h1>
              <button
                type="button"
                onClick={() => setShowNewPlan((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Plan
              </button>
            </div>

            {showNewPlan && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await api.createAdminMembership(token, {
                    name: planForm.name,
                    duration_label: planForm.duration_label,
                    price: planForm.price ? Number(planForm.price) : null,
                    description: planForm.description,
                    benefits: planForm.benefitsText
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    is_active: 1,
                  });
                  setShowNewPlan(false);
                  setPlanForm({ name: '', duration_label: '', price: '', description: '', benefitsText: '' });
                  showNotice('ok', 'Membership plan created.');
                  loadAllAdminData(token);
                  onRefreshSiteData();
                }}
                className="bg-[#12141A] border border-white/15 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <input
                  type="text"
                  required
                  placeholder="Plan Name *"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Duration (e.g. 3 Months)"
                  value={planForm.duration_label}
                  onChange={(e) => setPlanForm({ ...planForm, duration_label: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Price INR (optional)"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="sm:col-span-3 px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <textarea
                  rows={3}
                  placeholder="Benefits (one per line)"
                  value={planForm.benefitsText}
                  onChange={(e) => setPlanForm({ ...planForm, benefitsText: e.target.value })}
                  className="sm:col-span-3 px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <div className="sm:col-span-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewPlan(false)}
                    className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] cursor-pointer"
                  >
                    Create Plan
                  </button>
                </div>
              </form>
            )}

            <div className="bg-[#12141A] border border-white/10 divide-y divide-white/10">
              {plans.map((p) => (
                <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-zinc-400 font-mono">
                      {p.duration_label} · {formatINR(p.price, 'Enquire for Rates')} ·{' '}
                      <span className={p.is_active ? 'text-emerald-400' : 'text-zinc-500'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-white mt-0.5">{p.name}</h2>
                    <p className="text-xs text-zinc-400 mt-1">{p.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await api.updateAdminMembership(token, p.id, { is_active: p.is_active ? 0 : 1 });
                        loadAllAdminData(token);
                        onRefreshSiteData();
                      }}
                      className="px-3 py-1.5 text-xs border border-white/15 text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan(p);
                        setEditingBenefitsText(p.benefits.join('\n'));
                      }}
                      className="px-3 py-1.5 text-xs border border-white/15 text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteAdminMembership(token, p.id);
                        loadAllAdminData(token);
                        onRefreshSiteData();
                      }}
                      aria-label={`Delete ${p.name}`}
                      className="p-1.5 text-red-400 border border-red-500/20 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {editingPlan && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.updateAdminMembership(token, editingPlan.id, {
                      ...editingPlan,
                      benefits: editingBenefitsText
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                    setEditingPlan(null);
                    showNotice('ok', 'Membership plan updated.');
                    loadAllAdminData(token);
                    onRefreshSiteData();
                  }}
                  className="w-full max-w-lg bg-[#12141A] border border-white/15 p-6 space-y-3"
                >
                  <h2 className="font-display text-2xl font-bold text-white">Edit Membership Plan</h2>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editingPlan.duration_label}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, duration_label: e.target.value })
                      }
                      className="px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Price INR (blank=Enquire)"
                      value={editingPlan.price ?? ''}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          price: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className="px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Benefits (one per line)</label>
                    <textarea
                      rows={4}
                      value={editingBenefitsText}
                      onChange={(e) => setEditingBenefitsText(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPlan(null)}
                      className="px-4 py-2 text-xs text-zinc-300 border border-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] cursor-pointer"
                    >
                      Save Plan
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            <h1 className="font-display text-3xl font-bold text-white">Gallery Photograph Manager</h1>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.uploadAdminGallery(token, {
                    title: galTitle,
                    category: galCategory,
                    caption: galCaption,
                    image_data: galDataUri || undefined,
                    image_url: !galDataUri ? galUrl : undefined,
                    is_verified_photo: true,
                  });
                  setGalTitle('');
                  setGalCaption('');
                  setGalDataUri('');
                  setGalUrl('');
                  showNotice('ok', 'Verified facility photograph uploaded.');
                  loadAllAdminData(token);
                  onRefreshSiteData();
                } catch (err) {
                  showNotice('err', err instanceof Error ? err.message : 'Upload failed.');
                }
              }}
              className="bg-[#12141A] border border-white/10 p-6 space-y-4"
            >
              <h2 className="font-display text-xl font-bold text-white">
                Upload Verified Business Photograph
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Photograph Title *"
                  value={galTitle}
                  onChange={(e) => setGalTitle(e.target.value)}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                />
                <select
                  value={galCategory}
                  onChange={(e) => setGalCategory(e.target.value as GalleryCategory)}
                  className="px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                >
                  {GALLERY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Upload Image File (JPEG, PNG, WebP, max 2.4MB)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:border file:border-white/15 file:bg-[#09090B] file:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Or Verified Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={galUrl}
                    onChange={(e) => setGalUrl(e.target.value)}
                    disabled={Boolean(galDataUri)}
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Caption (optional)"
                value={galCaption}
                onChange={(e) => setGalCaption(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
              />

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                Add Photograph to Gallery
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((g) => (
                <div key={g.id} className="bg-[#12141A] border border-white/10 overflow-hidden">
                  <div className="aspect-[4/3] border-b border-white/10">
                    <ResilientImage src={g.image_url} alt={g.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-zinc-400">
                        {g.category} · {g.is_verified_photo ? 'Verified Photo' : 'Preview'}
                      </p>
                      <h3 className="text-sm font-semibold text-white mt-0.5">{g.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteAdminGallery(token, g.id);
                        loadAllAdminData(token);
                        onRefreshSiteData();
                      }}
                      aria-label={`Delete ${g.title}`}
                      className="p-1.5 text-red-400 border border-red-500/20 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENQUIRIES TAB */}
        {activeTab === 'enquiries' && (
          <div className="space-y-6">
            <h1 className="font-display text-3xl font-bold text-white">Customer Enquiries</h1>
            <div className="bg-[#12141A] border border-white/10 divide-y divide-white/10">
              {enquiries.length === 0 ? (
                <div className="p-10 text-center text-sm text-zinc-400">No enquiries received yet.</div>
              ) : (
                enquiries.map((enq) => (
                  <div key={enq.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-zinc-400 font-mono">
                        {enq.type.toUpperCase()} {enq.plan_name ? `· ${enq.plan_name}` : ''} ·{' '}
                        <span className={enq.status === 'New' ? 'text-[#FF7833]' : 'text-zinc-500'}>
                          {enq.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-1">
                        {enq.name} · <span className="font-mono text-zinc-300">{enq.phone}</span> ·{' '}
                        <span className="text-zinc-400">{enq.email}</span>
                      </p>
                      <p className="text-xs text-zinc-300 mt-1.5">{enq.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = enq.status === 'New' ? 'Reviewed' : 'New';
                        await api.updateEnquiryStatus(token, enq.id, next);
                        loadAllAdminData(token);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/15 text-zinc-200 hover:bg-white/5 shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark {enq.status === 'New' ? 'Reviewed' : 'New'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            <h1 className="font-display text-3xl font-bold text-white">Business Settings</h1>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await api.updateAdminSettings(token, settings);
                showNotice('ok', 'Business settings updated.');
                loadAllAdminData(token);
                onRefreshSiteData();
              }}
              className="bg-[#12141A] border border-white/10 p-6 space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={settings.business_name}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={settings.category}
                    onChange={(e) => setSettings({ ...settings, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Verified Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 ..."
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">WhatsApp Enquiry Number</label>
                  <input
                    type="tel"
                    placeholder="+91 ..."
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="contact@..."
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Slot Interval (Minutes)</label>
                  <select
                    value={settings.slot_interval_minutes}
                    onChange={(e) =>
                      setSettings({ ...settings, slot_interval_minutes: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Mon–Sat Open</label>
                  <input
                    type="time"
                    value={settings.mon_sat_open}
                    onChange={(e) => setSettings({ ...settings, mon_sat_open: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Mon–Sat Close</label>
                  <input
                    type="time"
                    value={settings.mon_sat_close}
                    onChange={(e) => setSettings({ ...settings, mon_sat_close: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Sunday Open</label>
                  <input
                    type="time"
                    value={settings.sun_open}
                    onChange={(e) => setSettings({ ...settings, sun_open: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Sunday Close</label>
                  <input
                    type="time"
                    value={settings.sun_close}
                    onChange={(e) => setSettings({ ...settings, sun_close: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#09090B] border border-white/15 text-white"
                  />
                </div>
              </div>

              {/* Holidays */}
              <div className="pt-4 border-t border-white/10">
                <h2 className="text-sm font-semibold text-white mb-3">Managed Holidays</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-[#09090B] border border-white/15 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Reason (e.g. Public Holiday)"
                    value={newHolidayReason}
                    onChange={(e) => setNewHolidayReason(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-[#09090B] border border-white/15 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newHolidayDate) return;
                      setSettings({
                        ...settings,
                        holidays: [
                          ...settings.holidays.filter((h) => h.date !== newHolidayDate),
                          { date: newHolidayDate, reason: newHolidayReason || 'Holiday' },
                        ],
                      });
                      setNewHolidayDate('');
                      setNewHolidayReason('');
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-white/10 text-white hover:bg-white/15 cursor-pointer"
                  >
                    Add Holiday
                  </button>
                </div>

                {settings.holidays.length > 0 && (
                  <div className="space-y-1.5">
                    {settings.holidays.map((h) => (
                      <div
                        key={h.date}
                        className="flex items-center justify-between px-3 py-2 bg-[#09090B] border border-white/10 text-xs"
                      >
                        <span className="font-mono text-zinc-200">
                          {h.date} — {h.reason}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              holidays: settings.holidays.filter((item) => item.date !== h.date),
                            })
                          }
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={Boolean(settings.auto_confirm_bookings)}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_confirm_bookings: e.target.checked ? 1 : 0 })
                  }
                />
                Automatically confirm new customer appointments (otherwise saved as Pending)
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                >
                  Save Business Settings
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
