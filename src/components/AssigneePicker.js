import React, { useState } from 'react';
import Icon from './Icon';
import { cleanNames, toggleName, initials } from '../lib/assignees';

// Pick one or more people for a task. People on the team show as buttons you can tick;
// anyone else can be typed in. Calls onChange with the full list every time.
export default function AssigneePicker({ value, people, onChange, canEmail, label = 'Who is doing this?' }) {
  const [typed, setTyped] = useState('');
  const selected = cleanNames(value);
  const team = cleanNames(people);
  const teamKeys = new Set(team.map(n => n.toLowerCase()));
  const others = selected.filter(n => !teamKeys.has(n.toLowerCase()));
  const isOn = (n) => selected.some(x => x.toLowerCase() === n.toLowerCase());

  // Plain-English note about who gets an email when this is saved.
  // canEmail(name) says 'email' (will be told), 'you' (the person using the app) or 'no' (not on the project).
  const joined = canEmail ? selected.filter(n => canEmail(n) === 'email') : [];
  const notJoined = canEmail ? selected.filter(n => canEmail(n) === 'no') : [];
  const list = (a) => a.length <= 2 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;

  const addTyped = () => {
    if (!typed.trim()) return;
    onChange(cleanNames([...selected, typed]));
    setTyped('');
  };

  const chip = (name, on, removable) => (
    <button
      key={name}
      type="button"
      aria-pressed={on}
      onClick={() => onChange(toggleName(selected, name))}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 5px',
        borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        background: on ? 'var(--accent-tint)' : 'var(--surface)',
        color: on ? 'var(--accent-text)' : 'var(--text-2)',
        border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`,
      }}
    >
      <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', background: on ? 'var(--accent)' : 'var(--surface-3)', color: on ? '#FFFFFF' : 'var(--text-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
        {on ? <Icon name="check" size={12} strokeWidth={3.2} /> : initials(name)}
      </span>
      {name}
      {removable && <Icon name="x" size={12} />}
    </button>
  );

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', margin: '0 0 6px' }}>
        {label}{selected.length > 1 ? ` (${selected.length} people)` : ''}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {team.map(n => chip(n, isOn(n), false))}
        {others.map(n => chip(n, true, true))}
      </div>
      {canEmail && (joined.length > 0 || notJoined.length > 0) && (
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>
          {joined.length > 0 && <p style={{ margin: 0 }}><Icon name="bell" size={12} style={{ marginRight: 4 }} />{list(joined)} will get an email about this task.</p>}
          {notJoined.length > 0 && <p style={{ margin: joined.length ? '4px 0 0' : 0, color: 'var(--muted)' }}>{list(notJoined)} {notJoined.length === 1 ? "isn't" : "aren't"} on the project yet, so no email will go out. Invite them from the People tab.</p>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTyped(); } }}
          placeholder={team.length ? 'Someone else? Type a name' : 'Type a name and press Enter'}
          aria-label="Add another person"
          style={{ flex: 1, minWidth: 0, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
        />
        <button type="button" onClick={addTyped} disabled={!typed.trim()} style={{ padding: '7px 12px', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: typed.trim() ? 'pointer' : 'default', opacity: typed.trim() ? 1 : 0.5 }}>
          <Icon name="plus" size={12} style={{ marginRight: 4 }} />Add
        </button>
      </div>
    </div>
  );
}
