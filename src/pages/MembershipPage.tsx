import { useState, type FormEvent } from 'react';
import { Check, CheckCircle2, X } from 'lucide-react';
import type { MembershipPlanItem } from '../types';
import { api, formatINR } from '../lib/api';

interface MembershipPageProps {
  plans: MembershipPlanItem[];
}

export function MembershipPage({ plans }: MembershipPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanItem | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const openEnquiry = (plan: MembershipPlanItem) => {
    setSelectedPlan(plan);
    setMessage(`I would like current rates and start details for the ${plan.name} (${plan.duration_label}).`);
    setError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setError('');
    setSubmitting(true);
    try {
      await api.submitEnquiry({
        type: 'membership',
        plan_name: selectedPlan.name,
        name,
        phone,
        email,
        message,
      });
      setSuccessMsg(
        `Your enquiry for ${selectedPlan.name} has been received by Play on Fitness JP Nagar.`
      );
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#09090B] min-h-screen">
      <section className="py-16 sm:py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
            Access &amp; Plans
          </p>
          <h1
            className="font-display font-bold text-white tracking-tight text-balance"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            Membership Options
          </h1>
          <p className="mt-4 text-base text-zinc-300 max-w-2xl leading-relaxed">
            Choose from short-term passes, multi-month commitments, or dedicated personal training.
            Plan rates and inclusions are updated directly by Play on Fitness management.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className="bg-[#12141A] border border-white/10 p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 text-xs text-zinc-400 font-mono">
                    <span>{plan.duration_label}</span>
                  </div>
                  <h2 className="mt-2 font-display text-3xl font-bold text-white">{plan.name}</h2>
                  <div className="mt-4 pb-5 border-b border-white/10">
                    <p className="font-mono text-2xl font-semibold text-[#FF7833] tabular-nums">
                      {formatINR(plan.price, 'Enquire for Rates')}
                    </p>
                  </div>
                  <p className="mt-5 text-sm text-zinc-300 leading-relaxed">{plan.description}</p>

                  <ul className="mt-6 space-y-2.5">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-[#FF6B2C] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => openEnquiry(plan)}
                    className="w-full py-3 px-4 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer"
                  >
                    Enquire Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Enquiry Modal */}
      {selectedPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="membership-enquiry-title"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedPlan(null)}
        >
          <div
            className="w-full max-w-lg bg-[#12141A] border border-white/15 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <p className="text-xs text-[#FF7833] font-medium">Membership Enquiry</p>
                <h2 id="membership-enquiry-title" className="font-display text-2xl font-bold text-white mt-0.5">
                  {selectedPlan.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                aria-label="Close modal"
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMsg ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-base font-medium text-white">{successMsg}</p>
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="mt-6 px-6 py-2.5 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {error && (
                  <div className="p-3 text-xs text-red-200 bg-red-950/60 border border-red-500/40">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="enq-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    id="enq-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="enq-phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      id="enq-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="enq-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Email Address *
                    </label>
                    <input
                      id="enq-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="enq-msg" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Message *
                  </label>
                  <textarea
                    id="enq-msg"
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#09090B] border border-white/15 text-white rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white border border-white/15 rounded-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] disabled:opacity-60 rounded-sm cursor-pointer"
                  >
                    {submitting ? 'Sending...' : 'Submit Enquiry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
