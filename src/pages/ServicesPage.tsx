import { useMemo, useState } from 'react';
import { Clock, Search } from 'lucide-react';
import type { ServiceItem } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { formatINR } from '../lib/api';

interface ServicesPageProps {
  services: ServiceItem[];
  onBookService: (serviceId: number) => void;
}

export function ServicesPage({ services, onBookService }: ServicesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(services.map((s) => s.category)));
    return ['All', ...unique];
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  return (
    <div className="bg-[#09090B] min-h-screen">
      <section className="py-16 sm:py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
            Training Programmes
          </p>
          <h1
            className="font-display font-bold text-white tracking-tight text-balance"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            Fitness &amp; Conditioning Services
          </h1>
          <p className="mt-4 text-base text-zinc-300 max-w-2xl leading-relaxed">
            Browse our training disciplines in JP Nagar. Programmes, session durations, and
            pricing are managed directly by Play on Fitness ownership.
          </p>

          {/* Filter & Search Bar */}
          <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#12141A] border border-white/10 p-1 rounded-sm">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#FF5A1F] text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search
                className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                aria-label="Search fitness services"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#12141A] border border-white/15 text-white placeholder:text-zinc-500 rounded-sm focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <div className="bg-[#12141A] border border-white/10 p-12 text-center">
              <p className="text-base font-medium text-white">No services match your current filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((service) => (
                <article
                  key={service.id}
                  className="bg-[#12141A] border border-white/10 flex flex-col justify-between group"
                >
                  <div>
                    <div className="aspect-[4/3] overflow-hidden border-b border-white/10 bg-zinc-900">
                      <ResilientImage
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-2">
                        <span>{service.category}</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-[#FF6B2C]" aria-hidden="true" />
                          {service.duration_minutes} min
                        </span>
                      </div>

                      <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                        {service.name}
                      </h2>
                      <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                        {service.description}
                      </p>
                      {Boolean(service.is_proposed) && (
                        <p className="mt-3 text-xs text-zinc-500">
                          Proposed category · schedule &amp; rate configurable by centre
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                    <span className="text-sm font-mono tabular-nums text-zinc-100">
                      {formatINR(service.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onBookService(service.id)}
                      className="px-5 py-2.5 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Book Now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
