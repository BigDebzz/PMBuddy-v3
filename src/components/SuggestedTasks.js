import React, { useState } from 'react';
import AiLoading from './AiLoading';
import { suggestTasks } from '../lib/suggestTasks';
import { suggestionToTask } from '../lib/taskSuggestions';

function shortDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

// "Suggested by PM Buddy": tasks PM Buddy recommends for the project. Nothing reaches the board
// until the owner adds it, and each one can be changed or dismissed first.
export default function SuggestedTasks({ data, onSave }) {
  const scope = data.scope || {};
  const suggestions = Array.isArray(scope.suggestedTasks) ? scope.suggestedTasks : [];
  const tasks = data.tasks || [];
  const milestones = data.milestones || [];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id, title, dueDate }

  const setSuggestions = (list, extra = {}) => onSave({ scope: { ...scope, suggestedTasks: list }, ...extra });

  const generate = async () => {
    setLoading(true);
    setError('');
    const { tasks: list, error: why } = await suggestTasks(data);
    setLoading(false);
    if (why) { setError(why); return; }
    setSuggestions(list);
  };

  const add = (s) => {
    const mine = editing && editing.id === s.id ? { ...s, title: editing.title.trim() || s.title, dueDate: editing.dueDate } : s;
    const rest = suggestions.filter(x => x.id !== s.id);
    onSave({ tasks: [...tasks, suggestionToTask(mine, milestones)], scope: { ...scope, suggestedTasks: rest } });
    setEditing(null);
  };

  const addAll = () => {
    const now = new Date();
    const made = suggestions.map((s, i) => suggestionToTask(s, milestones, new Date(now.getTime() + i)));
    onSave({ tasks: [...tasks, ...made], scope: { ...scope, suggestedTasks: [] } });
  };

  const dismiss = (s) => { setSuggestions(suggestions.filter(x => x.id !== s.id)); if (editing && editing.id === s.id) setEditing(null); };

  if (loading) {
    return (
      <section style={st.card} aria-label="Suggested tasks">
        <p style={st.title}>PM Buddy is thinking about the tasks this project needs</p>
        <AiLoading compact kind="think" />
      </section>
    );
  }

  if (suggestions.length === 0) {
    const empty = tasks.length === 0;
    return (
      <section style={empty ? st.card : { ...st.card, padding: '10px 14px' }} aria-label="Suggested tasks">
        {empty ? (
          <>
            <p style={st.title}>Your task board is empty</p>
            <p style={st.text}>PM Buddy can suggest the everyday tasks this project needs, based on your goal, timeline and milestones. You choose which ones to add.</p>
          </>
        ) : null}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={empty ? st.primary : st.quiet} onClick={generate}>{empty ? 'Suggest tasks for this project' : 'Suggest more tasks'}</button>
          {error && <span style={st.error} role="alert">{error}</span>}
        </div>
      </section>
    );
  }

  return (
    <section style={st.card} aria-label="Suggested tasks">
      <div style={st.head}>
        <div>
          <p style={st.title}>Suggested by PM Buddy</p>
          <p style={st.text}>These are recommendations, not decisions. Add the ones you want, change them first if you like, or dismiss them.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={st.primary} onClick={addAll}>Add all {suggestions.length}</button>
          <button type="button" style={st.quiet} onClick={() => setSuggestions([])}>Dismiss all</button>
        </div>
      </div>

      {suggestions.map(s => {
        const isEditing = editing && editing.id === s.id;
        return (
          <div key={s.id} style={st.row}>
            {isEditing ? (
              <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
                <input style={st.input} value={editing.title} aria-label="Task" onChange={e => setEditing({ ...editing, title: e.target.value })} />
                <input style={st.input} type="date" value={editing.dueDate || ''} aria-label="Due date" onChange={e => setEditing({ ...editing, dueDate: e.target.value })} />
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={st.rowTitle}>{s.title}</p>
                <p style={st.rowMeta}>
                  {s.milestone ? `Towards: ${s.milestone}` : 'General task'}
                  {s.dueDate ? ` · Suggested date ${shortDate(s.dueDate)}` : ''}
                </p>
              </div>
            )}
            <div style={st.actions}>
              <button type="button" style={st.small} onClick={() => add(s)}>Add</button>
              {!isEditing && <button type="button" style={st.smallQuiet} onClick={() => setEditing({ id: s.id, title: s.title, dueDate: s.dueDate })}>Edit</button>}
              {isEditing && <button type="button" style={st.smallQuiet} onClick={() => setEditing(null)}>Cancel</button>}
              <button type="button" style={st.smallQuiet} onClick={() => dismiss(s)}>Dismiss</button>
            </div>
          </div>
        );
      })}
      {error && <p style={st.error} role="alert">{error}</p>}
    </section>
  );
}

const st = {
  card: { background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 },
  title: { margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' },
  text: { margin: '4px 0 12px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 640 },
  primary: { padding: '8px 14px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  quiet: { padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  row: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  rowTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' },
  rowMeta: { margin: '3px 0 0', fontSize: 12, color: 'var(--muted)' },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  small: { padding: '3px 10px', background: 'var(--accent)', color: '#FFFFFF', border: '1px solid var(--accent)', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  smallQuiet: { padding: '3px 10px', background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--text)', fontFamily: 'inherit' },
  error: { fontSize: 13, color: 'var(--bad-text)', margin: 0 },
};
