import React from 'react';

// One icon family for the whole app, drawn on a 24px grid with a rounded stroke.
// Each icon is a list of shapes: ['p', d] path, ['c', cx, cy, r] circle, ['r', x, y, w, h, rx] rectangle.
const ICONS = {
  logo: [['c', 12, 12, 8, 0.28], ['p', 'M12 4a8 8 0 1 1-8 8'], ['p', 'M8.6 12.4l2.4 2.4 4.2-4.8']],
  check: [['p', 'M5 12.5l4.5 4.5L19 7.5']],
  'check-circle': [['c', 12, 12, 9], ['p', 'M8 12.5l2.7 2.7L16 9.5']],
  x: [['p', 'M6 6l12 12M18 6L6 18']],
  plus: [['p', 'M12 5v14M5 12h14']],
  'arrow-right': [['p', 'M5 12h14M13 6l6 6-6 6']],
  'arrow-left': [['p', 'M19 12H5M11 6l-6 6 6 6']],
  'arrow-up': [['p', 'M12 19V5M6 11l6-6 6 6']],
  'arrow-down': [['p', 'M12 5v14M6 13l6 6 6-6']],
  'chevron-down': [['p', 'M6 9l6 6 6-6']],
  'chevron-up': [['p', 'M6 15l6-6 6 6']],
  'chevron-right': [['p', 'M9 6l6 6-6 6']],
  upload: [['p', 'M12 16V4M12 4l-4 4M12 4l4 4'], ['p', 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3']],
  download: [['p', 'M12 4v12M12 16l-4-4M12 16l4-4'], ['p', 'M4 20h16']],
  file: [['p', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z'], ['p', 'M14 3v5h5M9 13h6M9 17h4']],
  clipboard: [['p', 'M9 4h6v3H9z'], ['p', 'M7 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1'], ['p', 'M9 12h6M9 16h4']],
  folder: [['p', 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z']],
  bell: [['p', 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z'], ['p', 'M10 20a2 2 0 0 0 4 0']],
  chart: [['p', 'M4 20V4M4 20h16'], ['p', 'M8 15l3-4 3 2 4-6']],
  users: [['c', 9, 8, 3.2], ['p', 'M3 20a6 6 0 0 1 12 0'], ['c', 17, 9, 2.5], ['p', 'M17 14a5 5 0 0 1 4 5']],
  user: [['c', 12, 8, 3.6], ['p', 'M5 20a7 7 0 0 1 14 0']],
  board: [['r', 3.5, 4, 5, 16, 1.2], ['r', 10, 4, 5, 10, 1.2], ['r', 16.5, 4, 4, 13, 1.2]],
  spark: [['p', 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'], ['p', 'M19 16v4M17 18h4']],
  calendar: [['r', 4, 5, 16, 15, 2], ['p', 'M4 10h16M9 3v4M15 3v4']],
  alert: [['p', 'M12 4l9 16H3z'], ['p', 'M12 10v4M12 17h.01']],
  blocked: [['c', 12, 12, 9], ['p', 'M5.6 5.6l12.8 12.8']],
  clock: [['c', 12, 12, 9], ['p', 'M12 7v5l3 2']],
  flag: [['p', 'M5 21V4M5 5h11l-2 4 2 4H5']],
  trash: [['p', 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13']],
  edit: [['p', 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z'], ['p', 'M13.5 7.5l3 3']],
  chat: [['p', 'M4 5h16v11H9l-5 4z']],
  refresh: [['p', 'M20 12a8 8 0 1 1-2.5-5.8'], ['p', 'M20 4v5h-5']],
  star: [['p', 'M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z']],
  bolt: [['p', 'M13 3L5 14h6l-1 7 8-11h-6z']],
  search: [['c', 11, 11, 6.5], ['p', 'M16.5 16.5L21 21']],
  info: [['c', 12, 12, 9], ['p', 'M12 11v5M12 8h.01']],
  settings: [['c', 12, 12, 3], ['p', 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1']],
  menu: [['p', 'M4 7h16M4 12h16M4 17h16']],
  home: [['p', 'M4 11l8-7 8 7'], ['p', 'M6 10v10h12V10']],
  sun: [['c', 12, 12, 4], ['p', 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4']],
  moon: [['p', 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z']],
  auto: [['c', 12, 12, 8], ['p', 'M12 4a8 8 0 0 1 0 16z', 'fill']],
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, style, title, filled = false }) {
  const shapes = ICONS[name];
  if (!shapes) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      {title ? <title>{title}</title> : null}
      {shapes.map((s, i) => {
        if (s[0] === 'p') return <path key={i} d={s[1]} fill={s[2] === 'fill' || filled ? 'currentColor' : 'none'} />;
        if (s[0] === 'c') return <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} opacity={s[4]} fill={filled ? 'currentColor' : undefined} />;
        return <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} />;
      })}
    </svg>
  );
}

// For components that use React.createElement instead of JSX.
export function icon(name, size, style) {
  return React.createElement(Icon, { name, size, style });
}
