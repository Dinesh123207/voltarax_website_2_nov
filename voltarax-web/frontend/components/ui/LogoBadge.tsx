'use client';
import { useState } from 'react';

/**
 * Same idea as AvatarImage but for institution/client logos: shows
 * /public<src> if it loads, otherwise a plain text wordmark. Nobody's real
 * logo is fabricated — this is a placeholder until the real file is added.
 */
export default function LogoBadge({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="h-16 px-6 flex items-center justify-center rounded-xl border border-green-900/30 bg-[#111a14]">
        <span className="text-slate-300 font-semibold tracking-wide text-sm sm:text-base">{name}</span>
      </div>
    );
  }

  return (
    <div className="h-16 px-6 flex items-center justify-center rounded-xl border border-green-900/30 bg-[#111a14]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name} logo`}
        onError={() => setFailed(true)}
        className="max-h-10 max-w-full object-contain"
      />
    </div>
  );
}
