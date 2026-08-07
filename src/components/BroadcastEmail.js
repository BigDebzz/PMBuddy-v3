import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';
const RULE = '#E5E7EB';

const FEATURE_UPDATE_TEMPLATE = `<p style="font-size:15px;color:#374151;line-height:1.8;margin:0 0 20px;">
  We've been building. Here's what's new on PM Buddy.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="background:#EFF6FF;border-radius:10px;padding:16px 20px;margin-bottom:12px;">
      <p style="font-size:13px;font-weight:800;color:#0284C7;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">📁 Upload your existing document</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">
        Already have a project plan, proposal, or brief? Upload it. PM Buddy reads it and automatically sets up your project — milestones, risks, task board — without you filling in a single form.
      </p>
    </td>
  </tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="background:#F0FDF4;border-radius:10px;padding:16px 20px;">
      <p style="font-size:13px;font-weight:800;color:#15803D;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">◈ Kanban task board</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">
        A proper task board with To Do, In Progress, and Done columns. Your milestones show up automatically. Add tasks, flag blockers, leave notes — all in one place.
      </p>
    </td>
  </tr>
</table>

<p style="font-size:15px;color:#374151;line-height:1.8;margin:0 0 24px;">
  PM Buddy is built for people who are running projects without a project management background. No jargon. No complicated setup. Just upload what you have and get a clear structure immediately.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td align="center">
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.2px;">
        Open PM Buddy →
      </a>
    </td>
  </tr>
</table>

<p style="font-size:13px;color:#9CA3AF;line-height:1.7;margin:0;">
  Still building. Always open to feedback — just reply to this email and it goes straight to me.
</p>
<p style="font-size:13px;color:#9CA3AF;margin:8px 0 0;">— Deborah, PM Buddy</p>`;

export default function BroadcastEmail({ user, onBack }) {
  const [subject, setSubject] = useState('What\'s new on PM Buddy — document upload, kanban board, and more');
  const [bodyHTML, setBodyHTML] = useState(FEATURE_UPDATE_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const sendPreview = async () => {
    setPreviewing(true);
    setError('');
    setResult(null);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ subject, bodyHTML, preview: true }),
      });
      const data = await res.json();
      if (res.ok) setResult({ type: 'preview', message: data.message });
      else setError(data.error || 'Something went wrong.');
    } catch (err) { setError(err.message); }
    setPreviewing(false);
  };

  const sendBroadcast = async () => {
    if (!window.confirm('This will send the email to ALL PM Buddy users. Are you sure?')) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ subject, bodyHTML, preview: false }),
      });
      const data = await res.json();
      if (res.ok) setResult({ type: 'sent', message: data.message, sent: data.sent, failed: data.failed, total: data.total });
      else setError(data.error || 'Something went wrong.');
    } catch (err) { setError(err.message); }
    setSending(false);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <button style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 24 }} onClick={onBack}>← Back</button>

      <h2 style={{ fontSize: 22, fontWeight: 900, color: BL, letterSpacing: '-0.5px', marginBottom: 6 }}>Send Email Update</h2>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>Compose and send a newsletter to all PM Buddy users. Always send a preview to yourself first.</p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Subject line</label>
        <input
          style={{ width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', color: BL, outline: 'none', background: WH, boxSizing: 'border-box' }}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Email subject..."
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Email body (HTML)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ padding: '4px 10px', background: previewMode ? BL : WH, color: previewMode ? WH : '#374151', border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setPreviewMode(false)}>Edit</button>
            <button style={{ padding: '4px 10px', background: !previewMode ? WH : BL, color: !previewMode ? '#374151' : WH, border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setPreviewMode(true)}>Preview</button>
          </div>
        </div>

        {!previewMode && (
          <textarea
            style={{ width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '12px 14px', fontSize: 13, fontFamily: 'monospace', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.6, background: WH, boxSizing: 'border-box', minHeight: 300 }}
            value={bodyHTML}
            onChange={e => setBodyHTML(e.target.value)}
          />
        )}

        {previewMode && (
          <div style={{ border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '20px 24px', background: WH, fontSize: 14, lineHeight: 1.8, color: '#374151', minHeight: 200 }} dangerouslySetInnerHTML={{ __html: bodyHTML }} />
        )}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ background: result.type === 'sent' ? '#F0FDF4' : '#EFF6FF', border: `1px solid ${result.type === 'sent' ? '#BBF7D0' : '#BFDBFE'}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: result.type === 'sent' ? '#15803D' : BLUE, marginBottom: result.type === 'sent' ? 6 : 0 }}>
            {result.type === 'sent' ? '✓ Broadcast sent' : '✓ Preview sent to your email'}
          </p>
          {result.type === 'sent' && (
            <p style={{ fontSize: 13, color: '#166534' }}>
              {result.message} {result.failed > 0 ? `(${result.failed} failed)` : ''}
            </p>
          )}
          {result.type === 'preview' && <p style={{ fontSize: 13, color: BLUE }}>{result.message}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          style={{ padding: '11px 22px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: previewing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: previewing ? 0.6 : 1 }}
          onClick={sendPreview}
          disabled={previewing || sending}
        >
          {previewing ? 'Sending preview...' : '👁 Send preview to me'}
        </button>
        <button
          style={{ padding: '11px 22px', background: sending ? '#6B7280' : BL, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1 }}
          onClick={sendBroadcast}
          disabled={sending || previewing}
        >
          {sending ? 'Sending...' : '✦ Send to all users'}
        </button>
      </div>

      <div style={{ marginTop: 20, padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
        <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.65 }}>
          <strong>Before sending to everyone:</strong> always click "Send preview to me" first and check how it looks in your inbox. Only then click "Send to all users."
        </p>
      </div>
    </div>
  );
}
