import React from 'react';

export interface UlilMartLogoProps {
  /**
   * 'full': Complete logo with 'ULIL Mart' and 'Lengkap & Hemat' banner
   * 'horizontal': Same full logo formatted for horizontal toolbars
   * 'mark': Iconic monogram mark for small buttons, avatars & favicons
   * 'receipt': High-contrast monochrome black-and-white for thermal receipts
   */
  variant?: 'full' | 'horizontal' | 'mark' | 'receipt';
  /**
   * 'light': Light background colors (dark petrol blue logo)
   * 'dark': Dark background adaptation (enhanced contrast/glow)
   * 'auto': Uses currentColor or adapts smoothly to dark/light mode
   * 'monochrome': Pure black for thermal printing
   */
  theme?: 'light' | 'dark' | 'auto' | 'monochrome';
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const UlilMartLogo: React.FC<UlilMartLogoProps> = ({
  variant = 'full',
  theme = 'auto',
  className = '',
  width,
  height,
}) => {
  // If variant is 'mark', render the compact geometric ULIL symbol
  if (variant === 'mark') {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
        style={{
          width: width ?? (height ? undefined : '2.5rem'),
          height: height ?? (width ? undefined : '2.5rem'),
          aspectRatio: '1 / 1',
        }}
      >
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="ULIL Mart Logo Mark"
        >
          <defs>
            <linearGradient id="ulilMarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A92C5" />
              <stop offset="48%" stopColor="#2A6897" />
              <stop offset="52%" stopColor="#1C527B" />
              <stop offset="100%" stopColor="#153E5E" />
            </linearGradient>
            <linearGradient id="ulilGlossMark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Rounded Container */}
          <rect width="160" height="160" rx="36" fill="url(#ulilMarkGrad)" />

          {/* Gloss Top Sheen */}
          <path
            d="M 14 36 C 44 20, 116 20, 146 36 L 146 76 C 100 66, 60 70, 14 82 Z"
            fill="url(#ulilGlossMark)"
          />

          {/* Letter U and L Geometric Shapes inside mark */}
          <g fill="#FFFFFF" transform="translate(24, 34) scale(0.68)">
            {/* U */}
            <path d="M 0 0 L 32 0 L 32 72 L 68 72 L 68 0 L 100 0 L 100 86 C 100 108, 86 122, 64 122 L 28 122 C 10 122, 0 108, 0 86 Z" />
            {/* L */}
            <path d="M 112 0 L 144 0 L 144 88 L 186 88 L 186 122 L 112 122 Z" />
          </g>

          {/* Subtext 'Mart' */}
          <text
            x="136"
            y="140"
            textAnchor="end"
            fontFamily="'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive, sans-serif"
            fontSize="28"
            fontWeight="bold"
            fontStyle="italic"
            fill="#BAE6FD"
          >
            Mart
          </text>
        </svg>
      </div>
    );
  }

