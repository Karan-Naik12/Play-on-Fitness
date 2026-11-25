import { useCallback, useEffect, useState } from 'react';
import { Navbar, type AppRoute } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesPage } from './pages/ServicesPage';
import { TrainersPage } from './pages/TrainersPage';
import { GalleryPage } from './pages/GalleryPage';
import { MembershipPage } from './pages/MembershipPage';
import { ContactPage } from './pages/ContactPage';
import { BookingPage } from './pages/BookingPage';
import { BookingStatusPage } from './pages/BookingStatusPage';
import { AdminPage } from './pages/AdminPage';
import { api } from './lib/api';
import type {
  BusinessSettings,
  GalleryImageItem,
  MembershipPlanItem,
  ServiceItem,
  TrainerItem,
} from './types';

const VALID_ROUTES: AppRoute[] = [
  '/',
  '/about',
  '/services',
  '/trainers',
  '/gallery',
  '/membership',
  '/contact',
  '/book',
  '/booking-status',
  '/admin',
];

function parseRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return VALID_ROUTES.includes(clean as AppRoute) ? (clean as AppRoute) : '/';
}

const ROUTE_SEO: Record<AppRoute, { title: string; description: string }> = {
  '/': {
    title: 'Play on Fitness | Gym & Strength Centre in JP Nagar, Bengaluru',
    description:
      'Build your strength and own your journey at Play on Fitness on 100 Feet Ring Road near Delmia Circle, JP Nagar, Bengaluru. Book sessions online.',
  },
  '/about': {
    title: 'About Play on Fitness | JP Nagar, Bengaluru',
    description:
      'Learn about Play on Fitness training philosophy, equipment zones, and mission in JP Nagar, Bengaluru.',
  },
  '/services': {
    title: 'Services & Training Programmes | Play on Fitness JP Nagar',
    description:
      'Explore strength training, cardio conditioning, functional fitness, kettlebell training, mobility, and personal training in JP Nagar.',
  },
  '/trainers': {
    title: 'Trainers & Coaches | Play on Fitness JP Nagar',
    description:
      'View coaching profiles, specializations, and appointment availability at Play on Fitness JP Nagar.',
  },
  '/gallery': {
    title: 'Facility Gallery | Play on Fitness JP Nagar',
    description:
      'View training zones, equipment, and workout spaces at Play on Fitness, JP Nagar, Bengaluru.',
  },
  '/membership': {
    title: 'Membership Plans | Play on Fitness JP Nagar',
    description:
      'Compare daily passes, monthly, quarterly, half-yearly, annual memberships, and personal training enquiries in JP Nagar.',
  },
  '/contact': {
    title: 'Contact & Directions | Play on Fitness JP Nagar',
    description:
      'Visit Play on Fitness at 2nd Floor, 309, 100 Feet Ring Road near Delmia Circle, JP Nagar, Bengaluru 560078.',
  },
  '/book': {
    title: 'Book a Training Session | Play on Fitness JP Nagar',
    description:
      'Reserve your gym workout, strength session, or personal coaching slot online with live availability at Play on Fitness.',
  },
  '/booking-status': {
    title: 'Manage Your Booking | Play on Fitness JP Nagar',
    description:
      'Check booking status, reschedule, or cancel an upcoming session at Play on Fitness JP Nagar.',
  },
  '/admin': {
    title: 'Owner Admin Portal | Play on Fitness',
    description: 'Manage appointments, services, trainers, memberships, and business settings.',
  },
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerItem[]>([]);
  const [plans, setPlans] = useState<MembershipPlanItem[]>([]);
  const [gallery, setGallery] = useState<GalleryImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Pre-selected booking context
  const [bookingServiceId, setBookingServiceId] = useState<number | null>(null);
  const [bookingTrainerId, setBookingTrainerId] = useState<number | null>(null);
  const [lookupRef, setLookupRef] = useState('');
  const [lookupContact, setLookupContact] = useState('');

  const loadSiteData = useCallback(async () => {
    try {
      const data = await api.getBootstrap();
      setSettings(data.settings);
      setServices(data.services);
      setTrainers(data.trainers);
      setPlans(data.plans);
      setGallery(data.gallery);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load centre data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSiteData();
  }, [loadSiteData]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const meta = ROUTE_SEO[route];
    document.title = meta.title;
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) {
      descTag.setAttribute('content', meta.description);
    }
  }, [route]);

  const navigate = useCallback((nextRoute: AppRoute) => {
    if (window.location.pathname !== nextRoute) {
      window.history.pushState({}, '', nextRoute);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBookService = (serviceId: number) => {
    setBookingServiceId(serviceId);
    setBookingTrainerId(null);
    navigate('/book');
  };

  const handleBookTrainer = (trainerId: number) => {
    setBookingTrainerId(trainerId);
    navigate('/book');
  };

  const handleManageRef = (ref: string, contact: string) => {
    setLookupRef(ref);
    setLookupContact(contact);
    navigate('/booking-status');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      <Navbar currentRoute={route} onNavigate={navigate} />

      <main className="flex-1">
        {loadError && (
          <div className="bg-red-950/70 border-b border-red-500/40 px-4 py-3 text-center text-xs text-red-200">
            {loadError}
          </div>
        )}

        {loading && route !== '/admin' ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-xs font-mono tracking-wider text-zinc-400">
              LOADING PLAY ON FITNESS...
            </div>
          </div>
        ) : (
          <>
            {route === '/' && (
              <HomePage
                settings={settings}
                services={services}
                gallery={gallery}
                onNavigate={navigate}
                onSelectServiceForBooking={handleBookService}
              />
            )}
            {route === '/about' && <AboutPage onNavigate={navigate} />}
            {route === '/services' && (
              <ServicesPage services={services} onBookService={handleBookService} />
            )}
            {route === '/trainers' && (
              <TrainersPage trainers={trainers} onBookTrainer={handleBookTrainer} />
            )}
            {route === '/gallery' && <GalleryPage gallery={gallery} />}
            {route === '/membership' && <MembershipPage plans={plans} />}
            {route === '/contact' && (
              <ContactPage settings={settings} onBookClick={() => navigate('/book')} />
            )}
            {route === '/book' && (
              <BookingPage
                settings={settings}
                services={services}
                trainers={trainers}
                initialServiceId={bookingServiceId}
                initialTrainerId={bookingTrainerId}
                onNavigate={navigate}
                onManageRef={handleManageRef}
              />
            )}
            {route === '/booking-status' && (
              <BookingStatusPage
                initialRef={lookupRef}
                initialContact={lookupContact}
                onNavigate={navigate}
              />
            )}
            {route === '/admin' && <AdminPage onRefreshSiteData={loadSiteData} />}
          </>
        )}
      </main>

      {route !== '/admin' && <Footer settings={settings} onNavigate={navigate} />}
    </div>
  );
}
