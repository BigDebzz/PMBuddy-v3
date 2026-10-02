import React from 'react';
import Icon from './Icon';

// A small round chat button. It opens the feedback form without covering the page.
export default function FeedbackButton() {
  return (
    <button
      type="button"
      data-tally-open="mY6NzW"
      data-tally-emoji-animation="wave"
      data-tally-auto-close="3000"
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
