import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type AppRoute =
  | '/'
  | '/about'
  | '/services'
  | '/trainers'
  | '/gallery'
  | '/membership'
  | '/contact'
  | '/book'
  | '/booking-status'
  | '/admin';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const NAV_LINKS: Array<{ label: string; route: AppRoute }> = [
  { label: 'Home', route: '/' },
  { label: 'About', route: '/about' },
  { label: 'Services', route: '/services' },
  { label: 'Trainers', route: '/trainers' },
  { label: 'Gallery', route: '/gallery' },
  { label: 'Membership', route: '/membership' },
  { label: 'Contact', route: '/contact' },
];

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/92 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav('/');
          }}
          className="font-display text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF5A1F] focus-visible:outline-offset-4"
        >
          PLAY ON <span className="text-[#FF6B2C]">FITNESS</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((item) => {
            const active = currentRoute === item.route;
            return (
              <a
                key={item.route}
                href={item.route}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.route);
                }}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#FF5A1F] focus-visible:outline-offset-4 ${
                  active
                    ? 'text-white border-[#FF5A1F]'
                    : 'text-zinc-400 border-transparent hover:text-white hover:border-zinc-700'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Admin Link + Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/admin');
            }}
            className={`hidden sm:inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-sm border transition-colors duration-150 whitespace-nowrap shrink-0 ${
              currentRoute === '/admin'
                ? 'text-white border-[#FF5A1F] bg-white/10'
                : 'text-zinc-300 border-white/15 hover:text-white hover:border-white/30'
            }`}
          >
            Admin
          </a>

          <button
            type="button"
            onClick={() => handleNav('/book')}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            Book a Session
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 text-zinc-200 hover:text-white border border-white/15 rounded-sm cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0D0E12] border-b border-white/10 px-4 py-4">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => {
              const active = currentRoute === item.route;
              return (
                <a
                  key={item.route}
                  href={item.route}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav(item.route);
                  }}
                  className={`px-3 py-3 text-base font-medium rounded-sm transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleNav('/book')}
                className="w-full py-3 px-4 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                Book a Session
              </button>
              <button
                type="button"
                onClick={() => handleNav('/booking-status')}
                className="w-full py-3 px-4 text-sm font-medium text-zinc-200 border border-white/15 hover:border-white/30 rounded-sm cursor-pointer"
              >
                Manage Existing Booking
              </button>
              <button
                type="button"
                onClick={() => handleNav('/admin')}
                className="w-full py-3 px-4 text-sm font-medium text-zinc-300 border border-white/15 hover:border-white/30 rounded-sm cursor-pointer"
              >
                Admin Panel
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
