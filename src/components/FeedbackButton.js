import React, { useState } from 'react';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';

const TALLY_URL = 'https://tally.so/r/mY6NzW';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button — bottom left */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
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
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: 15 }}>💬</span>
          Give feedback
        </button>
      )}

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            padding: '0 0 28px 28px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              height: 580,
              background: WH,
              borderRadius: 20,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: BL,
              borderRadius: '20px 20px 0 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>💬</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: WH, margin: 0 }}>Help us improve PM Buddy</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Takes 3 minutes. Honest answers only.</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: 18,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: '2px 6px',
                  lineHeight: 1,
                }}
              >✕</button>
            </div>

            {/* Tally iframe */}
            <iframe
              src={TALLY_URL}
              title="PM Buddy Feedback"
              style={{
                flex: 1,
                border: 'none',
                width: '100%',
              }}
              allow="camera;microphone"
            />
          </div>
        </div>
      )}
    </>
  );
}
