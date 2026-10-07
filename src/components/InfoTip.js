import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { GLOSSARY } from '../lib/glossary';

const WIDTH = 280;
const GAP = 8;
const EDGE = 12;

// A small (i) button. Tap it to read a short plain-English explanation.
// <InfoTip term="milestones" /> uses the glossary, or pass title and text yourself.
export default function InfoTip({ term, title, text, light }) {
  const entry = term ? GLOSSARY[term] : null;
  const heading = title || (entry && entry.title) || '';
  const body = text || (entry && entry.text) || '';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const popRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - EDGE * 2);
    const height = popRef.current ? popRef.current.offsetHeight : 120;
    const left = Math.max(EDGE, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - EDGE));
    const below = r.bottom + GAP;
    const top = below + height > window.innerHeight - EDGE ? Math.max(EDGE, r.top - height - GAP) : below;
    setPos({ top, left, width });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown') { if (e.key === 'Escape') { setOpen(false); if (buttonRef.current) buttonRef.current.focus(); } return; }
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (buttonRef.current && buttonRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('scroll', () => setOpen(false), { once: true, capture: true });
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  if (!body) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label={heading ? `What is "${heading}"?` : 'More information'}
        aria-expanded={open}
        style={{ ...s.btn, color: light ? 'rgba(255,255,255,0.85)' : 'var(--muted)' }}
      >
        <Icon name="info" size={16} />
      </button>
      {open && createPortal(
        <div ref={popRef} role="dialog" aria-label={heading} style={{ ...s.pop, top: pos.top, left: pos.left, width: pos.width || Math.min(WIDTH, window.innerWidth - EDGE * 2) }}>
          {heading && <p style={s.title}>{heading}</p>}
          <p style={s.text}>{body}</p>
        </div>,
        document.body
      )}
    </>
  );
}

const s = {
  btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, marginLeft: 2, padding: 0, background: 'none', border: 'none', borderRadius: '50%', cursor: 'pointer', verticalAlign: 'middle', fontFamily: 'inherit', flexShrink: 0 },
  pop: { position: 'fixed', zIndex: 10002, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-lg)', fontWeight: 400, textAlign: 'left', textTransform: 'none', letterSpacing: 'normal' },
  title: { margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  text: { margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' },
};
