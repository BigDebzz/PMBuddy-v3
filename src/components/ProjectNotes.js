import React, { useState } from 'react';
import Icon from './Icon';
import InfoTip from './InfoTip';

const SHOWN = 3;

function when(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

// A shared notes area for the whole project, shown above the task board.
// Notes are stored inside the project's scope, so no database change is needed.
export default function ProjectNotes({ data, onSave, author }) {
  const notes = (data.scope && Array.isArray(data.scope.boardNotes)) ? data.scope.boardNotes : [];
  const [text, setText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(true);

  const newest = notes.slice().reverse();
  const visible = showAll ? newest : newest.slice(0, SHOWN);

  const save = (list, entry) => onSave({ scope: { ...(data.scope || {}), boardNotes: list } }, entry);

  const add = () => {
    const clean = text.trim();
    if (!clean) return;
    const note = { id: Date.now().toString(), text: clean, by: author || 'Someone', at: new Date().toISOString() };
    save([...notes, note], { type: 'board_note', label: 'Note added to the board', detail: clean.slice(0, 60) });
    setText('');
  };

  const remove = (id) => save(notes.filter(n => n.id !== id));

  return (
    <section style={s.card} aria-label="Project notes">
      <div style={s.head}>
        <p style={s.title}><Icon name="file" size={16} style={{ marginRight: 8 }} />Notes{notes.length ? ` (${notes.length})` : ''}<InfoTip term="boardNotes" /></p>
        <button type="button" style={s.toggle} onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? 'Hide' : 'Show'}</button>
      </div>

      {open && (
        <div>
          <div style={s.form}>
            <label htmlFor="board-note" style={s.srOnly}>Write a note for this project</label>
            <textarea id="board-note" style={s.input} rows={2} placeholder="Write a note for the whole project, such as a decision or what was agreed in a meeting"
              value={text} onChange={e => setText(e.target.value)} />
            <button type="button" style={{ ...s.add, opacity: text.trim() ? 1 : 0.5 }} onClick={add} disabled={!text.trim()}>Add note</button>
          </div>

          {notes.length === 0 && <p style={s.empty}>No notes yet. Anything you add here is visible to everyone on the project.</p>}

          {visible.map(n => (
            <div key={n.id} style={s.note}>
              <p style={s.noteText}>{n.text}</p>
              <div style={s.meta}>
                <span>{n.by}, {when(n.at)}</span>
                <button type="button" style={s.del} onClick={() => remove(n.id)} aria-label={`Delete note by ${n.by}`}>Delete</button>
              </div>
            </div>
          ))}

          {notes.length > SHOWN && (
            <button type="button" style={s.more} onClick={() => setShowAll(a => !a)}>{showAll ? 'Show fewer' : `Show all ${notes.length} notes`}</button>
          )}
        </div>
      )}
    </section>
  );
}

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 18 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  title: { display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 },
  toggle: { background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 4px' },
  form: { display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 },
  input: { flex: '1 1 240px', minWidth: 0, padding: '10px 12px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 },
  add: { padding: '10px 18px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 },
  empty: { fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 },
  note: { background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  noteText: { fontSize: 15, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  meta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' },
  del: { background: 'none', border: 'none', color: 'var(--bad-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 2px' },
  more: { background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
};
