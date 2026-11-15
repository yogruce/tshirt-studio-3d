function svgToDataUrl(svgString) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString.trim());
}

export const PRESET_DESIGNS = [
  {
    id: 'holiday_chest_badge',
    name: 'Yılbaşı Göğüs Arması',
    defaultPiece: 'front',
    defaultU: 0.342,
    defaultV: 0.565,
    defaultW: 0.082,
    defaultH: 0.095,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 300">
        <!-- Ripped Paper Burst Outer -->
        <polygon points="130,18 158,38 192,28 202,62 236,78 220,115 245,148 222,182 238,218 202,235 190,268 154,255 130,282 104,255 68,268 58,232 22,218 38,180 15,148 40,115 24,78 58,62 68,28 102,38" fill="#f7f4e9" stroke="#8a5a36" stroke-width="5"/>
        <polygon points="130,36 154,52 182,45 190,74 218,88 205,118 226,148 206,176 218,205 188,220 178,248 150,238 130,260 110,238 82,248 72,220 42,205 54,176 34,148 55,118 42,88 70,74 78,45 106,52" fill="#2c1d14"/>
        <!-- Green Character Face -->
        <ellipse cx="130" cy="168" rx="56" ry="62" fill="#9cd323" stroke="#1e2908" stroke-width="4.5"/>
        <!-- Cheek / Chin Fur Tufts -->
        <path d="M74,162 L54,155 L70,174 L50,178 L74,190 Z" fill="#9cd323" stroke="#1e2908" stroke-width="4"/>
        <path d="M186,162 L206,155 L190,174 L210,178 L186,190 Z" fill="#9cd323" stroke="#1e2908" stroke-width="4"/>
        <!-- Mischievous Eyebrows & Yellow/Red Eyes -->
        <path d="M90,136 Q112,152 124,142" fill="none" stroke="#1e2908" stroke-width="6" stroke-linecap="round"/>
        <path d="M170,136 Q148,152 136,142" fill="none" stroke="#1e2908" stroke-width="6" stroke-linecap="round"/>
        <ellipse cx="106" cy="156" rx="14" ry="10" fill="#fde047" stroke="#1e2908" stroke-width="3.5"/>
        <ellipse cx="154" cy="156" rx="14" ry="10" fill="#fde047" stroke="#1e2908" stroke-width="3.5"/>
        <circle cx="109" cy="156" r="4.5" fill="#dc2626"/>
        <circle cx="151" cy="156" r="4.5" fill="#dc2626"/>
        <!-- Nose & Grin -->
        <path d="M124,172 Q130,165 136,172 Q130,180 124,172 Z" fill="#3f6212" stroke="#1e2908" stroke-width="3"/>
        <path d="M88,188 Q130,224 172,188" fill="none" stroke="#1e2908" stroke-width="5" stroke-linecap="round"/>
        <path d="M108,200 Q130,226 152,200 Z" fill="#dc2626" stroke="#1e2908" stroke-width="3.5"/>
        <!-- Santa Hat -->
        <path d="M72,118 Q128,15 176,32 Q212,75 215,152 L192,152 Q184,96 152,72 Z" fill="#dc2626" stroke="#1e2908" stroke-width="4.5"/>
        <!-- White Fluffy Hat Trim -->
        <rect x="64" y="102" width="132" height="32" rx="16" fill="#ffffff" stroke="#1e2908" stroke-width="4.5"/>
        <circle cx="204" cy="162" r="18" fill="#ffffff" stroke="#1e2908" stroke-width="4.5"/>
      </svg>
    `)
  },
  {
    id: 'holiday_back_graphic',
    name: 'Merry Rebel Sırt Baskısı',
    defaultPiece: 'back',
    defaultU: 0.722,
    defaultV: 0.725,
    defaultW: 0.245,
    defaultH: 0.420,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 680">
        <!-- Curved Top MERRY Text -->
        <path id="curveTop" d="M 85,115 Q 210,55 335,115" fill="none"/>
        <text fill="#f8fafc" font-family="Oswald, Impact, sans-serif" font-size="44" font-weight="700" letter-spacing="8">
          <textPath href="#curveTop" startOffset="50%" text-anchor="middle">MERRY</textPath>
        </text>
        <!-- Main Bold Headline -->
        <text x="210" y="196" text-anchor="middle" fill="#f8fafc" font-family="Oswald, Impact, sans-serif" font-size="88" font-weight="700" letter-spacing="4">REBEL</text>
        <text x="306" y="246" text-anchor="middle" fill="#f8fafc" font-family="Oswald, Impact, sans-serif" font-size="30" font-weight="700" letter-spacing="6">CHRISTMAS</text>
        <!-- Green Cartoon Hand & Santa Cuff -->
        <g stroke="#1a2408" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
          <!-- Forearm -->
          <path d="M168,465 L155,580 L255,580 L242,465 Z" fill="#95c922"/>
          <!-- Raised Center Finger / Gesture -->
          <path d="M150,470 C125,435 122,360 155,345 C165,315 178,125 198,118 C218,125 222,310 226,340 C248,335 268,365 264,395 C292,390 335,365 362,362 C335,400 296,435 242,470 Z" fill="#95c922"/>
          <!-- Knuckle Fold Lines -->
          <path d="M148,375 C165,365 182,375 180,405" fill="none"/>
          <path d="M220,365 C238,360 252,375 245,405" fill="none"/>
          <path d="M175,425 Q205,442 238,425" fill="none"/>
          <!-- White Fur Cuff -->
          <path d="M132,568 Q145,548 168,560 Q190,545 212,560 Q235,545 258,560 Q282,552 288,582 Q292,612 265,615 Q240,625 212,614 Q185,625 158,614 Q128,612 132,568 Z" fill="#f4f4f0"/>
          <!-- Red Sleeve Bottom -->
          <path d="M150,612 L166,675 L254,675 L270,612 Z" fill="#b91c1c"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'tokyo_cyber_wave',
    name: 'Tokyo Streetwear Print',
    defaultPiece: 'back',
    defaultU: 0.722,
    defaultV: 0.680,
    defaultW: 0.230,
    defaultH: 0.300,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
        <rect x="24" y="24" width="352" height="452" rx="8" fill="#111315" stroke="#f4f4f0" stroke-width="6"/>
        <circle cx="200" cy="205" r="108" fill="#ef4444"/>
        <!-- Stylized Wave Bars -->
        <path d="M70,245 Q135,205 200,245 T330,245" fill="none" stroke="#f4f4f0" stroke-width="10"/>
        <path d="M70,275 Q135,235 200,275 T330,275" fill="none" stroke="#f4f4f0" stroke-width="10"/>
        <path d="M70,305 Q135,265 200,305 T330,305" fill="none" stroke="#111315" stroke-width="12"/>
        <text x="200" y="92" text-anchor="middle" fill="#f4f4f0" font-family="Oswald, sans-serif" font-size="42" font-weight="700" letter-spacing="10">NEO TOKYO</text>
        <text x="200" y="388" text-anchor="middle" fill="#a6c83b" font-family="JetBrains Mono, monospace" font-size="28" font-weight="700" letter-spacing="4">東京 · ARCHIVE 04</text>
        <text x="200" y="432" text-anchor="middle" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="600" letter-spacing="6">HEAVYWEIGHT GARMENT LAB</text>
      </svg>
    `)
  },
  {
    id: 'streetwear_crest',
    name: 'Minimalist Göğüs Logosu',
    defaultPiece: 'front',
    defaultU: 0.340,
    defaultV: 0.560,
    defaultW: 0.080,
    defaultH: 0.080,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
        <circle cx="120" cy="120" r="102" fill="none" stroke="#f8fafc" stroke-width="8"/>
        <circle cx="120" cy="120" r="84" fill="none" stroke="#a6c83b" stroke-width="3" stroke-dasharray="10 6"/>
        <polygon points="120,48 178,162 62,162" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linejoin="round"/>
        <circle cx="120" cy="128" r="18" fill="#a6c83b"/>
        <text x="120" y="196" text-anchor="middle" fill="#f8fafc" font-family="Oswald, sans-serif" font-size="22" font-weight="700" letter-spacing="5">STUDIO 3D</text>
      </svg>
    `)
  },
  {
    id: 'acid_smile',
    name: 'Acid Streetwear Smile',
    defaultPiece: 'front',
    defaultU: 0.277,
    defaultV: 0.620,
    defaultW: 0.140,
    defaultH: 0.140,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260">
        <circle cx="130" cy="130" r="112" fill="#eab308" stroke="#111315" stroke-width="10"/>
        <path d="M82,82 L106,106 M106,82 L82,106" stroke="#111315" stroke-width="10" stroke-linecap="round"/>
        <path d="M154,82 L178,106 M178,82 L154,106" stroke="#111315" stroke-width="10" stroke-linecap="round"/>
        <path d="M68,148 Q130,218 192,148" fill="none" stroke="#111315" stroke-width="10" stroke-linecap="round"/>
        <line x1="60" y1="142" x2="78" y2="156" stroke="#111315" stroke-width="9" stroke-linecap="round"/>
        <line x1="200" y1="142" x2="182" y2="156" stroke="#111315" stroke-width="9" stroke-linecap="round"/>
      </svg>
    `)
  },
  {
    id: 'sleeve_badge',
    name: 'Kol & Omuz Arması',
    defaultPiece: 'right_sleeve',
    defaultU: 0.305,
    defaultV: 0.245,
    defaultW: 0.065,
    defaultH: 0.065,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">
        <rect x="20" y="20" width="180" height="180" rx="28" fill="#18181b" stroke="#a6c83b" stroke-width="8"/>
        <text x="110" y="108" text-anchor="middle" fill="#ffffff" font-family="Oswald, sans-serif" font-size="56" font-weight="700">99</text>
        <text x="110" y="156" text-anchor="middle" fill="#a6c83b" font-family="JetBrains Mono, monospace" font-size="22" font-weight="700" letter-spacing="3">LIMITED</text>
      </svg>
    `)
  }
];
