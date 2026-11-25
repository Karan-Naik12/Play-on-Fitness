import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function ResilientImage({ src, alt, className = '', eager = false }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 text-zinc-500 p-6 text-center ${className}`}
      >
        <Dumbbell className="w-8 h-8 text-[#FF5A1F]/70 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-zinc-400 max-w-[20ch] truncate">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
