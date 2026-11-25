import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AppointmentItem,
  BusinessSettings,
  EnquiryItem,
  GalleryImageItem,
  MembershipPlanItem,
  ServiceItem,
  TrainerItem,
} from '../types.ts';

let cachedClient: SupabaseClient | null | undefined;

function resolveSupabaseConfig(): { url: string; key: string } | null {
  const explicitUrl = process.env.SUPABASE_URL?.trim();
  const projectId = process.env.SUPABASE_PROJECT_ID?.trim();
  const url = explicitUrl || (projectId ? `https://${projectId}.supabase.co` : '');

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    '';

  if (!url || !key) return null;
  return { url, key };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const cfg = resolveSupabaseConfig();
  if (!cfg) {
    cachedClient = null;
    return null;
  }
  cachedClient = createClient(cfg.url, cfg.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}

export interface SupabaseAppointmentRow {
  id: number;
  booking_ref: string;
  service_id: number;
  service_name: string;
  trainer_id: number | null;
  trainer_name: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  notes: string;
  reschedule_requested_date: string | null;
  reschedule_requested_time: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchAppointmentsFromSupabase(): Promise<SupabaseAppointmentRow[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Supabase fetch appointments failed:', error.message);
      return null;
    }

    return (data || []) as SupabaseAppointmentRow[];
  } catch (err) {
    console.error('Supabase fetch appointments error:', err);
    return null;
  }
}

export async function syncAppointmentToSupabase(appt: AppointmentItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('appointments').insert({
      booking_ref: appt.booking_ref,
      service_id: appt.service_id,
      service_name: appt.service_name || '',
      trainer_id: appt.trainer_id,
      trainer_name: appt.trainer_name || null,
      customer_name: appt.customer_name,
      customer_phone: appt.customer_phone,
      customer_email: appt.customer_email,
      appointment_date: appt.appointment_date,
      start_time: appt.start_time,
      end_time: appt.end_time,
      duration_minutes: appt.duration_minutes,
      status: appt.status,
      notes: appt.notes || '',
      reschedule_requested_date: appt.reschedule_requested_date || null,
      reschedule_requested_time: appt.reschedule_requested_time || null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Supabase appointment sync failed:', error.message);
    }
  } catch (err) {
    console.error('Supabase appointment sync error:', err);
  }
}

export async function updateAppointmentInSupabase(appt: AppointmentItem): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('appointments')
      .update({
        service_id: appt.service_id,
        service_name: appt.service_name || '',
        trainer_id: appt.trainer_id,
        trainer_name: appt.trainer_name || null,
        customer_name: appt.customer_name,
        customer_phone: appt.customer_phone,
        customer_email: appt.customer_email,
        appointment_date: appt.appointment_date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        duration_minutes: appt.duration_minutes,
        status: appt.status,
        notes: appt.notes || '',
        reschedule_requested_date: appt.reschedule_requested_date || null,
        reschedule_requested_time: appt.reschedule_requested_time || null,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_ref', appt.booking_ref);

    if (error) {
      console.error('Supabase appointment update failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase appointment update error:', err);
    return false;
  }
}

export async function deleteAppointmentInSupabase(bookingRef: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('appointments')
      .delete()
      .eq('booking_ref', bookingRef);

    if (error) {
      console.error('Supabase appointment delete failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase appointment delete error:', err);
    return false;
  }
}

export async function syncEnquiryToSupabase(enquiry: Omit<EnquiryItem, 'id' | 'created_at'>): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('enquiries').insert({
      type: enquiry.type,
      plan_name: enquiry.plan_name || '',
      name: enquiry.name,
      phone: enquiry.phone,
      email: enquiry.email,
      message: enquiry.message,
      status: enquiry.status,
    });
    if (error) {
      console.error('Supabase enquiry sync failed:', error.message);
    }
  } catch (err) {
    console.error('Supabase enquiry sync error:', err);
  }
}

export async function syncServiceToSupabase(service: ServiceItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('services').upsert({
      id: service.id,
      slug: service.slug,
      name: service.name,
      category: service.category,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      image_url: service.image_url,
      is_enabled: Boolean(service.is_enabled),
      is_proposed: Boolean(service.is_proposed),
      sort_order: service.sort_order,
    });
    if (error) {
      console.error('Supabase service sync failed:', error.message);
    }
  } catch (err) {
    console.error('Supabase service sync error:', err);
  }
}

export async function syncTrainerToSupabase(trainer: TrainerItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('trainers').upsert({
      id: trainer.id,
      name: trainer.name,
      specialization: trainer.specialization,
      experience: trainer.experience,
      qualifications: trainer.qualifications,
      bio: trainer.bio,
      photo_url: trainer.photo_url,
      is_placeholder: Boolean(trainer.is_placeholder),
      is_active: Boolean(trainer.is_active),
    });
    if (error) {
      console.error('Supabase trainer sync failed:', error.message);
    }
  } catch (err) {
    console.error('Supabase trainer sync error:', err);
  }
}

export async function syncMembershipToSupabase(plan: MembershipPlanItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('membership_plans').upsert({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      duration_label: plan.duration_label,
      price: plan.price,
      description: plan.description,
      benefits: plan.benefits,
      is_active: Boolean(plan.is_active),
      sort_order: plan.sort_order,
    });
    if (error) {
      console.error('Supabase membership sync failed:', error.message);
    }
  } catch (err) {
    console.error('Supabase membership sync error:', err);
  }
}

export async function syncGalleryToSupabase(item: GalleryImageItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('gallery_images').upsert({
      id: item.id,
      title: item.title,
      category: item.category,
      image_url: item.image_url,
      caption: item.caption,
      is_verified_photo: Boolean(item.is_verified_photo),
      sort_order: item.sort_order,
    });
    if (error) {
      console.error('Supabase gallery sync failed:', error.message);
    }
  } catch (err) {
    console.error('Supabase gallery sync error:', err);
  }
}

export async function syncSettingsToSupabase(settings: BusinessSettings): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('business_settings').upsert({
      id: 1,
      business_name: settings.business_name,
      category: settings.category,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      postal_code: settings.postal_code,
      phone: settings.phone,
      whatsapp_number: settings.whatsapp_number,
      email: settings.email,
      mon_sat_open: settings.mon_sat_open,
      mon_sat_close: settings.mon_sat_close,
      sun_open: settings.sun_open,
      sun_close: settings.sun_close,
      holidays_json: settings.holidays,
      slot_interval_minutes: settings.slot_interval_minutes,
      auto_confirm_bookings: Boolean(settings.auto_confirm_bookings),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Supabase settings sync failed:', error.message);
    }
  } catch (err) {
    console.error('Supabase settings sync error:', err);
  }
}
