'use client';
import { useLocale } from 'next-intl';

/** Original vector illustration; the quotation is attributed to its public source. */
export default function SustainabilityVision() {
  const hi = useLocale() === 'hi';
  return <section className="vision-section" aria-labelledby="vision-title">
    <div className="vision-art" aria-hidden="true">
      <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="vision-landscape">
        <defs>
          <linearGradient id="vision-sky" x2="0" y2="1"><stop stopColor="#092d36"/><stop offset=".62" stopColor="#176357"/><stop offset="1" stopColor="#d3a450"/></linearGradient>
          <radialGradient id="vision-glow"><stop stopColor="#ffdf93" stopOpacity=".65"/><stop offset="1" stopColor="#ffdf93" stopOpacity="0"/></radialGradient>
          <linearGradient id="vision-panel" x2="1" y2="1"><stop stopColor="#27858a"/><stop offset="1" stopColor="#0b2936"/></linearGradient>
        </defs>
        <path fill="url(#vision-sky)" d="M0 0h1200v600H0z"/><circle cx="850" cy="175" r="210" fill="url(#vision-glow)" className="vision-sun-glow"/><circle cx="850" cy="175" r="59" fill="#ffe4a1"/>
        <path fill="#143e3d" d="M0 345 190 230l170 108 180-127 180 130 180-102 300 130v231H0z"/><path fill="#092923" d="M0 413 230 307l245 142 198-105 192 85 150-95 185 97v169H0z"/>
        <g stroke="#b2f5dd" strokeWidth="3" fill="url(#vision-panel)" opacity=".92"><path d="M115 471 488 426 525 530 45 562z"/><path d="M560 415 877 390 1045 467 594 510z"/><path d="M119 468 50 560M235 455l-43 95m159-109-17 98m-250-42 426-38m-411 67 422-38M659 408l35 92m60-101 67 90m21-99 102 85m-363-36 372-31m-358 62 400-36" fill="none" opacity=".65"/></g>
        <path d="M0 575Q280 520 520 568T1200 535v65H0z" fill="#061a14"/>
      </svg>
    </div>
    <div className="vision-content">
      <p className="vision-kicker">{hi ? 'सतत भविष्य की ओर' : 'A vision for a sustainable future'}</p>
      <h2 id="vision-title">{hi ? 'एक सूर्य, एक विश्व, एक ग्रिड' : 'One Sun, One World, One Grid'}</h2>
      <p className="vision-attribution">{hi ? 'प्रधानमंत्री नरेंद्र मोदी द्वारा साझा किया गया सौर ऊर्जा का दृष्टिकोण' : 'A solar energy vision shared by Prime Minister Narendra Modi'}</p>
      <p className="vision-life">{hi ? 'मिशन LiFE · पर्यावरण के अनुकूल जीवनशैली' : 'Mission LiFE · Lifestyle for Environment'}</p>
      <a href="https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1798831&lang=2&reg=48" target="_blank" rel="noopener noreferrer">{hi ? 'आधिकारिक स्रोत पढ़ें' : 'Read the official source'} <span aria-hidden="true">↗</span></a>
    </div>
  </section>;
}
