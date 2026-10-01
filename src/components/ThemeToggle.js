import React, { useEffect, useState } from 'react';
import Icon from './Icon';

const KEY = 'pmb-theme';

function readMode() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch { return 'auto'; }
}

function applyMode(mode) {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

const OPTIONS = [
  { id: 'light', icon: 'sun', label: 'Light' },
  { id: 'dark', icon: 'moon', label: 'Dark' },
  { id: 'auto', icon: 'auto', label: 'Auto' },
];

// Light, Dark or follow the device. The choice is remembered on this device.
export default function ThemeToggle({ showLabels = true }) {
  const [mode, setMode] = useState(readMode);

  useEffect(() => {
    applyMode(mode);
    try {
      if (mode === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch { /* storage can be unavailable; the choice then lasts for this visit only */ }
  }, [mode]);

  return (
    <div role="group" aria-label="Colour mode" style={s.wrap}>
      {OPTIONS.map(o => (
        <button
          key={o.id}
          type="button"
          aria-pressed={mode === o.id}
          aria-label={`${o.label} mode`}
          title={`${o.label} mode`}
          onClick={() => setMode(o.id)}
          style={{ ...s.btn, ...(mode === o.id ? s.on : null) }}
        >
          <Icon name={o.icon} size={16} />
          {showLabels && <span className="theme-label">{o.label}</span>}
        </button>
      ))}
    </div>
  );
}

const s = {
  wrap: { display: 'inline-flex', padding: 3, gap: 2, border: '1px solid var(--border)', borderRadius: 999, background: 'var(--surface)' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'none', color: 'var(--muted)', fontSize: 14, fontWeight: 600, padding: '7px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' },
  on: { background: 'var(--text)', color: 'var(--bg)' },
};
