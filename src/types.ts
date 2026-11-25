export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';

export type GalleryCategory =
  | 'Gym Interior'
  | 'Equipment'
  | 'Training'
  | 'Workout Environment'
  | 'Fitness Activities';

export interface ServiceItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  price: number | null;
  image_url: string;
  is_enabled: number;
  is_proposed: number;
  sort_order: number;
}

export interface TrainerAvailabilitySlot {
  id: number;
  trainer_id: number;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  is_available: number;
}

export interface TrainerItem {
  id: number;
  name: string;
  specialization: string;
  experience: string;
  qualifications: string;
  bio: string;
  photo_url: string;
  is_placeholder: number;
  is_active: number;
  availability?: TrainerAvailabilitySlot[];
}

export interface AppointmentItem {
  id: number;
  booking_ref: string;
  user_id: number | null;
  service_id: number;
  service_name?: string;
  trainer_id: number | null;
  trainer_name?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string;
  reschedule_requested_date: string | null;
  reschedule_requested_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlanItem {
  id: number;
  slug: string;
  name: string;
  duration_label: string;
  price: number | null;
  description: string;
  benefits: string[];
  is_active: number;
  sort_order: number;
}

export interface GalleryImageItem {
  id: number;
  title: string;
  category: GalleryCategory;
  image_url: string;
  caption: string;
  is_verified_photo: number;
  sort_order: number;
  created_at: string;
}

export interface HolidayEntry {
  date: string;
  reason: string;
}

export interface BusinessSettings {
  id: number;
  business_name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  mon_sat_open: string;
  mon_sat_close: string;
  sun_open: string;
  sun_close: string;
  holidays: HolidayEntry[];
  slot_interval_minutes: number;
  auto_confirm_bookings: number;
  updated_at: string;
}

export interface EnquiryItem {
  id: number;
  type: 'contact' | 'membership';
  plan_name: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'New' | 'Reviewed';
  created_at: string;
}

export interface TimeSlotOption {
  time: string;       // HH:MM
  end_time: string;   // HH:MM
  label: string;      // e.g. "06:00 AM"
  available: boolean;
  reason?: string;
}

export interface AdminDashboardStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  upcomingSessionsCount: number;
  newEnquiriesCount: number;
}
