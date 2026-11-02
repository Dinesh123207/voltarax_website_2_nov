import Image from 'next/image';

/** Legacy opt-in backdrop now uses the reviewed original poster, without missing media. */
export default function SiteBackgroundVideo() {
  return <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0a0f0d]" aria-hidden="true">
    <Image src="/media/system-flow-poster.svg" alt="" fill unoptimized className="object-cover opacity-10"/>
    <div className="absolute inset-0 bg-[#0a0f0d]/90"/>
  </div>;
}
