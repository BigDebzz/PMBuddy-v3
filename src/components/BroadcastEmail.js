import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const RULE = '#E5E7EB';

const DEFAULT_SUBJECT = 'We have been building something for you';

const DEFAULT_BODY = `<p style="font-size:15px;color:#374151;line-height:1.9;margin:0 0 16px;">
  It has been a while! While you were away, we have been building some things that I think will genuinely make managing your projects a lot easier.
</p>

<p style="font-size:15px;color:#374151;line-height:1.9;margin:0 0 24px;">
  Here is what is new on PM Buddy:
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
  <tr>
    <td style="background:#EFF6FF;border-radius:10px;padding:18px 20px;">
      <p style="font-size:14px;font-weight:800;color:#0284C7;margin:0 0 8px;">You no longer have to type everything in</p>
      <p style="font-size:14px;color:#374151;line-height:1.8;margin:0;">
        If you already have a project document, a proposal, a brief, or even something you wrote on Google Docs, just upload it. PM Buddy reads it and puts everything in the right place for you. Your milestones, your risks, your team, your timeline. No forms to fill.
      </p>
    </td>
  </tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="background:#F0FDF4;border-radius:10px;padding:18px 20px;">
      <p style="font-size:14px;font-weight:800;color:#15803D;margin:0 0 8px;">Your project now has a proper task board</p>
      <p style="font-size:14px;color:#374151;line-height:1.8;margin:0;">
        You can now track your tasks on a board with To Do, In Progress, and Done. Your milestones show up on the board too so everything is in one place. You can flag blockers, add notes, and see what is overdue at a glance.
      </p>
    </td>
  </tr>
</table>

<p style="font-size:15px;color:#374151;line-height:1.9;margin:0 0 24px;">
  I built PM Buddy because I am a project manager myself and I kept seeing smart capable people running projects with no structure. Not because they did not care, but because the tools out there assumed you already knew how to manage projects. PM Buddy does not assume anything. You bring the project, it brings the structure.
</p>

<p style="font-size:15px;color:#374151;line-height:1.9;margin:0 0 28px;">
  Log in and give it a try. And if anything is confusing or broken, just reply to this email. It comes straight to me.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td align="center">
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Open PM Buddy
      </a>
    </td>
  </tr>
</table>

<p style="font-size:14px;color:#374151;line-height:1.9;margin:0 0 4px;">Talk soon,</p>
<p style="font-size:14px;font-weight:700;color:#0A0A0A;margin:0;">
  Debbie<br/>
  <span style="font-weight:400;color:#6B7280;">PM Buddy</span>
</p>`;

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export default function BroadcastEmail({ user, onBack }) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [bodyHTML, setBodyHTML] = useState(DEFAULT_BODY);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(true);

  const callBroadcast = async (isPreview) => {
    if (isPreview) {
      setPreviewing(true);
    } else {
      setSending(true);
    }
    setError('');
    setResult(null);

    try {
      const authHeader = await getAuthHeader();
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          subject: subject,
          bodyHTML: bodyHTML,
          preview: isPreview,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          type: isPreview ? 'preview' : 'sent',
          message: data.message,
          sent: data.sent,
          failed: data.failed,
        });
      } else {
        setError(data.message || data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setPreviewing(false);
      setSending(false);
    }
  };

  const handlePreview = () => {
    if (!subject.trim() || !bodyHTML.trim()) {
      setError('Please fill in both the subject and email body.');
      return;
    }
    callBroadcast(true);
  };

  const handleSendAll = () => {
    if (!subject.trim() || !bodyHTML.trim()) {
      setError('Please fill in both the subject and email body.');
      return;
    }
    const confirmed = window.confirm('This will send the email to ALL PM Buddy users. Are you sure?');
    if (confirmed) {
      callBroadcast(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 24 }}
      >
        Back to Settings
      </button>

      <h2 style={{ fontSize: 22, fontWeight: 900, color: BL, letterSpacing: '-0.5px', marginBottom: 6 }}>
        Send Email Update
      </h2>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
        Compose and send a newsletter to all PM Buddy users. Always send a preview to yourself first before sending to everyone.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
          Subject line
        </label>
        <input
          type="text"
          value={subject}
          onChange={function(e) { setSubject(e.target.value); }}
          placeholder="Email subject..."
          style={{ width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', color: BL, outline: 'none', background: WH, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Email body</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={function() { setPreviewMode(false); }}
              style={{ padding: '4px 10px', background: previewMode ? WH : BL, color: previewMode ? '#374151' : WH, border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Edit HTML
            </button>
            <button
              onClick={function() { setPreviewMode(true); }}
              style={{ padding: '4px 10px', background: previewMode ? BL : WH, color: previewMode ? WH : '#374151', border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Preview
            </button>
          </div>
        </div>

        {previewMode ? (
          <div
            style={{ border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '20px 24px', background: WH, fontSize: 14, lineHeight: 1.8, color: '#374151', minHeight: 200 }}
            dangerouslySetInnerHTML={{ __html: bodyHTML }}
          />
        ) : (
          <textarea
            value={bodyHTML}
            onChange={function(e) { setBodyHTML(e.target.value); }}
            rows={14}
            style={{ width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.6, background: WH, boxSizing: 'border-box' }}
          />
        )}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ background: result.type === 'sent' ? '#F0FDF4' : '#EFF6FF', border: `1px solid ${result.type === 'sent' ? '#BBF7D0' : '#BFDBFE'}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: result.type === 'sent' ? '#15803D' : BLUE, marginBottom: result.type === 'sent' ? 4 : 0, margin: 0 }}>
            {result.type === 'sent' ? 'Broadcast sent successfully' : 'Preview sent to your email'}
          </p>
          {result.message && (
            <p style={{ fontSize: 13, color: result.type === 'sent' ? '#166534' : BLUE, marginTop: 4, marginBottom: 0 }}>
              {result.message}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={handlePreview}
          disabled={previewing || sending}
          style={{ padding: '11px 22px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (previewing || sending) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: previewing ? 0.6 : 1 }}
        >
          {previewing ? 'Sending preview...' : 'Send preview to me'}
        </button>
        <button
          onClick={handleSendAll}
          disabled={sending || previewing}
          style={{ padding: '11px 22px', background: sending ? '#6B7280' : BL, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: (sending || previewing) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1 }}
        >
          {sending ? 'Sending to all...' : 'Send to all users'}
        </button>
      </div>

      <div style={{ marginTop: 20, padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
        <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.65, margin: 0 }}>
          Always click "Send preview to me" first and check your inbox before sending to everyone.
        </p>
      </div>
    </div>
  );
}
