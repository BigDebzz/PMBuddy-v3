import React from 'react';
import Icon from './Icon';

const FORM_ID = 'mY6NzW';

// Tally's script is only loaded when someone taps the button, so visitors who never give feedback
// do not contact a third party.
function openFeedback() {
  const open = () => { if (window.Tally) window.Tally.openPopup(FORM_ID, { autoClose: 3000 }); };
  if (window.Tally) { open(); return; }
  const existing = document.getElementById('tally-script');
  if (existing) { existing.addEventListener('load', open); return; }
  const s = document.createElement('script');
  s.id = 'tally-script';
  s.src = 'https://tally.so/widgets/embed.js';
  s.async = true;
  s.onload = open;
  document.body.appendChild(s);
}

// A small round chat button. It opens the feedback form without covering the page.
export default function FeedbackButton() {
  return (
    <button
      type="button"
      onClick={openFeedback}
      title="Give feedback"
      aria-label="Give feedback"
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 9998,
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        color: 'var(--accent-text)',
        border: '1px solid var(--border-strong)',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: 'var(--shadow)',
      }}
    >
      <Icon name="chat" size={18} />
    </button>
  );
}
