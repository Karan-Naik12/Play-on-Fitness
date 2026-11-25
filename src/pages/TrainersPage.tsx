import { Calendar, Award, Briefcase } from 'lucide-react';
import type { TrainerItem } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { formatTime12h } from '../lib/api';

interface TrainersPageProps {
  trainers: TrainerItem[];
  onBookTrainer: (trainerId: number) => void;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TrainersPage({ trainers, onBookTrainer }: TrainersPageProps) {
  return (
    <div className="bg-[#09090B] min-h-screen">
      <section className="py-16 sm:py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
            Coaching Roster
          </p>
          <h1
            className="font-display font-bold text-white tracking-tight text-balance"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            Trainers &amp; Coaching Slots
          </h1>
          <p className="mt-4 text-base text-zinc-300 max-w-2xl leading-relaxed">
            Reserve one-on-one or guided training sessions with available coaches. Verified coach
            profiles, credentials, and weekly schedules are managed by Play on Fitness ownership.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {trainers.length === 0 ? (
            <div className="bg-[#12141A] border border-white/10 p-12 text-center">
              <p className="text-base text-zinc-300">
                No trainer profiles are currently active. You can still book general sessions from
                our booking calendar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {trainers.map((trainer) => {
                const availDays = (trainer.availability || []).filter((a) => a.is_available);
                return (
                  <article
                    key={trainer.id}
                    className="bg-[#12141A] border border-white/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[4/3] overflow-hidden border-b border-white/10 bg-zinc-900">
                        <ResilientImage
                          src={trainer.photo_url}
                          alt={trainer.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="p-6">
                        <div className="text-xs text-[#FF7833] font-medium mb-1">
                          {trainer.specialization}
                        </div>
                        <h2 className="font-display text-2xl font-bold text-white">
                          {trainer.name}
                        </h2>
                        <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{trainer.bio}</p>

                        <div className="mt-5 pt-5 border-t border-white/10 space-y-2.5 text-xs text-zinc-300">
                          <div className="flex items-start gap-2.5">
                            <Briefcase className="w-4 h-4 text-[#FF6B2C] shrink-0 mt-0.5" aria-hidden="true" />
                            <div>
                              <span className="text-zinc-500">Experience: </span>
                              <span>{trainer.experience}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Award className="w-4 h-4 text-[#FF6B2C] shrink-0 mt-0.5" aria-hidden="true" />
                            <div>
                              <span className="text-zinc-500">Qualifications: </span>
                              <span>{trainer.qualifications}</span>
                            </div>
                          </div>
                        </div>

                        {/* Weekly Available Slots */}
                        <div className="mt-5 pt-5 border-t border-white/10">
                          <p className="text-xs font-medium text-zinc-400 mb-2.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#FF6B2C]" aria-hidden="true" />
                            Appointment Availability
                          </p>
                          {availDays.length === 0 ? (
                            <p className="text-xs text-zinc-500">Schedule configurable by admin</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono tabular-nums">
                              {availDays.map((slot) => (
                                <div key={slot.day_of_week} className="flex justify-between text-zinc-300">
                                  <span className="text-zinc-500">{DAY_SHORT[slot.day_of_week]}</span>
                                  <span>
                                    {formatTime12h(slot.start_time).replace(':00 ', '')}–
                                    {formatTime12h(slot.end_time).replace(':00 ', '')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => onBookTrainer(trainer.id)}
                        className="w-full py-3 px-4 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer"
                      >
                        Book Session with Coach
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
