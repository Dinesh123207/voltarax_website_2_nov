'use client';
import { useState } from 'react';

/**
 * Renders /public<src> if it loads; otherwise falls back to the gradient
 * initial badge every team card already used. No team photo is fabricated —
 * this only displays a file that's actually been added under public/team/.
 */
export default function AvatarImage({
  src, alt, initial, colorClass, size = 64,
}: {
  src?: string;
  alt: string;
  initial: string;
  colorClass: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center mx-auto mb-4 text-white text-2xl font-black shadow-lg group-hover:scale-105 transition-transform`}
        style={{ width: size, height: size }}
      >
        {initial}
      </div>
    );
  }

  return (
    // Plain <img>, not next/image: this project also serves photos the
    // owner may drop in post-deploy without a rebuild, which next/image's
    // build-time optimizer isn't a fit for.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-2xl mx-auto mb-4 object-cover shadow-lg group-hover:scale-105 transition-transform"
      style={{ width: size, height: size }}
    />
  );
}
