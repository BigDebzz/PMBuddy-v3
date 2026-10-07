import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = 'var(--accent)';
const BL = 'var(--text)';
const WH = 'var(--surface)';

export default function RemindersPanel({ project, onUpdate }) {
  const reminders = project.reminders || { enabled: false, email: '' };
  const [enabled, setEnabled] = useState(reminders.enabled || false);
  const [email, setEmail] = useState(reminders.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const save = async () => {
    if (enabled && !email.trim()) return;
    setSaving(true);
    setSaved(false);
    const newReminders = { enabled, email: email.trim() };
    const { data, error } = await supabase
      .from('pm_projects')
      .update({ reminders: newReminders })
      .eq('id', project.id)
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setSaved(true);
      onUpdate({ ...project, reminders: newReminders });
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const sendTest = async () => {
    if (!email.trim()) return;
    setTesting(true);
    setTestSent(false);
    try {
      await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.trim(),
          subject: `PM Buddy reminders are active for: ${project.name}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F2EFEA;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E3DED7;">
    <div style="background:#1E1919;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#1F57F0;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#1F57F0;text-transform:uppercase;letter-spacing:0.1em;">Reminders Active</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1E1919;">You are all set.</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#5F5852;line-height:1.7;">Reminders are now active for <strong style="color:#1E1919;">${project.name}</strong>. You will receive:</p>
      <ul style="margin:0 0 24px;padding-left:20px;">
        <li style="font-size:14px;color:#3F3A36;line-height:1.8;margin-bottom:4px;">A reminder 3 days before each milestone is due</li>
        <li style="font-size:14px;color:#3F3A36;line-height:1.8;margin-bottom:4px;">A reminder on the day each milestone is due</li>
        <li style="font-size:14px;color:#3F3A36;line-height:1.8;margin-bottom:4px;">A daily note when tasks are due today, due in 3 days, or overdue</li>
        <li style="font-size:14px;color:#3F3A36;line-height:1.8;">A weekly summary every Monday with what is coming up</li>
      </ul>
      <a href="https://pmbuddy.app" style="display:inline-block;background:#1E1919;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open PM Buddy</a>
    </div>
  </div>
</body>
</html>`
        }),
      });
      setTestSent(true);
    } catch (err) {
      console.error('Test email error:', err);
    }
    setTesting(false);
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <h3 style={s.title}>Milestone and Task Reminders</h3>
          <p style={s.sub}>Get email reminders before milestones are due, a daily note when tasks are due or overdue, and a weekly summary every Monday.</p>
        </div>
        <button
          style={{ ...s.toggle, background: enabled ? BLUE : 'var(--border)' }}
          onClick={() => setEnabled(p => !p)}
        >
          <div style={{ ...s.toggleKnob, transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
        </button>
      </div>

      {enabled && (
        <div style={s.body}>
          <label style={s.label}>Send reminders to this email</label>
          <div style={s.inputRow}>
            <input
              style={s.input}
              type="email"
              placeholder="e.g. you@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div style={s.whatYouGet}>
            <p style={s.whatLabel}>What you will receive</p>
            {[
              '3 days before each milestone — a heads up to prepare',
              'On the day each milestone is due — a final reminder',
              'Each morning — tasks due today, due in 3 days, or overdue',
              'Every Monday morning — a summary of what is coming up this week',
            ].map((item, i) => (
              <div key={i} style={s.whatItem}>
                <div style={s.whatDot} />
                <p style={s.whatText}>{item}</p>
              </div>
            ))}
          </div>

          <div style={s.actions}>
            <button
              style={{ ...s.saveBtn, opacity: !email.trim() ? 0.5 : 1 }}
              onClick={save}
              disabled={saving || !email.trim()}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save reminder settings'}
            </button>
            {saved && email.trim() && (
              <button
                style={s.testBtn}
                onClick={sendTest}
                disabled={testing}
              >
                {testing ? 'Sending...' : testSent ? 'Test email sent' : 'Send a test email'}
              </button>
            )}
          </div>

          {testSent && (
            <div style={s.successNote}>
              Test email sent to {email}. Check your inbox and spam folder.
            </div>
          )}
        </div>
      )}

      {!enabled && (
        <div style={s.offState}>
          <p style={s.offText}>Reminders are off for this project. Toggle on to set up email notifications.</p>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { background: WH, border: '1px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  title: { fontSize: 16, fontWeight: 700, color: BL, marginBottom: 6, letterSpacing: '-0.2px' },
  sub: { fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 440 },
  toggle: { width: 48, height: 26, borderRadius: 100, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s ease' },
  toggleKnob: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: WH, transition: 'transform 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  body: { marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--surface-2)' },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, },
  inputRow: { marginBottom: 20 },
  input: { width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '11px 14px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  whatYouGet: { background: 'var(--surface-2)', borderRadius: 10, padding: '16px', marginBottom: 20 },
  whatLabel: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 },
  whatItem: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  whatDot: { width: 6, height: 6, borderRadius: '50%', background: BLUE, flexShrink: 0, marginTop: 6 },
  whatText: { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  saveBtn: { padding: '10px 20px', background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  testBtn: { padding: '10px 20px', background: 'transparent', color: 'var(--accent-text)', border: `1px solid ${BLUE}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  successNote: { marginTop: 12, fontSize: 14, color: 'var(--ok-text)', background: 'var(--ok-tint)', border: '1px solid var(--ok-border)', borderRadius: 10, padding: '10px 14px' },
  offState: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--surface-2)' },
  offText: { fontSize: 14, color: 'var(--muted)' },
};
