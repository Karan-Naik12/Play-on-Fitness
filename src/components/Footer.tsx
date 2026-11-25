import type { AppRoute } from './Navbar';
import type { BusinessSettings } from '../types';
import { formatTime12h } from '../lib/api';

interface FooterProps {
  settings: BusinessSettings | null;
  onNavigate: (route: AppRoute) => void;
}

export function Footer({ settings, onNavigate }: FooterProps) {
  const address =
    settings?.address || '2nd Floor, 309, 100 Feet Ring Road, near Delmia Circle, JP Nagar';
  const cityLine = `${settings?.city || 'Bengaluru'}, ${settings?.state || 'Karnataka'} ${
    settings?.postal_code || '560078'
  }`;

  const monSatHours = settings
    ? `${formatTime12h(settings.mon_sat_open)} – ${formatTime12h(settings.mon_sat_close)}`
    : '5:30 AM – 10:00 PM';
  const sunHours = settings
    ? `${formatTime12h(settings.sun_open)} – ${formatTime12h(settings.sun_close)}`
    : '6:30 AM – 1:00 PM';

  return (
    <footer className="bg-[#060608] border-t border-white/10 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="font-display text-2xl font-bold tracking-tight text-white inline-block"
            >
              PLAY ON <span className="text-[#FF6B2C]">FITNESS</span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-xs">
              Strength, functional conditioning, and focused coaching in JP Nagar, Bengaluru.
            </p>
          </div>

          <div>
            <h2 className="font-display text-sm font-semibold tracking-wider text-white uppercase mb-4">
              Explore
            </h2>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'About Us', route: '/about' as AppRoute },
                { label: 'Training Services', route: '/services' as AppRoute },
                { label: 'Trainers', route: '/trainers' as AppRoute },
                { label: 'Facility Gallery', route: '/gallery' as AppRoute },
                { label: 'Membership Plans', route: '/membership' as AppRoute },
              ].map((link) => (
                <li key={link.route}>
                  <a
                    href={link.route}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(link.route);
                    }}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm font-semibold tracking-wider text-white uppercase mb-4">
              Appointments &amp; Access
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="/book"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/book');
                  }}
                  className="text-[#FF7833] hover:text-[#FF945C] font-medium transition-colors"
                >
                  Book a Training Session
                </a>
              </li>
              <li>
                <a
                  href="/booking-status"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/booking-status');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Manage or Reschedule Booking
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/contact');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Contact &amp; Directions
                </a>
              </li>
              <li>
                <a
                  href="/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/admin');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Owner Admin Portal
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm font-semibold tracking-wider text-white uppercase mb-4">
              Location &amp; Hours
            </h2>
            <address className="not-italic text-sm leading-relaxed text-zinc-400">
              {address},<br />
              {cityLine}
            </address>
            <div className="mt-4 space-y-1.5 text-xs font-mono tabular-nums text-zinc-300">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">MON–SAT</span>
                <span>{monSatHours}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">SUNDAY</span>
                <span>{sunHours}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} {settings?.business_name || 'Play on Fitness'}. JP Nagar, Bengaluru.</p>
          <div className="flex items-center gap-6">
            <a href="/sitemap.xml" className="hover:text-zinc-300 transition-colors">
              Sitemap
            </a>
            <a href="/robots.txt" className="hover:text-zinc-300 transition-colors">
              Robots
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
