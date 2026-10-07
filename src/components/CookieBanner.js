import React, { useEffect, useState } from 'react';
import { getConsent, setConsent, onConsentChange } from '../lib/consent';

// A small bar at the bottom of the screen, shown until the person makes a choice.
// "Cookie settings" in the footer clears the choice, which brings the bar back.
export default function CookieBanner() {
  const [choice, setChoice] = useState(getConsent());

  useEffect(() => onConsentChange(() => setChoice(getConsent())), []);

  if (choice) return null;

  return (
    <div style={s.bar} role="region" aria-label="Cookie choice">
      <p style={s.text}>
        We use cookies to keep you logged in, and, if you allow it, Google Analytics to see how PM Buddy is used.{' '}
        <a href="/privacy.html#cookies" style={s.link} target="_blank" rel="noopener noreferrer">Read more</a>
      </p>
      <div style={s.buttons}>
        <button type="button" style={s.decline} onClick={() => setConsent('declined')}>Decline</button>
        <button type="button" style={s.accept} onClick={() => setConsent('accepted')}>Accept</button>
      </div>
    </div>
  );
}

const s = {
  bar: { position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 10001, maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--shadow-lg)' },
  text: { fontSize: 14, lineHeight: 1.55, color: 'var(--text)', flex: '1 1 260px', margin: 0 },
  link: { color: 'var(--accent-text)', fontWeight: 600 },
  buttons: { display: 'flex', gap: 8, flexShrink: 0 },
  decline: { padding: '10px 18px', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 },
  accept: { padding: '10px 20px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 },
};
