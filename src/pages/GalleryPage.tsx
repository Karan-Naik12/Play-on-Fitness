import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import type { GalleryCategory, GalleryImageItem } from '../types';
import { ResilientImage } from '../components/ResilientImage';

interface GalleryPageProps {
  gallery: GalleryImageItem[];
}

const CATEGORIES: Array<'All' | GalleryCategory> = [
  'All',
  'Gym Interior',
  'Equipment',
  'Training',
  'Workout Environment',
  'Fitness Activities',
];

export function GalleryPage({ gallery }: GalleryPageProps) {
  const [activeCat, setActiveCat] = useState<'All' | GalleryCategory>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (activeCat === 'All') return gallery;
    return gallery.filter((g) => g.category === activeCat);
  }, [gallery, activeCat]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % filtered.length));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + filtered.length) % filtered.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, filtered.length]);

  const currentItem = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="bg-[#09090B] min-h-screen">
      <section className="py-16 sm:py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
            Facility &amp; Equipment Gallery
          </p>
          <h1
            className="font-display font-bold text-white tracking-tight text-balance"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            Inside Play on Fitness
          </h1>
          <p className="mt-4 text-base text-zinc-300 max-w-2xl leading-relaxed">
            Explore our training zones by category. Verified facility photographs uploaded by
            management appear directly here alongside clearly marked representative previews.
          </p>

          {/* Category Filter Tabs */}
          <div className="mt-8 flex flex-wrap items-center gap-1.5 bg-[#12141A] border border-white/10 p-1 rounded-sm w-fit">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCat(cat);
                  setLightboxIndex(null);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCat === cat
                    ? 'bg-[#FF5A1F] text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <div className="bg-[#12141A] border border-white/10 p-12 text-center">
              <p className="text-base text-zinc-300">No images found in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="text-left bg-[#12141A] border border-white/10 overflow-hidden group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
                >
                  <div className="aspect-[4/3] relative overflow-hidden border-b border-white/10">
                    <ResilientImage
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/90 text-white text-xs font-medium border border-white/20">
                        <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                        View
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1.5">
                      <span>{item.category}</span>
                      <span>
                        {item.is_verified_photo ? 'Verified Facility Photo' : 'Representative Preview'}
                      </span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-white">{item.title}</h2>
                    {item.caption && (
                      <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">{item.caption}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      {currentItem && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={currentItem.title}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-[#12141A] border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div>
                <p className="text-xs text-[#FF7833]">{currentItem.category}</p>
                <h3 className="font-display text-xl font-bold text-white">{currentItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close image lightbox"
                className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              <ResilientImage
                src={currentItem.image_url}
                alt={currentItem.title}
                className="max-h-[70vh] w-auto object-contain"
                eager
              />
              {filtered.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() =>
                      setLightboxIndex((lightboxIndex - 1 + filtered.length) % filtered.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/75 hover:bg-black text-white border border-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % filtered.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/75 hover:bg-black text-white border border-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {currentItem.caption && (
              <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between gap-4 text-xs text-zinc-400">
                <p>{currentItem.caption}</p>
                <span className="font-mono tabular-nums shrink-0">
                  {lightboxIndex + 1} / {filtered.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
