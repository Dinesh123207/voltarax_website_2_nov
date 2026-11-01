'use client';

export default function WindTurbineBackdrop() {
  return (
    <div className="wind-turbine-wrap" aria-hidden="true">
      <div className="wind-horizon" />
      <svg className="wind-turbine" viewBox="0 0 620 760" fill="none">
        <defs>
          <linearGradient id="tower" x1="310" y1="270" x2="310" y2="750" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d9fbe4" stopOpacity=".9" />
            <stop offset="1" stopColor="#315c40" stopOpacity=".12" />
          </linearGradient>
          <radialGradient id="hubGlow">
            <stop stopColor="#b7ffd0" stopOpacity=".95" />
            <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M298 286 L322 286 L405 748 L215 748 Z" fill="url(#tower)" opacity=".65"/>
        <path d="M306 286 L314 286 L354 748 L266 748 Z" fill="#ecfff3" opacity=".16"/>
        <circle cx="310" cy="282" r="72" fill="url(#hubGlow)" opacity=".22"/>
        <g className="turbine-rotor" transform="translate(310 282)">
          <circle r="12" fill="#eafff0"/>
          <path d="M0-10 C-16-100 20-190 58-238 C76-260 101-246 92-218 C72-157 25-78 10-3Z" fill="#d8ffe5" opacity=".9"/>
          <path d="M8 5 C95 21 177 78 217 122 C237 145 223 167 194 155 C132 128 64 72 3 18Z" fill="#d8ffe5" opacity=".72"/>
          <path d="M-6 7 C-72 67-143 104-203 111 C-234 114-244 88-219 72 C-164 37-79 4-10-5Z" fill="#d8ffe5" opacity=".62"/>
        </g>
        <path d="M305 748 H315" stroke="#d8ffe5" strokeWidth="6" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
