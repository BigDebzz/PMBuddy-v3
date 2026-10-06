import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const ROLES = ['Founder', 'Hackathon participant', 'Solo builder', 'Product manager', 'Student', 'Community builder', 'Other'];
export const USE_CASES = ['Managing projects', 'Leading a team', 'Running a funded programme', 'Raising money from investors', 'Personal or solo work'];

// Who the person is and what they use PM Buddy for. Saved on their account, so nothing else needs setting up.
// compact shows only the "what will you use it for" question, for the first-time prompt.
export default function ProfileForm({ meta, onSaved, onSkip, compact }) {
  const [form, setForm] = useState({
    first_name: meta.first_name || '',
    last_name: meta.last_name || '',
    role: meta.role || '',
    organisation: meta.organisation || '',
    use_case: meta.use_case || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage('');
    const payload = compact
      ? { organisation: form.organisation.trim(), use_case: form.use_case }
      : {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        organisation: form.organisation.trim(),
        use_case: form.use_case,
      };
    const { error } = await supabase.auth.updateUser({ data: payload });
    setSaving(false);
    if (error) { setMessage('Could not save. Please try again.'); return; }
    setMessage('Saved.');
    if (onSaved) onSaved(payload);
  };

  const chips = (options, key) => (
    <div style={s.chips}>
      {options.map(o => (
        <button key={o} type="button" aria-pressed={form[key] === o} onClick={() => set(key, o)}
          style={{ ...s.chip, ...(form[key] === o ? s.chipOn : null) }}>{o}</button>
      ))}
    </div>
  );

  return (
    <div>
      {!compact && (
        <div style={s.row}>
          <label style={s.field}><span style={s.label}>First name</span><input style={s.input} value={form.first_name} onChange={e => set('first_name', e.target.value)} /></label>
          <label style={s.field}><span style={s.label}>Last name</span><input style={s.input} value={form.last_name} onChange={e => set('last_name', e.target.value)} /></label>
        </div>
      )}
      {!compact && (<><p style={s.label}>Who are you?</p>{chips(ROLES, 'role')}</>)}
      <p style={s.label}>What will you use PM Buddy for?</p>
      {chips(USE_CASES, 'use_case')}
      <label style={{ ...s.field, marginBottom: 16 }}>
        <span style={s.label}>Organisation or project name (optional)</span>
        <input style={s.input} value={form.organisation} onChange={e => set('organisation', e.target.value)} />
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" style={{ ...s.primary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        {onSkip && <button type="button" style={s.skip} onClick={onSkip}>Not now</button>}
        {message && <span style={{ fontSize: 14, color: message.startsWith('Could not') ? 'var(--bad-text)' : 'var(--ok-text)' }}>{message}</span>}
      </div>
    </div>
  );
}

const s = {
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 },
  field: { display: 'grid', gap: 4, minWidth: 0 },
  label: { fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, color: 'var(--text)', fontFamily: 'inherit' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-2)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  chipOn: { background: 'var(--accent-tint)', color: 'var(--accent-text)', borderColor: 'var(--accent)' },
  primary: { padding: '10px 22px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  skip: { padding: '10px 14px', background: 'none', color: 'var(--muted)', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
