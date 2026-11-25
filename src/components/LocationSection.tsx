import { useState } from 'react';
import { Clock, Copy, Check, ExternalLink, MapPin, Phone, Mail, MessageSquare } from 'lucide-react';
import type { BusinessSettings } from '../types';
import { cleanWhatsAppUrl, formatTime12h } from '../lib/api';

interface LocationSectionProps {
  settings: BusinessSettings | null;
  onBookClick?: () => void;
}

export function LocationSection({ settings, onBookClick }: LocationSectionProps) {
  const [copied, setCopied] = useState(false);

  const fullAddress = settings
    ? `${settings.address}, ${settings.city}, ${settings.state} ${settings.postal_code}`
    : '2nd Floor, 309, 100 Feet Ring Road, near Delmia Circle, JP Nagar, Bengaluru, Karnataka 560078';

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `Play on Fitness, ${fullAddress}`
  )}`;

  const monSat = settings
    ? `${formatTime12h(settings.mon_sat_open)} – ${formatTime12h(settings.mon_sat_close)}`
    : '5:30 AM – 10:00 PM';
  const sunday = settings
    ? `${formatTime12h(settings.sun_open)} – ${formatTime12h(settings.sun_close)}`
    : '6:30 AM – 1:00 PM';

  const whatsappUrl = settings?.whatsapp_number
    ? cleanWhatsAppUrl(
        settings.whatsapp_number,
        'Hello Play on Fitness JP Nagar, I would like to enquire about training and memberships.'
      )
    : null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in some contexts; ignore gracefully
    }
  };

  return (
    <section className="py-20 bg-[#0D0E12] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between bg-[#12141A] border border-white/10 p-6 sm:p-8">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#FF7833] mb-3">
                JP Nagar, Bengaluru
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance">
                Visit Play on Fitness
              </h2>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-[#FF6B2C] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Centre Address</h3>
                    <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{fullAddress}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Address Copied' : 'Copy Address'}
                      </button>
                      <a
                        href={mapsSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors"
                      >
                        Open in Google Maps
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 pt-6 border-t border-white/10">
                  <Clock className="w-5 h-5 text-[#FF6B2C] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="w-full">
                    <h3 className="text-sm font-semibold text-white">Opening Hours</h3>
                    <div className="mt-2 space-y-2 text-sm font-mono tabular-nums">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400 font-sans">Monday – Saturday</span>
                        <span className="text-zinc-100">{monSat}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400 font-sans">Sunday</span>
                        <span className="text-zinc-100">{sunday}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#FF6B2C] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-zinc-500">Phone</p>
                      {settings?.phone ? (
                        <a href={`tel:${settings.phone}`} className="text-zinc-200 hover:text-white font-mono tabular-nums">
                          {settings.phone}
                        </a>
                      ) : (
                        <p className="text-zinc-400 text-xs mt-0.5">Updated via Admin Settings</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#FF6B2C] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-zinc-500">Email</p>
                      {settings?.email ? (
                        <a href={`mailto:${settings.email}`} className="text-zinc-200 hover:text-white break-all">
                          {settings.email}
                        </a>
                      ) : (
                        <p className="text-zinc-400 text-xs mt-0.5">Updated via Admin Settings</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(whatsappUrl || onBookClick) && (
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-3">
                {onBookClick && (
                  <button
                    type="button"
                    onClick={onBookClick}
                    className="px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-[#FF5A1F] hover:bg-[#FF703B] rounded-sm transition-colors cursor-pointer"
                  >
                    Book a Session
                  </button>
                )}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-sm transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-[#FF6B2C]" aria-hidden="true" />
                    WhatsApp Enquiry
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Architectural JP Nagar / Delmia Circle Corridor Guide */}
          <div className="lg:col-span-6 bg-[#12141A] border border-white/10 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-mono text-zinc-400">CORRIDOR REFERENCE</p>
                  <h3 className="font-display text-2xl font-bold text-white mt-1">
                    100 Feet Ring Road · Delmia Circle
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#FF7833]">PIN 560078</span>
              </div>

              {/* Stylized street grid diagram */}
              <div className="relative bg-[#09090B] border border-white/10 p-6 min-h-[250px] flex flex-col justify-between">
                <svg
                  viewBox="0 0 600 260"
                  className="w-full h-48 sm:h-56"
                  role="img"
                  aria-label="Schematic street layout showing Play on Fitness on 100 Feet Ring Road near Delmia Circle in JP Nagar"
                >
                  {/* Background Grid */}
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="600" height="260" fill="url(#grid)" />

                  {/* 100 Feet Ring Road */}
                  <line x1="20" y1="130" x2="580" y2="130" stroke="#27272A" strokeWidth="22" />
                  <line x1="20" y1="130" x2="580" y2="130" stroke="#FF5A1F" strokeWidth="1.5" strokeDasharray="8 8" opacity="0.5" />

                  {/* Cross Road / JP Nagar access */}
                  <line x1="170" y1="20" x2="170" y2="240" stroke="#1F1F24" strokeWidth="14" />
                  <line x1="440" y1="20" x2="440" y2="240" stroke="#1F1F24" strokeWidth="12" />

                  {/* Delmia Circle roundabout */}
                  <circle cx="170" cy="130" r="24" fill="#09090B" stroke="#52525B" strokeWidth="3" />
                  <circle cx="170" cy="130" r="8" fill="#27272A" />

                  {/* Play on Fitness Marker */}
                  <circle cx="330" cy="100" r="18" fill="#FF5A1F" fillOpacity="0.18" />
                  <circle cx="330" cy="100" r="7" fill="#FF5A1F" />
                  <line x1="330" y1="100" x2="330" y2="130" stroke="#FF5A1F" strokeWidth="2" />

                  {/* Labels */}
                  <text x="170" y="176" textAnchor="middle" fill="#A1A1AA" fontSize="11" fontFamily="monospace">
                    DELMIA CIRCLE
                  </text>
                  <text x="485" y="114" textAnchor="middle" fill="#71717A" fontSize="10" fontFamily="monospace">
                    100 FT RING ROAD
                  </text>
                  <rect x="242" y="48" width="176" height="32" rx="2" fill="#18181B" stroke="#FF5A1F" strokeWidth="1" />
                  <text x="330" y="68" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="600" fontFamily="sans-serif">
                    PLAY ON FITNESS (2F, #309)
                  </text>
                </svg>

                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
                  <span>Landmark: Near Delmia Circle, 100 Feet Ring Road</span>
                  <span>2nd Floor, Building No. 309</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 text-xs text-zinc-400">
              <span>JP Nagar · Bengaluru 560078</span>
              <a
                href={mapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF7833] hover:text-[#FF945C] font-medium inline-flex items-center gap-1"
              >
                Get Directions
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
