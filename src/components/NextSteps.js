import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Icon from './Icon';
import { useNarrow } from '../lib/useNarrow';

const dismissKey = (id) => `pmb-nextsteps-dismissed-${id}`;

// A short checklist at the top of a project. Each line ticks itself when it is done.
// It disappears once all three are done, or when the person closes it.
export default function NextSteps({ data, project, onTab, onReport, version }) {
  const narrow = useNarrow();
  const [shown, setShown] = useState(null);     // null: use the default for this screen size
  const [people, setPeople] = useState(null);   // invitations sent or accepted
  const [reports, setReports] = useState(null); // reports saved for this project
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(dismissKey(project.id)) === '1'; } catch (e) { return false; }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, d] = await Promise.all([
        supabase.from('project_members').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('type', 'report'),
      ]);
      if (cancelled) return;
      setPeople(m.count || 0);
      setReports(d.count || 0);
    })().catch(() => { if (!cancelled) { setPeople(0); setReports(0); } });
    return () => { cancelled = true; };
  }, [project.id, version]);

  if (hidden || people === null) return null;

  const hasTasks = (data.tasks || []).length > 0;
  const steps = [
    { done: hasTasks, title: 'Add your first tasks', text: 'Break the work into things someone can finish.', button: 'Add tasks', go: () => onTab('Tasks') },
    { done: people > 0, title: 'Invite the people on this project', text: 'Everyone gets a notification when something changes, so you do not have to keep updating them.', button: 'Invite people', go: () => onTab('People') },
    { done: reports > 0, title: 'Create your first report', text: 'A team update, or a report for a funder or investor, written from your project.', button: 'Create a report', go: onReport },
  ];
  const doneCount = steps.filter(x => x.done).length;
  if (doneCount === steps.length) return null;

  const close = () => {
    try { localStorage.setItem(dismissKey(project.id), '1'); } catch (e) { /* ignore */ }
    setHidden(true);
  };

  // A beginner sees one calm line. The full list opens when they ask for it (or straight away on a wide screen when nothing is done yet).
  const isOpen = shown === null ? (!narrow && doneCount === 0) : shown;
  const next = steps.find(x => !x.done);
  if (!isOpen) {
    return (
      <section style={s.bar} aria-label="Next steps">
        <button type="button" style={s.barMain} onClick={() => setShown(true)} aria-expanded="false">
          <span style={s.barLabel}>Next step</span>
          <span style={s.barText}>{next.title}</span>
          <span style={s.barCount}>{doneCount} of {steps.length} done</span>
        </button>
        <button type="button" style={s.close} onClick={close} aria-label="Hide next steps"><Icon name="x" size={18} /></button>
      </section>
    );
  }

  return (
    <section style={s.card} aria-label="Next steps">
      <div style={s.head}>
        <div>
          <p style={s.title}>Your project is ready. Here is what to do next.</p>
          <p style={s.count}>{doneCount} of {steps.length} done</p>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button type="button" style={s.fold} onClick={() => setShown(false)}>Fold up</button>
          <button type="button" style={s.close} onClick={close} aria-label="Hide next steps"><Icon name="x" size={18} /></button>
        </div>
      </div>
      <ol style={s.list}>
        {steps.map((step, i) => (
          <li key={i} style={s.item}>
            <span style={{ ...s.tick, ...(step.done ? s.tickOn : null) }} aria-hidden="true">
              {step.done ? <Icon name="check" size={14} strokeWidth={3.2} style={{ color: '#FFFFFF' }} /> : <span style={{ fontSize: 13, fontWeight: 700 }}>{i + 1}</span>}
            </span>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <p style={{ ...s.itemTitle, ...(step.done ? s.itemDone : null) }}>{step.title}{step.done ? ' (done)' : ''}</p>
              {!step.done && <p style={s.itemText}>{step.text}</p>}
            </div>
            {!step.done && <button type="button" style={s.go} onClick={step.go}>{step.button}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}

const s = {
  bar: { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '4px 4px 4px 14px', marginBottom: 16 },
  barMain: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '8px 0', color: 'var(--text)' },
  barLabel: { fontSize: 12, fontWeight: 800, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  barText: { fontSize: 15, fontWeight: 700 },
  barCount: { fontSize: 13, color: 'var(--text-2)' },
  fold: { background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '0 8px', minHeight: 40 },
  card: { background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 16, padding: '18px 20px', marginBottom: 20 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.35 },
  count: { fontSize: 14, color: 'var(--text-2)', margin: '4px 0 0' },
  close: { background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: -8, marginRight: -8 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 },
  item: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' },
  tick: { width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--border-strong)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tickOn: { background: 'var(--ok)', borderColor: 'var(--ok)' },
  itemTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 },
  itemDone: { color: 'var(--muted)', textDecoration: 'line-through' },
  itemText: { fontSize: 14, color: 'var(--text-2)', margin: '2px 0 0', lineHeight: 1.5 },
  go: { padding: '9px 16px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40, flexShrink: 0 },
};
