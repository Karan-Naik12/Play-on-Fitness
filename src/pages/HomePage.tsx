import { ArrowRight, Calendar, Clock, Dumbbell, ShieldCheck, Target, Users } from 'lucide-react';
import type { AppRoute } from '../components/Navbar';
import type { BusinessSettings, GalleryImageItem, ServiceItem } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { LocationSection } from '../components/LocationSection';
import { formatINR } from '../lib/api';

interface HomePageProps {
  settings: BusinessSettings | null;
  services: ServiceItem[];
  gallery: GalleryImageItem[];
  onNavigate: (route: AppRoute) => void;
  onSelectServiceForBooking: (serviceId: number) => void;
}

export function HomePage({
  settings,
  services,
  gallery,
  onNavigate,
  onSelectServiceForBooking,
}: HomePageProps) {
  const featuredServices = services.slice(0, 6);
  const galleryPreview = gallery.slice(0, 4);

  return (
    <div>
      {/* 1. Full-Screen Athletic Hero */}
      <section className="relative min-h-[86vh] flex items-end pb-16 sm:pb-24 pt-24 overflow-hidden bg-[#09090B]">
        <div className="absolute inset-0">
          <ResilientImage
            src="/src/assets/images/hero_strength_arena_1795614906522.jpg"
            alt="Play on Fitness strength training floor with matte black power racks and barbells"
            className="w-full h-full object-cover object-center"
            eager
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-[#09090B]/40"
            aria-hidden="true"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-sm font-medium tracking-widest uppercase text-[#FF7833] mb-4">
              JP Nagar · 100 Feet Ring Road · Bengaluru
            </p>
            <h1
              className="font-display font-bold text-white tracking-tight leading-[0.95] text-balance"
              style={{ fontSize: 'clamp(2.75rem, 6vw, 5rem)' }}
            >
              BUILD YOUR STRENGTH. OWN YOUR JOURNEY.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl">
              Play on Fitness is a strength, functional conditioning, and personal training centre
              near Delmia Circle in JP Nagar—built for structured training, steady progression, and
              lasting personal development.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('/book')}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors duration-150 cursor-pointer"
              >
                Book Your Session
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/services')}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/20 rounded-sm transition-colors duration-150 cursor-pointer"
              >
                Explore Our Services
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Business Introduction */}
      <section className="py-20 bg-[#09090B] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
                The Training Space
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight text-balance">
                Focused Training on 100 Feet Ring Road
              </h2>
              <p className="mt-5 text-base text-zinc-300 leading-relaxed">
                Located on the 2nd Floor at 309, 100 Feet Ring Road near Delmia Circle, Play on
                Fitness gives JP Nagar residents a dedicated floor for progressive barbell work,
                kettlebell and functional conditioning, cardio stamina, and guided mobility.
              </p>
              <p className="mt-4 text-base text-zinc-400 leading-relaxed">
                Whether you prefer early-morning 5:30 AM sessions before work or evening strength
                blocks, our online booking system lets you reserve floor time or coaching slots
                directly against live centre availability.
              </p>

              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-mono text-zinc-500">MON–SAT HOURS</p>
                  <p className="mt-1 text-base font-semibold text-white font-mono tabular-nums">
                    5:30 AM – 10:00 PM
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono text-zinc-500">SUNDAY HOURS</p>
                  <p className="mt-1 text-base font-semibold text-white font-mono tabular-nums">
                    6:30 AM – 1:00 PM
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => onNavigate('/about')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF7833] hover:text-[#FF945C] transition-colors cursor-pointer"
                >
                  About Play on Fitness
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 min-h-[320px] lg:min-h-[440px]">
              <ResilientImage
                src="/src/assets/images/service_strength_barbell_1795614906785.jpg"
                alt="Calibrated barbell plates and steel rack in strength training area"
                className="w-full h-full object-cover border border-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Fitness Programmes */}
      <section className="py-20 bg-[#0D0E12] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-10 border-b border-white/10">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
                Training Categories
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
                Featured Fitness Programmes
              </h2>
              <p className="mt-2 text-sm text-zinc-400 max-w-xl">
                Proposed training disciplines configurable by Play on Fitness management. Select a
                programme to check live appointment slots.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/services')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#FF7833] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              View All Services
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredServices.map((service, idx) => (
              <article
                key={service.id}
                className="bg-[#12141A] border border-white/10 flex flex-col justify-between group"
              >
                <div>
                  <div className="aspect-[4/3] overflow-hidden bg-zinc-900 border-b border-white/10">
                    <ResilientImage
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums mb-2">
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{service.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{service.duration_minutes} min</span>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                      {service.name}
                    </h3>
                    <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <span className="text-sm font-mono tabular-nums text-zinc-200">
                    {formatINR(service.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectServiceForBooking(service.id)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Book Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Choose Us */}
      <section className="py-20 bg-[#09090B] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
              Why Play on Fitness
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight text-balance">
              Built Around Discipline, Access, and Real Coaching
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-white/10 divide-y md:divide-y-0 md:divide-x divide-white/10 bg-[#0D0E12]">
            {[
              {
                icon: Dumbbell,
                title: 'Dedicated Training Zones',
                desc: 'Separated areas for barbell strength, kettlebell conditioning, cardio ergs, and mobility recovery.',
              },
              {
                icon: Clock,
                title: 'Early Morning to Night',
                desc: 'Open from 5:30 AM to 10:00 PM Monday through Saturday, plus Sunday morning sessions.',
              },
              {
                icon: Calendar,
                title: 'Live Slot Scheduling',
                desc: 'Real-time appointment booking prevents double bookings and respects coach availability.',
              },
              {
                icon: Target,
                title: 'JP Nagar Accessibility',
                desc: 'Positioned right on 100 Feet Ring Road near Delmia Circle for convenient daily commutes.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-7 flex flex-col justify-between">
                  <div>
                    <Icon className="w-6 h-6 text-[#FF6B2C] mb-5" aria-hidden="true" />
                    <h3 className="font-display text-xl font-bold text-white">{item.title}</h3>
                    <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Gallery Preview */}
      <section className="py-20 bg-[#0D0E12] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
                Visual Environment
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Training Floor &amp; Equipment Zones
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/gallery')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#FF7833] transition-colors cursor-pointer"
            >
              Open Full Gallery
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {galleryPreview.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onNavigate('/gallery')}
                className="text-left bg-[#12141A] border border-white/10 overflow-hidden group cursor-pointer"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <ResilientImage
                    src={img.image_url}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-zinc-400">{img.category}</p>
                  <p className="mt-1 text-sm font-semibold text-white truncate">{img.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Membership Enquiry CTA Section */}
      <section className="py-20 bg-[#09090B] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#12141A] border border-white/10 p-8 sm:p-12 lg:p-14 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
                Memberships &amp; Passes
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight text-balance">
                Daily Passes, Seasonal Blocks, and Personal Training
              </h2>
              <p className="mt-4 text-base text-zinc-300 leading-relaxed">
                Explore flexible access options from single-day drop-ins to annual plans and
                one-on-one coaching, or send a membership enquiry directly to our team.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-6 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                  Individual &amp; guided formats
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                  Transparent centre-configured rates
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/membership')}
                className="px-7 py-3.5 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Explore Memberships
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/booking-status')}
                className="px-7 py-3.5 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Check Booking Status
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Location & Business Hours */}
      <LocationSection settings={settings} onBookClick={() => onNavigate('/book')} />
    </div>
  );
}
