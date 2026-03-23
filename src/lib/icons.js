// src/lib/icons.js
import React from 'react';

const icon = (paths, opts = {}) => {
  const { viewBox = '0 0 24 24', fill = 'none', stroke = 'currentColor', strokeWidth = 2 } = opts;
  return ({ size = 20, color, style = {} }) => (
    <svg
      width={size} height={size} viewBox={viewBox}
      fill={fill} stroke={color || stroke}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >
      {paths}
    </svg>
  );
};

export const ZapIcon = icon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />);

export const RocketIcon = icon(<>
  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
</>);

export const ChevronRightIcon = icon(<>
  <path d="m9 18 6-6-6-6"/>
</>);

export const ChevronLeftIcon = icon(<>
  <path d="m15 18-6-6 6-6"/>
</>);

export const ArrowRightIcon = icon(<>
  <path d="M5 12h14"/>
  <path d="m12 5 7 7-7 7"/>
</>);

export const CheckIcon = icon(<>
  <polyline points="20 6 9 17 4 12"/>
</>, { strokeWidth: 2.5 });

export const AlertIcon = icon(<>
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <line x1="12" y1="16" x2="12.01" y2="16"/>
</>);

export const HelpIcon = icon(<>
  <circle cx="12" cy="12" r="10"/>
  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
  <line x1="12" y1="17" x2="12.01" y2="17"/>
</>);

export const StarIcon = icon(<>
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
</>, { strokeWidth: 1.5 });

export const TrendingUpIcon = icon(<>
  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
  <polyline points="17 6 23 6 23 12"/>
</>);

export const UsersIcon = icon(<>
  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</>);

export const LogoIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <rect width="36" height="36" rx="10" fill="#0A0A0A"/>
    <path d="M10 12h16M10 18h11M10 24h13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="25" cy="24" r="3.5" fill="#2563EB"/>
  </svg>
);
