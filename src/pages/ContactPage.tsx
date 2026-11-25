import { useState, type FormEvent } from 'react';
import { CheckCircle2, MessageSquare, Send } from 'lucide-react';
import type { BusinessSettings } from '../types';
import { LocationSection } from '../components/LocationSection';
import { api, cleanWhatsAppUrl } from '../lib/api';

interface ContactPageProps {
  settings: BusinessSettings | null;
  onBookClick: () => void;
}

export function ContactPage({ settings, onBookClick }: ContactPageProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const whatsappUrl = settings?.whatsapp_number
    ? cleanWhatsAppUrl(
        settings.whatsapp_number,
        'Hello Play on Fitness JP Nagar, I have an enquiry.'
      )
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitEnquiry({
        type: 'contact',
        name,
        phone,
        email,
        message,
      });
      setSubmitted(true);
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#09090B] min-h-screen">
      <section className="py-16 sm:py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
            Contact &amp; Enquiries
          </p>
          <h1
            className="font-display font-bold text-white tracking-tight text-balance"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            Connect with Play on Fitness JP Nagar
          </h1>
          <p className="mt-4 text-base text-zinc-300 max-w-2xl leading-relaxed">
            Have a question about facility access, coaching slots, or memberships? Send a message
            directly to our team or visit us on 100 Feet Ring Road near Delmia Circle.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Contact Form */}
            <div className="lg:col-span-7 bg-[#12141A] border border-white/10 p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold text-white">Send an Enquiry</h2>
              <p className="mt-1 text-sm text-zinc-400">
                All messages are recorded directly for Play on Fitness management review.
              </p>

              {submitted ? (
                <div className="mt-8 p-6 bg-[#09090B] border border-emerald-500/30 text-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white">Message Sent</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Thank you for reaching out. Our team will respond using your contact details.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-5 px-5 py-2 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  {error && (
                    <div className="p-3 text-xs text-red-200 bg-red-950/60 border border-red-500/40">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white placeholder:text-zinc-600 rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 ..."
                        className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white placeholder:text-zinc-600 rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white placeholder:text-zinc-600 rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-msg" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Message *
                    </label>
                    <textarea
                      id="contact-msg"
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help you?"
                      className="w-full px-4 py-3 text-sm bg-[#09090B] border border-white/15 text-white placeholder:text-zinc-600 rounded-sm focus:outline-none focus:border-[#FF5A1F]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] disabled:opacity-60 rounded-sm transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Direct WhatsApp & Quick Booking Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#12141A] border border-white/10 p-6 sm:p-8">
                <h2 className="font-display text-2xl font-bold text-white">WhatsApp Enquiry</h2>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Prefer messaging directly on WhatsApp? Use the quick chat link once the verified
                  business WhatsApp number is configured by management.
                </p>

                <div className="mt-6">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      Message on WhatsApp
                    </a>
                  ) : (
                    <div className="p-4 bg-[#09090B] border border-white/10 text-xs text-zinc-400">
                      WhatsApp contact number is pending verification by Play on Fitness ownership
                      (configurable in Admin Settings). Please use the enquiry form on the left.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#12141A] border border-white/10 p-6 sm:p-8">
                <h2 className="font-display text-2xl font-bold text-white">Ready to Train?</h2>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Check live time slots and reserve your session online in under two minutes.
                </p>
                <button
                  type="button"
                  onClick={onBookClick}
                  className="mt-5 w-full py-3 px-5 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer"
                >
                  Book Your Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LocationSection settings={settings} />
    </div>
  );
}
