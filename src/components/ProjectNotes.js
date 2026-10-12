import React, { useState } from 'react';
import Icon from './Icon';
import InfoTip from './InfoTip';

const SHOWN = 4;

function when(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

// The Notes column of the task board.
// It shows notes written for the whole project (optionally about one task) and the notes already
// written on individual tasks, so a blocker and its explanation are in one place.
// Project notes are stored inside the project's scope, so no database change is needed.
export default function ProjectNotes({ data, onSave, author, tasks = [] }) {
  const notes = (data.scope && Array.isArray(data.scope.boardNotes)) ? data.scope.boardNotes : [];
  const [text, setText] = useState('');
  const [taskId, setTaskId] = useState('');
  const [showAll, setShowAll] = useState(false);

  const titleOf = (id) => { const t = tasks.find(x => x.id === id); return t ? t.title : ''; };

  const items = [
    ...tasks.filter(t => t.notes && t.isBlocker).map(t => ({ key: 'task-' + t.id, kind: 'task', text: t.notes, task: t.title, blocker: true })),
    ...notes.slice().reverse().map(n => ({ key: n.id, kind: 'board', id: n.id, text: n.text, by: n.by, at: n.at, task: titleOf(n.taskId), blocker: false })),
    ...tasks.filter(t => t.notes && !t.isBlocker).map(t => ({ key: 'task-' + t.id, kind: 'task', text: t.notes, task: t.title, blocker: false })),
  ];
  const visible = showAll ? items : items.slice(0, SHOWN);

  const save = (list, entry) => onSave({ scope: { ...(data.scope || {}), boardNotes: list } }, entry);

  const add = () => {
    const clean = text.trim();
    if (!clean) return;
    const note = { id: Date.now().toString(), text: clean, by: author || 'Someone', at: new Date().toISOString() };
    if (taskId) note.taskId = taskId;
    const about = taskId ? titleOf(taskId) : '';
    save([...notes, note], { type: 'board_note', label: about ? 'Note added to a task' : 'Note added to the board', detail: `${about ? about + ': ' : ''}${clean.slice(0, 60)}` });
    setText('');
    setTaskId('');
  };

  const remove = (id) => save(notes.filter(n => n.id !== id));

  return (
    <section style={s.col} aria-label="Project notes">
      <div style={s.head}>
        <p style={s.title}>Notes<InfoTip term="boardNotes" /></p>
        <span style={s.count}>{items.length}</span>
      </div>

      <div style={s.form}>
        <label htmlFor="board-note" style={s.srOnly}>Write a note</label>
        <textarea id="board-note" style={s.input} rows={3} placeholder="Write a note, such as a decision or what is holding something up"
          value={text} onChange={e => setText(e.target.value)} />
        {tasks.length > 0 && (
          <>
            <label htmlFor="board-note-task" style={s.srOnly}>Which task is it about</label>
            <select id="board-note-task" style={s.select} value={taskId} onChange={e => setTaskId(e.target.value)}>
              <option value="">About the whole project</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </>
        )}
        <button type="button" style={{ ...s.add, opacity: text.trim() ? 1 : 0.5 }} onClick={add} disabled={!text.trim()}>Add note</button>
      </div>

      {items.length === 0 && <p style={s.empty}>No notes yet. Notes are visible to everyone on the project.</p>}

      {visible.map(n => (
        <div key={n.key} style={{ ...s.note, borderColor: n.blocker ? 'var(--warn)' : 'var(--border)' }}>
          {n.blocker && (
            <div style={s.blocker}><Icon name="blocked" size={13} /><span>Blocker</span></div>
          )}
          {n.task && <p style={s.about}>{n.kind === 'task' ? 'Task: ' : 'About: '}{n.task}</p>}
          <p style={s.noteText}>{n.text}</p>
          {n.kind === 'board' ? (
            <div style={s.meta}>
              <span>{n.by}, {when(n.at)}</span>
              <button type="button" style={s.del} onClick={() => remove(n.id)} aria-label={`Delete note by ${n.by}`}>Delete</button>
            </div>
          ) : (
            <div style={s.meta}><span>Edit it with the Notes button on the task</span></div>
          )}
        </div>
      ))}

      {items.length > SHOWN && (
        <button type="button" style={s.more} onClick={() => setShowAll(a => !a)}>{showAll ? 'Show fewer' : `Show all ${items.length} notes`}</button>
      )}
    </section>
  );
}

const s = {
  col: { background: 'var(--accent-tint)', borderRadius: 16, padding: 12, border: '1px solid var(--border)', minHeight: 200, minWidth: 0 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent-text)', margin: 0 },
  count: { fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', background: 'var(--surface)', padding: '1px 7px', borderRadius: 100, border: '1px solid var(--border)' },
  form: { display: 'grid', gap: 8, marginBottom: 12 },
  input: { width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '9px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 },
  select: { width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '9px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', fontFamily: 'inherit' },
  add: { justifySelf: 'start', padding: '8px 16px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 },
  empty: { fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0', fontStyle: 'italic', margin: 0, lineHeight: 1.5 },
  note: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, boxShadow: '0 1px 3px rgba(43,42,40,0.05)' },
  blocker: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, padding: '3px 8px', background: 'var(--warn-tint)', borderRadius: 8, width: 'fit-content', fontSize: 12, fontWeight: 800, color: 'var(--warn-text)' },
  about: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '0 0 4px', wordBreak: 'break-word' },
  noteText: { fontSize: 14, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  meta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' },
  del: { background: 'none', border: 'none', color: 'var(--bad-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 2px' },
  more: { background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
};
