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
  TimeSlotOption,
  TrainerItem,
} from '../types';

export interface BootstrapData {
  settings: BusinessSettings;
  services: ServiceItem[];
  trainers: TrainerItem[];
  plans: MembershipPlanItem[];
  gallery: GalleryImageItem[];
}

export interface AvailabilityResponse {
  closed: boolean;
  closedReason?: string;
  businessHours?: { open: string; close: string };
  slots: TimeSlotOption[];
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// Public API
export const api = {
  getBootstrap: () => requestJson<BootstrapData>('/api/bootstrap'),
  getAvailability: (date: string, serviceId: number, trainerId: number | null) => {
    const qs = new URLSearchParams({
      date,
      serviceId: String(serviceId),
      trainerId: trainerId === null ? 'any' : String(trainerId),
    });
    return requestJson<AvailabilityResponse>(`/api/availability?${qs.toString()}`);
  },
  createAppointment: (payload: {
    service_id: number;
    trainer_id: number | null;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    appointment_date: string;
    start_time: string;
    notes: string;
  }) =>
    requestJson<AppointmentItem>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  lookupAppointment: (booking_ref: string, contact: string) =>
    requestJson<AppointmentItem>('/api/appointments/lookup', {
      method: 'POST',
      body: JSON.stringify({ booking_ref, contact }),
    }),
  cancelAppointment: (booking_ref: string, contact: string) =>
    requestJson<AppointmentItem>('/api/appointments/cancel', {
      method: 'POST',
      body: JSON.stringify({ booking_ref, contact }),
    }),
  rescheduleAppointment: (payload: {
    booking_ref: string;
    contact: string;
    appointment_date: string;
    start_time: string;
  }) =>
    requestJson<AppointmentItem>('/api/appointments/reschedule', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitEnquiry: (payload: {
    type: 'contact' | 'membership';
    plan_name?: string;
    name: string;
    phone: string;
    email: string;
    message: string;
  }) =>
    requestJson<{ id: number; status: string }>('/api/enquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin Auth
  getAdminAuthStatus: () =>
    requestJson<{ configured: boolean; hasEnvPasscode: boolean; hasClaimedAdmin: boolean }>(
      '/api/admin/auth/status'
    ),
  setupAdmin: (payload: { email: string; name: string; password: string }) =>
    requestJson<{ token: string; admin: { id: number; email: string; name: string } }>(
      '/api/admin/auth/setup',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  loginAdmin: (payload: { email: string; password: string }) =>
    requestJson<{ token: string; admin: { id: number; email: string; name: string } }>(
      '/api/admin/auth/login',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  // Admin Protected
  getAdminDashboard: (token: string) =>
    requestJson<{ stats: AdminDashboardStats; upcomingSessions: AppointmentItem[] }>(
      '/api/admin/dashboard',
      { headers: authHeaders(token) }
    ),
  getAdminAppointments: (
    token: string,
    filters?: { search?: string; date?: string; serviceId?: string; status?: string }
  ) => {
    const qs = new URLSearchParams();
    if (filters?.search) qs.set('search', filters.search);
    if (filters?.date) qs.set('date', filters.date);
    if (filters?.serviceId) qs.set('serviceId', filters.serviceId);
    if (filters?.status) qs.set('status', filters.status);
    const query = qs.toString();
    return requestJson<AppointmentItem[]>(
      `/api/admin/appointments${query ? `?${query}` : ''}`,
      { headers: authHeaders(token) }
    );
  },
  createAdminAppointment: (
    token: string,
    payload: {
      service_id: number;
      trainer_id: number | null;
      customer_name: string;
      customer_phone: string;
      customer_email: string;
      appointment_date: string;
      start_time: string;
      status?: AppointmentStatus;
      notes?: string;
    }
  ) =>
    requestJson<AppointmentItem>('/api/admin/appointments', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateAdminAppointment: (
    token: string,
    id: number,
    payload: {
      status?: AppointmentStatus;
      service_id?: number;
      trainer_id?: number | null;
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
      appointment_date?: string;
      start_time?: string;
      notes?: string;
    }
  ) =>
    requestJson<AppointmentItem>(`/api/admin/appointments/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteAdminAppointment: (token: string, id: number) =>
    requestJson<{ deleted: boolean; booking_ref: string }>(`/api/admin/appointments/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  getAdminServices: (token: string) =>
    requestJson<ServiceItem[]>('/api/admin/services', { headers: authHeaders(token) }),
  createAdminService: (token: string, payload: Partial<ServiceItem>) =>
    requestJson<ServiceItem>('/api/admin/services', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateAdminService: (token: string, id: number, payload: Partial<ServiceItem>) =>
    requestJson<ServiceItem>(`/api/admin/services/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteAdminService: (token: string, id: number) =>
    requestJson<{ deleted?: boolean; disabled?: boolean }>(`/api/admin/services/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  getAdminTrainers: (token: string) =>
    requestJson<TrainerItem[]>('/api/admin/trainers', { headers: authHeaders(token) }),
  createAdminTrainer: (token: string, payload: Partial<TrainerItem>) =>
    requestJson<TrainerItem>('/api/admin/trainers', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateAdminTrainer: (token: string, id: number, payload: Partial<TrainerItem>) =>
    requestJson<TrainerItem>(`/api/admin/trainers/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateTrainerAvailability: (
    token: string,
    id: number,
    availability: Array<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean | number }>
  ) =>
    requestJson<TrainerItem>(`/api/admin/trainers/${id}/availability`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ availability }),
    }),
  deleteAdminTrainer: (token: string, id: number) =>
    requestJson<{ deleted: boolean }>(`/api/admin/trainers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  getAdminMemberships: (token: string) =>
    requestJson<MembershipPlanItem[]>('/api/admin/memberships', { headers: authHeaders(token) }),
  createAdminMembership: (token: string, payload: Partial<MembershipPlanItem>) =>
    requestJson<MembershipPlanItem>('/api/admin/memberships', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateAdminMembership: (token: string, id: number, payload: Partial<MembershipPlanItem>) =>
    requestJson<MembershipPlanItem>(`/api/admin/memberships/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteAdminMembership: (token: string, id: number) =>
    requestJson<{ deleted: boolean }>(`/api/admin/memberships/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
      body: JSON.stringify({}),
    }),

  getAdminGallery: (token: string) =>
    requestJson<GalleryImageItem[]>('/api/admin/gallery', { headers: authHeaders(token) }),
  uploadAdminGallery: (
    token: string,
    payload: {
      title: string;
      category: GalleryCategory;
      caption: string;
      image_data?: string;
      image_url?: string;
      is_verified_photo?: boolean;
    }
  ) =>
    requestJson<GalleryImageItem>('/api/admin/gallery', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteAdminGallery: (token: string, id: number) =>
    requestJson<{ deleted: boolean }>(`/api/admin/gallery/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  getAdminSettings: (token: string) =>
    requestJson<BusinessSettings>('/api/admin/settings', { headers: authHeaders(token) }),
  updateAdminSettings: (token: string, payload: Partial<BusinessSettings>) =>
    requestJson<BusinessSettings>('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  getAdminEnquiries: (token: string) =>
    requestJson<EnquiryItem[]>('/api/admin/enquiries', { headers: authHeaders(token) }),
  updateEnquiryStatus: (token: string, id: number, status: 'New' | 'Reviewed') =>
    requestJson<EnquiryItem>(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }),
};

// Formatting helpers
export function formatTime12h(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatINR(amount: number | null | undefined, fallback = 'Price on Enquiry'): string {
  if (amount === null || amount === undefined) return fallback;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIstTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatDateReadable(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function cleanWhatsAppUrl(rawNumber: string, text?: string): string | null {
  const digits = rawNumber.replace(/\D/g, '');
  if (digits.length < 8) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const encoded = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${withCountry}${encoded}`;
}
