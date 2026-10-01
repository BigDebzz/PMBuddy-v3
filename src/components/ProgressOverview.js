import React, { useEffect, useRef, useState } from 'react';

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const MAX_TILT_X = 7;
const MAX_TILT_Y = 10;

// Read "YYYY-MM-DD" as a local date so day counts are right in every time zone.
function parseLocalDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const date = new Date(y, (m || 1) - 1, d || 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysFromToday(value) {
  const date = parseLocalDate(value);
  if (!date) return null;
  return Math.round((date - startOfToday()) / 86400000);
}

function dueLabel(days) {
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export default function ProgressOverview({ data, acceptedMembers = [] }) {
  const tasks = data.tasks || [];
  const milestones = data.milestones || [];
  const openRisks = (data.risks || []).filter(r => r.status === 'open').length;
  const teamSize = 1 + acceptedMembers.length;

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const doneMilestones = milestones.filter(m => m.status === 'done').length;
  const totalItems = tasks.length + milestones.length;
  const percent = totalItems > 0 ? Math.round(((doneTasks + doneMilestones) / totalItems) * 100) : 0;

  const start = parseLocalDate(data.timeline?.start);
  const end = parseLocalDate(data.timeline?.end);
  const totalDays = start && end ? Math.round((end - start) / 86400000) : 0;
  const daysLeft = end ? Math.round((end - startOfToday()) / 86400000) : null;
  const timeUsed = totalDays > 0 ? Math.max(0, Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))) : 0;

  const attention = tasks
    .filter(t => t.status !== 'done' && t.dueDate)
    .map(t => ({ ...t, days: daysFromToday(t.dueDate) }))
    .filter(t => t.days !== null && t.days <= 7)
    .sort((a, b) => a.days - b.days);
  const overdueCount = attention.filter(t => t.days < 0).length;
  const dueThisWeek = attention.length - overdueCount;

  // Ring draws in on first view.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 3D tilt follows the mouse. Touch and reduced-motion users get a still board.
  const boardRef = useRef(null);
  const reduced = useRef(prefersReducedMotion());

  const handleMove = (e) => {
    if (reduced.current || e.pointerType !== 'mouse' || !boardRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    boardRef.current.style.transition = 'transform 0.12s ease-out';
    boardRef.current.style.transform = `rotateX(${(-py * MAX_TILT_X * 2).toFixed(2)}deg) rotateY(${(px * MAX_TILT_Y * 2).toFixed(2)}deg)`;
  };

  const handleLeave = () => {
    if (!boardRef.current) return;
    boardRef.current.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    boardRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };

  const chips = [
    { label: 'Tasks', value: `${doneTasks}/${tasks.length}`, sub: 'done', color: 'var(--color-success)' },
    { label: 'Milestones', value: `${doneMilestones}/${milestones.length}`, sub: 'reached', color: 'var(--color-primary)' },
    { label: 'Overdue', value: overdueCount, sub: overdueCount === 1 ? 'task' : 'tasks', color: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
    { label: 'Due this week', value: dueThisWeek, sub: dueThisWeek === 1 ? 'task' : 'tasks', color: dueThisWeek > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' },
    { label: 'Open risks', value: openRisks, sub: 'to watch', color: openRisks > 0 ? 'var(--color-warning)' : 'var(--color-success)' },
    { label: 'Team', value: teamSize, sub: teamSize === 1 ? 'person' : 'people', color: 'var(--color-primary)' },
  ];

  const timeLine = daysLeft === null
    ? 'No end date set'
    : daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Ends today' : `${Math.abs(daysLeft)} days past the end date`;
  const timeColor = daysLeft !== null && daysLeft < 7 ? 'var(--color-danger)' : 'var(--color-primary)';

  return (
    <div className="pmb-motion" style={s.stage} onPointerMove={handleMove} onPointerLeave={handleLeave}>
      <div ref={boardRef} style={s.board}>

        <div style={s.hero}>
          <div
            style={s.ringWrap}
            role="img"
            aria-label={`${percent} percent complete. ${doneTasks + doneMilestones} of ${totalItems} tasks and milestones done.`}
          >
            <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
              <circle cx="66" cy="66" r={RING_RADIUS} fill="none" stroke="var(--color-primary-tint)" strokeWidth="12" />
              <circle
                cx="66" cy="66" r={RING_RADIUS} fill="none"
                stroke="var(--color-primary)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={drawn ? RING_LENGTH * (1 - percent / 100) : RING_LENGTH}
                transform="rotate(-90 66 66)"
                style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </svg>
            <div style={s.ringText}>
              <span style={s.percent}>{percent}%</span>
              <span style={s.percentSub}>complete</span>
            </div>
          </div>

          <div style={s.heroCopy}>
            <p style={s.eyebrow}>Progress overview</p>
            <h3 style={s.headline}>
              {totalItems === 0
                ? 'Add your first task to see progress here.'
                : percent === 100
                  ? 'Everything is done. Well done!'
                  : `${doneTasks + doneMilestones} of ${totalItems} done so far.`}
            </h3>
            <p style={{ ...s.timeLine, color: timeColor }}>{timeLine}</p>
            {totalDays > 0 && (
              <div style={s.timeTrack} aria-hidden="true">
                <div style={{ ...s.timeFill, width: `${timeUsed}%`, background: timeColor }} />
              </div>
            )}
          </div>
        </div>

        <div style={s.chipRow}>
          {chips.map((chip, i) => (
            <div key={chip.label} style={{ ...s.chip, animation: `pmb-float 4.5s ease-in-out ${i * 0.35}s infinite` }}>
              <p style={s.chipLabel}>{chip.label}</p>
              <p style={{ ...s.chipValue, color: chip.color }}>{chip.value}</p>
              <p style={s.chipSub}>{chip.sub}</p>
            </div>
          ))}
        </div>

        {attention.length > 0 && (
          <div style={s.needs}>
            <p style={s.needsTitle}>Needs your attention</p>
            {attention.slice(0, 4).map(task => (
              <div key={task.id || task.title} style={s.needsRow}>
                <span style={{ ...s.dot, background: task.days < 0 ? 'var(--color-danger)' : task.days <= 1 ? 'var(--color-warning)' : 'var(--color-primary)' }} />
                <span style={s.needsText}>{task.title}{task.assignee ? ` · ${task.assignee}` : ''}</span>
                <span style={{ ...s.needsWhen, color: task.days < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{dueLabel(task.days)}</span>
              </div>
            ))}
            {attention.length > 4 && <p style={s.more}>+ {attention.length - 4} more in the Tasks tab</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  stage: { perspective: 1100, marginBottom: 20 },
  board: {
    transformStyle: 'preserve-3d', willChange: 'transform',
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', padding: 24,
  },
  hero: { display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', transform: 'translateZ(30px)' },
  ringWrap: { position: 'relative', width: 132, height: 132, flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(53,112,154,0.18))' },
  ringText: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 30, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 },
  percentSub: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginTop: 2 },
  heroCopy: { flex: 1, minWidth: 200 },
  eyebrow: { margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  headline: { margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 },
  timeLine: { margin: '0 0 8px', fontSize: 14, fontWeight: 600 },
  timeTrack: { height: 6, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden', maxWidth: 360 },
  timeFill: { height: '100%', borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' },
  chipRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 24, transformStyle: 'preserve-3d' },
  chip: {
    background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
    padding: '12px 14px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', transform: 'translateZ(40px)',
  },
  chipLabel: { margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' },
  chipValue: { margin: '2px 0', fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
  chipSub: { margin: 0, fontSize: 12, color: 'var(--color-text-muted)' },
  needs: {
    marginTop: 20, padding: '14px 16px', background: 'var(--color-primary-tint)',
    border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius-lg)', transform: 'translateZ(20px)',
  },
  needsTitle: { margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--color-primary-hover)' },
  needsRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  needsText: { flex: 1, fontSize: 14, color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  needsWhen: { fontSize: 13, fontWeight: 600, flexShrink: 0 },
  more: { margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-muted)' },
};
