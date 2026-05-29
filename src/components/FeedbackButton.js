import React from 'react';

const BL = '#0A0A0A';
const WH = '#FFFFFF';

export default function FeedbackButton() {
  return (
    <button
      data-tally-open="mY6NzW"
      data-tally-emoji-animation="wave"
      data-tally-auto-close="3000"
      title="Give feedback"
      style={{
        position: 'fixed',
        bottom: 28,
        left: 28,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: BL,
        color: WH,
        border: 'none',
        borderRadius: 100,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      <span style={{ fontSize: 15 }}>💬</span>
      Give feedback
    </button>
  );
}
