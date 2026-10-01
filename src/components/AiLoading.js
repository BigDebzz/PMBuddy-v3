import React, { useEffect, useState } from 'react';

const MESSAGES = {
  read: [
    'Reading your document...',
    'Finding your goals and milestones...',
    'Spotting risks worth watching...',
    'Working out who is involved...',
    'Putting it all together...',
  ],
  write: [
    'Gathering your project details...',
    'Choosing the right words...',
    'Writing your first draft...',
    'Polishing the wording...',
    'Nearly there...',
  ],
  think: [
    'Looking at your milestones...',
    'Checking what is on track...',
    'Weighing up the risks...',
    'Thinking about what to do next...',
  ],
};

const SLOW_HINT_AFTER = 12;
const VERY_SLOW_HINT_AFTER = 30;

// Friendly loading state for AI work.
// kind: 'read' | 'write' | 'think'. Pass `messages` to override the wording.
// compact: smaller version for use inside cards and buttons' neighbourhood.
export default function AiLoading({ kind = 'think', messages, title, compact = false }) {
  const lines = messages || MESSAGES[kind] || MESSAGES.think;
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const rotate = setInterval(() => setIndex(i => (i + 1) % lines.length), 2600);
    const clock = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { clearInterval(rotate); clearInterval(clock); };
  }, [lines.length]);

  const hint = seconds >= VERY_SLOW_HINT_AFTER
    ? 'Still working. Longer documents can take up to a minute.'
    : seconds >= SLOW_HINT_AFTER
      ? 'This one is a bit bigger. Thanks for waiting.'
      : null;

  const size = compact ? 56 : 88;

  return (
    <div className="pmb-motion" role="status" aria-live="polite" style={{ ...s.wrap, padding: compact ? '20px 16px' : '36px 24px' }}>
      <div style={{ ...s.orbitBox, width: size, height: size }} aria-hidden="true">
        <div style={{ ...s.orbit, animation: 'pmb-orbit 3.2s linear infinite' }}>
          <span style={{ ...s.planet, top: 0, left: '50%', background: 'var(--color-primary)' }} />
        </div>
        <div style={{ ...s.orbit, inset: size * 0.14, animation: 'pmb-orbit 2.2s linear infinite reverse' }}>
          <span style={{ ...s.planet, width: 8, height: 8, top: 0, left: '50%', background: 'var(--color-primary-border)' }} />
        </div>
        <div style={{ ...s.core, inset: size * 0.32, animation: 'pmb-breathe 2s ease-in-out infinite' }} />
      </div>

      {title && <p style={s.title}>{title}</p>}

      <p key={index} style={{ ...s.message, fontSize: compact ? 14 : 16, animation: 'pmb-message 2.6s ease-in-out forwards' }}>
        {lines[index]}
      </p>

      <div style={s.track} aria-hidden="true">
        <div style={{ ...s.bar, animation: 'pmb-bar 1.6s ease-in-out infinite' }} />
      </div>

      <p style={s.hint}>{hint || ' '}</p>
    </div>
  );
}

// Three bouncing dots for chat-style waiting.
export function TypingDots() {
  return (
    <span className="pmb-motion" role="status" aria-label="PM Buddy is thinking" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)',
          animation: `pmb-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </span>
  );
}

const s = {
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  },
  orbitBox: { position: 'relative', marginBottom: 20 },
  orbit: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1px dashed var(--color-primary-border)' },
  planet: { position: 'absolute', width: 12, height: 12, borderRadius: '50%', transform: 'translate(-50%, -50%)' },
  core: { position: 'absolute', borderRadius: '50%', background: 'var(--color-primary-tint)', border: '2px solid var(--color-primary)' },
  title: { margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--color-text)' },
  message: { margin: '0 0 16px', minHeight: 24, fontWeight: 500, color: 'var(--color-text)' },
  track: { width: '100%', maxWidth: 240, height: 4, borderRadius: 999, background: 'var(--color-primary-tint)', overflow: 'hidden' },
  bar: { width: '40%', height: '100%', borderRadius: 999, background: 'var(--color-primary)' },
  hint: { margin: '12px 0 0', fontSize: 14, color: 'var(--color-text-muted)', minHeight: 20 },
};
