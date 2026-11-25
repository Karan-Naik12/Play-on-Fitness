import { ArrowRight, Compass, Dumbbell, Shield, Target } from 'lucide-react';
import type { AppRoute } from '../components/Navbar';
import { ResilientImage } from '../components/ResilientImage';

interface AboutPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="bg-[#09090B]">
      {/* Page Header */}
      <section className="py-16 sm:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
              About Play on Fitness
            </p>
            <h1
              className="font-display font-bold text-white tracking-tight text-balance"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
            >
              A Grounded Strength &amp; Conditioning Environment in JP Nagar
            </h1>
            <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed">
              Situated on 100 Feet Ring Road near Delmia Circle, Play on Fitness is designed for
              consistent, purposeful training—combining foundational resistance equipment,
              functional conditioning space, and attentive coaching access.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy & Training Environment */}
      <section className="py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 min-h-[340px]">
              <ResilientImage
                src="/src/assets/images/hero_strength_arena_1795614906522.jpg"
                alt="Training floor layout with strength racks and lifting platforms"
                className="w-full h-full object-cover border border-white/10"
              />
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
                Fitness Philosophy
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Consistency Over Short-Term Hype
              </h2>
              <p className="mt-4 text-base text-zinc-300 leading-relaxed">
                Sustainable progress comes from repeatable habits: sound movement mechanics,
                gradual progression under load, cardiovascular stamina, and adequate recovery.
              </p>
              <p className="mt-4 text-base text-zinc-400 leading-relaxed">
                Play on Fitness structures its floor and appointment schedule around real daily
                routines—supporting early-morning lifters, lunchtime conditioning sessions, and
                focused evening training without unnecessary distractions.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-white font-semibold text-sm mb-2">
                    <Target className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                    Our Mission
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    To provide a clean, well-organized fitness centre in JP Nagar where members can
                    train safely, build measurable strength, and stay consistent year-round.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-white font-semibold text-sm mb-2">
                    <Compass className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                    Our Vision
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    To be a trusted neighbourhood training destination in Bengaluru known for
                    disciplined coaching, reliable equipment, and welcoming member support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gym Facilities & Equipment Zones */}
      <section className="py-20 bg-[#0D0E12] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
              Facilities &amp; Equipment
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Four Dedicated Training Environments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Barbell & Strength Zone',
                image: '/src/assets/images/service_strength_barbell_1795614906785.jpg',
                desc: 'Power racks, Olympic barbells, calibrated plates, and heavy-duty benches designed for squat, press, and pull progressions.',
              },
              {
                title: 'Functional & Kettlebell Turf',
                image: '/src/assets/images/service_functional_kettlebell_1795614907309.jpg',
                desc: 'Open turf lane paired with cast-iron kettlebells, plyometric boxes, and sleds for multi-planar athletic conditioning.',
              },
              {
                title: 'Cardio & Endurance Station',
                image: '/src/assets/images/service_cardio_conditioning_1795614908734.jpg',
                desc: 'Rowing machines, air bikes, and running decks built for interval work and steady aerobic conditioning.',
              },
              {
                title: 'Mobility & Coaching Floor',
                image: '/src/assets/images/service_mobility_coaching_1795614908804.jpg',
                desc: 'Dedicated recovery mats, rollers, resistance bands, and dumbbell racks suited for warm-ups, mobility drills, and 1-on-1 coaching.',
              },
            ].map((zone) => (
              <div key={zone.title} className="bg-[#12141A] border border-white/10 overflow-hidden">
                <div className="aspect-[16/10] border-b border-white/10">
                  <ResilientImage
                    src={zone.image}
                    alt={zone.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold text-white">{zone.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{zone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-[#12141A] border border-white/10 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-[#FF6B2C]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Experience the Floor in Person
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Book an introductory fitness guidance or training session online.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/book')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer"
            >
              Book Your Session
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-sm transition-colors cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
              Visit &amp; Contact
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