  // If variant is 'receipt', render high-contrast black/white vector for thermal paper
  if (variant === 'receipt') {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
        style={{
          width: width ?? '180px',
          height: height ?? 'auto',
          aspectRatio: '540 / 215',
          maxWidth: '100%',
        }}
      >
        <svg
          viewBox="0 0 540 215"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="ULIL Mart Struk Kasir"
        >
          <g fill="#000000">
            {/* ULIL Letters in solid black */}
            {/* U */}
            <path d="M 20 22 L 52 22 L 52 84 L 84 84 L 84 22 L 116 22 L 116 92 C 116 108, 102 120, 84 120 L 44 120 L 20 96 Z" />
            {/* L */}
            <path d="M 128 22 L 160 22 L 160 88 L 206 88 L 206 120 L 128 120 Z" />
            {/* I */}
            <rect x="218" y="22" width="30" height="98" rx="1" />
            {/* L */}
            <path d="M 260 22 L 292 22 L 292 88 L 338 88 L 338 120 L 260 120 Z" />

            {/* Script 'Mart' with ample breathing room */}
            <text
              x="355"
              y="108"
              fontFamily="'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive, sans-serif"
              fontSize="78"
              fontWeight="bold"
              fontStyle="italic"
            >
              Mart
            </text>

            {/* Banner 'Lengkap' filled box */}
            <rect x="20" y="142" width="220" height="48" rx="3" />
            <text
              x="130"
              y="174"
              textAnchor="middle"
              fontFamily="'Montserrat', 'Century Gothic', sans-serif"
              fontSize="24"
              fontWeight="900"
              fill="#FFFFFF"
              letterSpacing="1"
            >
              LENGKAP
            </text>

            {/* Banner '& Hemat' outline box */}
            <rect x="240" y="142" width="260" height="48" rx="3" stroke="#000000" strokeWidth="3.5" fill="none" />
            <text
              x="370"
              y="174"
              textAnchor="middle"
              fontFamily="'Montserrat', 'Century Gothic', sans-serif"
              fontSize="24"
              fontWeight="900"
              letterSpacing="1"
            >
              &amp; HEMAT
            </text>
          </g>
        </svg>
      </div>
    );
  }

  // Full / Horizontal Brand Logo (Default)
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: width ?? 'auto',
        height: height ?? 'auto',
        aspectRatio: '560 / 226',
        maxWidth: '100%',
      }}
    >
      <svg
        viewBox="0 0 560 226"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ULIL Mart - Lengkap & Hemat"
      >
        <defs>
          {/* Main Metallic Steel Blue Gradient for 'ULIL' */}
          <linearGradient id="ulilLetterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A93C6" />
            <stop offset="47%" stopColor="#2E71A3" />
            <stop offset="50%" stopColor="#1E5782" />
            <stop offset="100%" stopColor="#164366" />
          </linearGradient>

          {/* Lighter variant for dark mode highlights */}
          <linearGradient id="ulilLetterGradDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67B1E4" />
            <stop offset="47%" stopColor="#3B87C0" />
            <stop offset="50%" stopColor="#28699B" />
            <stop offset="100%" stopColor="#1E527B" />
          </linearGradient>

          {/* Gloss Top Specular Reflection */}
          <linearGradient id="ulilGlossTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
            <stop offset="68%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>

          {/* Drop shadow filter with generous bounds to prevent clipping */}
          <filter id="ulilShadow" x="-10%" y="-10%" width="125%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.2" />
          </filter>
        </defs>

        <g filter="url(#ulilShadow)">
          {/* ============================================================== */}
          {/* 1. GEOMETRIC BOLD LETTERS 'ULIL'                                */}
          {/* ============================================================== */}
          <g fill="url(#ulilLetterGrad)">
            {/* --- U --- */}
            {/* Base block letter U with angled chamfer at bottom left */}
            <path
              d="M 20 22 
                 L 54 22 
                 L 54 88 
                 L 88 88 
                 L 88 22 
                 L 122 22 
                 L 122 96 
                 C 122 114, 108 126, 88 126 
                 L 44 126 
                 L 20 102 
                 Z"
            />

            {/* --- L (First) --- */}
            {/* Bold Block L */}
            <path
              d="M 134 22 
                 L 168 22 
                 L 168 92 
                 L 214 92 
                 L 214 126 
                 L 134 126 
                 Z"
            />

            {/* --- I --- */}
            {/* Bold Block I bar */}
            <path
              d="M 226 22 
                 L 260 22 
                 L 260 126 
                 L 226 126 
                 Z"
            />

            {/* --- L (Second) --- */}
            {/* Matching Bold Block L */}
            <path
              d="M 272 22 
                 L 306 22 
                 L 306 92 
                 L 352 92 
                 L 352 126 
                 L 272 126 
                 Z"
            />
          </g>

          {/* Horizontal Gloss Reflection sheen line across ULIL */}
          <path
            d="M 20 22 L 122 22 L 122 68 C 104 60, 36 64, 20 68 Z
               M 134 22 L 168 22 L 168 68 C 150 62, 134 65, 134 68 Z
               M 226 22 L 260 22 L 260 68 C 244 62, 226 65, 226 68 Z
               M 272 22 L 306 22 L 306 68 C 290 62, 272 65, 272 68 Z"
            fill="url(#ulilGlossTop)"
          />

          {/* ============================================================== */}
          {/* 2. SCRIPT CALLIGRAPHIC 'Mart'                                   */}
          {/* ============================================================== */}
          <g transform="translate(365, 116) rotate(-3)">
            <text
              x="0"
              y="0"
              fontFamily="'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive, sans-serif"
              fontSize="82"
              fontWeight="bold"
              fontStyle="italic"
              fill="#276A9C"
              letterSpacing="1"
              className="dark:fill-[#4A99D4]"
            >
              Mart
            </text>
          </g>

          {/* ============================================================== */}
          {/* 3. TAGLINE BANNER: [Lengkap] | [& Hemat]                       */}
          {/* ============================================================== */}
          <g transform="translate(20, 146)">
            {/* Left Box: Solid Deep Blue with White 'Lengkap' */}
            <rect
              x="0"
              y="0"
              width="230"
              height="52"
              rx="4"
              fill="#205B85"
              className="dark:fill-[#1C5177]"
            />
            <text
              x="115"
              y="35"
              textAnchor="middle"
              fontFamily="'Montserrat', 'Century Gothic', -apple-system, sans-serif"
              fontSize="28"
              fontWeight="900"
              fill="#FFFFFF"
              letterSpacing="1.5"
            >
              Lengkap
            </text>

            {/* Right Box: Framed Border with '& Hemat' */}
            <rect
              x="230"
              y="0"
              width="260"
              height="52"
              rx="4"
              stroke="#205B85"
              strokeWidth="3.5"
              fill="#FFFFFF"
              className="dark:fill-slate-900/95 dark:stroke-[#3B82B6]"
            />
            <text
              x="360"
              y="35"
              textAnchor="middle"
              fontFamily="'Montserrat', 'Century Gothic', -apple-system, sans-serif"
              fontSize="28"
              fontWeight="900"
              fill="#205B85"
              letterSpacing="1.5"
              className="dark:fill-[#4BA0DB]"
            >
              &amp; Hemat
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};
