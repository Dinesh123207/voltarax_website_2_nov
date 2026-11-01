'use client';
import { useState } from 'react';
import { useCopy } from '@/i18n/copy';


/**
 * Site-wide background video, sat behind everything else (ParticlesBg is
 * z-0, page content is z-10 — this is -z-10). A dark gradient overlay keeps
 * it translucent enough that text stays legible on top, matching the rest
 * of the dark theme.
 *
 * No video ships with the repo — add your own royalty-free renewable-energy
 * clip (wind turbines / solar farm b-roll) at:
 *   public/media/renewable-bg.mp4        (required to actually see a video)
 *   public/media/renewable-bg-poster.jpg (shown while it loads, optional)
 * Free sources: pexels.com/videos, pixabay.com/videos, coverr.co — search
 * "wind turbine" or "solar panel". Until a file exists at that path, this
 * silently falls back to the plain dark background already on <body>, no
 * broken video icon shown.
 *
 * Respects prefers-reduced-motion (motion-reduce:hidden) — those users get
 * the static overlay/background only, no autoplaying video.
 */
export default function SiteBackgroundVideo() {
  const copyText = useCopy();
  const [failed, setFailed] = useState(false);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0a0f0d]" aria-hidden="true">
      {copyText(!failed && (
        <video
          className="w-full h-full object-cover opacity-40 motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/media/renewable-bg-poster.jpg"
          onError={() => setFailed(true)}
        >
          <source src="/media/renewable-bg.mp4" type="video/mp4" />
        </video>
      ))}
      {/* Dark translucent overlay — keeps the video from ever fighting with
          foreground text/contrast, and IS the whole background when no
          video file has been added yet. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0d]/80 via-[#0a0f0d]/70 to-[#0a0f0d]" />
    </div>
  );
}
