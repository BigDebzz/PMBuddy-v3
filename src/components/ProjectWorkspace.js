import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const TABS = ['Overview', 'Scope', 'Timeline', 'Risks', 'Team', 'Documents'];

export default function ProjectWorkspace({ project, onBack, onUpdate }) {
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState(project);

  const save = async (updates) => {
    const updated = { ...data, ...updates, updated_at: new Date().toISOString() };
    setData(updated);
    await supabase.from('pm_projects').update(updates).eq('id', project.id);
    if (onUpdate) onUpdate(updated);
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        <div style={s.header}>
          <div>
            <button style={s.backBtn} onClick={onBack}>← All Projects</button>
            <h1 style={s.title}>{data.name}</h1>
            <div style={s.meta}>
              <span style={s.industryBadge}>{data.industry}</span>
              <span style={s.methodBadge}>{data.methodology}</span>
              <span style={{ ...s.statusBadge, background: data.status === 'active' ? '#F0FDF4', color: '#15803D' }}>
                {data.status === 'active' ? 'Active' : 'Completed'}
              </span>
            </div>
          </div>
        </div>

        <div style={s.tabBar}>
          {TABS.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? BLUE : '#6B7280', borderBottomColor: tab === t ? BLUE : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div style={s.content}>
          {tab === 'Overview' && <OverviewTab data={data} />}
          {tab === 'Scope' && <ScopeTab data={data} onSave={save} />}
          {tab === 'Timeline' && <TimelineTab data={data} onSave={save} />}
          {tab === 'Risks' && <RisksTab data={data} onSave={save} />}
          {tab === 'Team' && <TeamTab data={data} onSave={save} />}
          {tab === 'Documents' && <DocumentsTab data={data} />}
        </div>

      </div>
    </div>
  );
}

function OverviewTab({ data }) {
  const start = data.timeline?.start ? new Date(data.timeline.start) : null;
  const end = data.timeline?.end ? new Date(data.timeline.end) : null;
  const today = new Date();
  const totalDays = start && end ? Math.ceil((end - start) / (1000 * 60 * 60 * 24)) : 0;
  const daysLeft = end ? Math.ceil((end - today) / (1000 * 60 * 60 * 24)) : 0;
  const progress = totalDays > 0 ? Math.max(0, Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))) : 0;
  const completedMilestones = (data.milestones || []).filter(m => m.status === 'done').length;
  const totalMilestones = (data.milestones || []).length;

  return (
    <div>
      <div style={s.overviewGrid}>
        <div style={s.overviewCard}>
          <p style={s.overviewCardLabel}>Time Progress</p>
          <p style={s.overviewCardNum}>{progress}%</p>
          <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: `${progress}%` }} /></div>
          <p style={s.overviewCardSub}>{daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? 'Due today' : 'Overdue'}</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewCardLabel}>Milestones</p>
          <p style={s.overviewCardNum}>{completedMilestones}/{totalMilestones}</p>
          <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: totalMilestones > 0 ? `${(completedMilestones / totalMilestones) * 100}%` : '0%' }} /></div>
          <p style={s.overviewCardSub}>completed</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewCardLabel}>Open Risks</p>
          <p style={{ ...s.overviewCardNum, color: (data.risks || []).filter(r => r.status === 'open').length > 0 ? '#DC2626' : '#15803D' }}>
            {(data.risks || []).filter(r => r.status === 'open').length}
          </p>
          <p style={s.overviewCardSub}>need attention</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewCardLabel}>Team Size</p>
          <p style={s.overviewCardNum}>{data.team_type === 'solo' ? '1' : (data.team || []).length}</p>
          <p style={s.overviewCardSub}>{data.team_type === 'solo' ? 'Solo project' : 'members'}</p>
        </div>
      </div>

      <div style={s.overviewSection}>
        <p style={s.sectionLabel}>Project Goal</p>
        <div style={s.goalCard}>
          <p style={s.goalText}>{data.scope?.goal || 'No goal defined yet.'}</p>
        </div>
      </div>

      <div style={s.overviewSection}>
        <p style={s.sectionLabel}>Upcoming Milestones</p>
        {(data.milestones || []).slice(0, 3).map((m, i) => (
          <div key={i} style={s.milestoneRow}>
            <div style={{ ...s.milestoneStatus, background: m.status === 'done' ? BLUE : WH, borderColor: m.status === 'done' ? BLUE : '#D1D5DB' }}>
              {m.status === 'done' && <span style={{ color: WH, fontSize: 10, fontWeight: 900 }}>✓</span>}
            </div>
            <div style={s.milestoneInfo}>
              <p style={s.milestoneName}>{m.title}</p>
              <p style={s.milestoneDate}>{m.date ? formatDate(m.date) : 'No date set'}</p>
            </div>
            <span style={{ ...s.milestoneBadge, background: m.status === 'done' ? '#F0FDF4' : '#EFF6FF', color: m.status === 'done' ? '#15803D' : BLUE }}>
              {m.status === 'done' ? 'Done' : 'Pending'}
            </span>
          </div>
        ))}
      </div>

      {data.compliance?.flags?.length > 0 && (
        <div style={s.complianceAlert}>
          <p style={s.complianceAlertTitle}>Compliance Reminders</p>
          {data.compliance.flags.map((f, i) => (
            <p key={i} style={s.complianceFlag}>· {f}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeTab({ data, onSave }) {
  const [deliverable, setDeliverable] = useState('');
  const deliverables = data.scope?.deliverables || [];

  const addDeliverable = () => {
    if (!deliverable.trim()) return;
    onSave({ scope: { ...data.scope, deliverables: [...deliverables, { title: deliverable.trim(), status: 'pending' }] } });
    setDeliverable('');
  };

  const toggleDeliverable = (i) => {
    const updated = deliverables.map((d, idx) => idx === i ? { ...d, status: d.status === 'done' ? 'pending' : 'done' } : d);
    onSave({ scope: { ...data.scope, deliverables: updated } });
  };

  const removeDeliverable = (i) => {
    onSave({ scope: { ...data.scope, deliverables: deliverables.filter((_, idx) => idx !== i) } });
  };

  return (
    <div>
      <SectionHead title="Project Scope" sub="Define exactly what needs to be built. Anything outside this list is scope creep." />
      <div style={s.goalCard}>
        <p style={s.sectionLabel}>Goal</p>
        <p style={s.goalText}>{data.scope?.goal}</p>
      </div>
      <p style={s.sectionLabel}>Core Deliverables</p>
      <div style={s.addRow}>
        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Add a deliverable e.g. User authentication flow" value={deliverable} onChange={e => setDeliverable(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDeliverable()} />
        <button style={s.addDeliverableBtn} onClick={addDeliverable}>Add</button>
      </div>
      {deliverables.length === 0 && <p style={s.emptyText}>No deliverables added yet. Add what needs to be built.</p>}
      {deliverables.map((d, i) => (
        <div key={i} style={s.deliverableRow}>
          <button style={{ ...s.checkBtn, background: d.status === 'done' ? BLUE : WH, borderColor: d.status === 'done' ? BLUE : '#D1D5DB' }} onClick={() => toggleDeliverable(i)}>
            {d.status === 'done' && <span style={{ color: WH, fontSize: 11, fontWeight: 900 }}>✓</span>}
          </button>
          <span style={{ ...s.deliverableTitle, textDecoration: d.status === 'done' ? 'line-through' : 'none', color: d.status === 'done' ? '#9CA3AF' : BL }}>{d.title}</span>
          <button style={s.removeSmallBtn} onClick={() => removeDeliverable(i)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ data, onSave }) {
  const milestones = data.milestones || [];

  const toggleMilestone = (i) => {
    const updated = milestones.map((m, idx) => idx === i ? { ...m, status: m.status === 'done' ? 'pending' : 'done' } : m);
    onSave({ milestones: updated });
  };

  return (
    <div>
      <SectionHead title="Project Timeline" sub="Track your milestones and stay on schedule. Mark each one as done when complete." />
      <div style={s.timelineRange}>
        <div style={s.timelineDate}>
          <p style={s.timelineDateLabel}>Start Date</p>
          <p style={s.timelineDateVal}>{data.timeline?.start ? formatDate(data.timeline.start) : 'Not set'}</p>
        </div>
        <div style={s.timelineLine} />
        <div style={s.timelineDate}>
          <p style={s.timelineDateLabel}>End Date</p>
          <p style={s.timelineDateVal}>{data.timeline?.end ? formatDate(data.timeline.end) : 'Not set'}</p>
        </div>
      </div>
      <p style={s.sectionLabel}>Milestones</p>
      {milestones.map((m, i) => (
        <div key={i} style={s.milestoneCard}>
          <button style={{ ...s.checkBtn, background: m.status === 'done' ? BLUE : WH, borderColor: m.status === 'done' ? BLUE : '#D1D5DB' }} onClick={() => toggleMilestone(i)}>
            {m.status === 'done' && <span style={{ color: WH, fontSize: 11, fontWeight: 900 }}>✓</span>}
          </button>
          <div style={s.milestoneCardInfo}>
            <p style={{ ...s.milestoneName, textDecoration: m.status === 'done' ? 'line-through' : 'none', color: m.status === 'done' ? '#9CA3AF' : BL }}>{m.title}</p>
            <p style={s.milestoneDate}>{m.date ? formatDate(m.date) : 'No date'}</p>
          </div>
          <span style={{ ...s.milestoneBadge, background: m.status === 'done' ? '#F0FDF4' : '#EFF6FF', color: m.status === 'done' ? '#15803D' : BLUE }}>
            {m.status === 'done' ? 'Done' : 'Pending'}
          </span>
        </div>
      ))}
    </div>
  );
}

function RisksTab({ data, onSave }) {
  const risks = data.risks || [];
  const [newRisk, setNewRisk] = useState('');
  const [newLevel, setNewLevel] = useState('medium');

  const addRisk = () => {
    if (!newRisk.trim()) return;
    onSave({ risks: [...risks, { title: newRisk.trim(), level: newLevel, status: 'open' }] });
    setNewRisk('');
  };

  const toggleRisk = (i) => {
    const updated = risks.map((r, idx) => idx === i ? { ...r, status: r.status === 'open' ? 'mitigated' : 'open' } : r);
    onSave({ risks: updated });
  };

  return (
    <div>
      <SectionHead title="Risk Register" sub="Track what could go wrong and mark risks as mitigated when you have addressed them." />
      <div style={s.addRow}>
        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Describe a risk..." value={newRisk} onChange={e => setNewRisk(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRisk()} />
        <select style={s.select} value={newLevel} onChange={e => setNewLevel(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button style={s.addDeliverableBtn} onClick={addRisk}>Add</button>
      </div>
      {risks.length === 0 && <p style={s.emptyText}>No risks added yet.</p>}
      {risks.map((r, i) => (
        <div key={i} style={s.riskCard}>
          <div style={{ ...s.riskLevel, background: r.level === 'high' ? '#FEF2F2' : r.level === 'medium' ? '#FFFBEB' : '#F0FDF4', color: r.level === 'high' ? '#DC2626' : r.level === 'medium' ? '#D97706' : '#15803D' }}>
            {r.level}
          </div>
          <p style={{ ...s.riskTitle, color: r.status === 'mitigated' ? '#9CA3AF' : BL, textDecoration: r.status === 'mitigated' ? 'line-through' : 'none' }}>{r.title}</p>
          <button style={{ ...s.mitigateBtn, background: r.status === 'mitigated' ? '#F0FDF4' : WH, color: r.status === 'mitigated' ? '#15803D' : '#6B7280' }} onClick={() => toggleRisk(i)}>
            {r.status === 'mitigated' ? 'Mitigated' : 'Mark Mitigated'}
          </button>
        </div>
      ))}
    </div>
  );
}

function TeamTab({ data, onSave }) {
  const team = data.team || [];
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const addMember = () => {
    if (!name.trim()) return;
    onSave({ team: [...team, { name: name.trim(), role: role.trim() }] });
    setName(''); setRole('');
  };

  const removeMember = (i) => onSave({ team: team.filter((_, idx) => idx !== i) });

  return (
    <div>
      <SectionHead title="Team" sub="Keep track of who is working on this project and what they are responsible for." />
      <div style={s.addRow}>
        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Role" value={role} onChange={e => setRole(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember()} />
        <button style={s.addDeliverableBtn} onClick={addMember}>Add</button>
      </div>
      {team.length === 0 && <p style={s.emptyText}>No team members added yet.</p>}
      {team.map((m, i) => (
        <div key={i} style={s.teamMemberCard}>
          <div style={s.memberAvatar}>{m.name[0]?.toUpperCase()}</div>
          <div style={s.memberInfo}>
            <p style={s.memberName}>{m.name}</p>
            <p style={s.memberRole}>{m.role || 'No role defined'}</p>
          </div>
          <button style={s.removeSmallBtn} onClick={() => removeMember(i)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ data }) {
  const docs = [
    { title: 'Project Charter', desc: 'Official project overview with goals, scope and team.', ready: true },
    { title: 'RACI Chart', desc: 'Who is Responsible, Accountable, Consulted and Informed.', ready: false },
    { title: 'Risk Register', desc: 'Full list of identified risks and mitigation status.', ready: true },
    { title: 'Communication Plan', desc: 'How and when to communicate with each stakeholder.', ready: false },
    { title: 'Milestone Report', desc: 'Progress report based on your current milestone status.', ready: true },
  ];

  return (
    <div>
      <SectionHead title="Documents" sub="Your project documents are generated automatically. Download or share them anytime." />
      {docs.map((doc, i) => (
        <div key={i} style={s.docCard}>
          <div style={s.docInfo}>
            <p style={s.docTitle}>{doc.title}</p>
            <p style={s.docDesc}>{doc.desc}</p>
          </div>
          {doc.ready ? (
            <button style={s.downloadBtn}>Download</button>
          ) : (
            <span style={s.comingSoonTag}>Coming Soon</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionHead({ title, sub }) {
  return (
    <div style={s.sectionHeadWrap}>
      <h3 style={s.sectionHeadTitle}>{title}</h3>
      <p style={s.sectionHeadSub}>{sub}</p>
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '32px 24px 80px' },
  wrap: { maxWidth: 860, margin: '0 auto' },
  header: { marginBottom: 24 },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 12, display: 'block' },
  title: { fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: BL, letterSpacing: '-0.8px', marginBottom: 10 },
  meta: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  industryBadge: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  methodBadge: { fontSize: 11, fontWeight: 700, background: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: 100 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  tabBar: { display: 'flex', borderBottom: '1.5px solid #E5E7EB', marginBottom: 28, overflowX: 'auto' },
  tabBtn: { padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s' },
  content: { background: WH, borderRadius: 20, padding: '28px', border: '1px solid #E5E7EB' },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 },
  sectionHeadWrap: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionHeadTitle: { fontSize: 18, fontWeight: 800, color: BL, marginBottom: 4, letterSpacing: '-0.3px' },
  sectionHeadSub: { fontSize: 14, color: '#6B7280' },

  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 },
  overviewCard: { background: GREY, borderRadius: 14, padding: '20px', border: '1px solid #E5E7EB' },
  overviewCardLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  overviewCardNum: { fontSize: 32, fontWeight: 900, color: BLUE, letterSpacing: '-1px', marginBottom: 8 },
  overviewCardSub: { fontSize: 12, color: '#6B7280' },
  miniBar: { height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  miniBarFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.6s ease' },
  overviewSection: { marginBottom: 24 },
  goalCard: { background: GREY, borderRadius: 12, padding: '16px', marginBottom: 20, border: '1px solid #E5E7EB' },
  goalText: { fontSize: 15, color: BL, lineHeight: 1.7, fontWeight: 500 },
  milestoneRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  milestoneCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  milestoneStatus: { width: 20, height: 20, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  milestoneInfo: { flex: 1 },
  milestoneCardInfo: { flex: 1 },
  milestoneName: { fontSize: 14, fontWeight: 700, color: BL, marginBottom: 2 },
  milestoneDate: { fontSize: 12, color: '#9CA3AF' },
  milestoneBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, flexShrink: 0 },
  complianceAlert: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px', marginTop: 8 },
  complianceAlertTitle: { fontSize: 12, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  complianceFlag: { fontSize: 13, color: '#92400E', lineHeight: 1.7 },

  input: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 16, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  addRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 },
  addDeliverableBtn: { padding: '11px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  select: { padding: '11px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: BL, outline: 'none', flexShrink: 0 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' },
  deliverableRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F3F4F6' },
  checkBtn: { width: 22, height: 22, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, background: WH },
  deliverableTitle: { flex: 1, fontSize: 14, fontWeight: 600 },
  removeSmallBtn: { background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' },

  timelineRange: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, background: GREY, borderRadius: 12, padding: '20px' },
  timelineDate: { flex: 1, textAlign: 'center' },
  timelineDateLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  timelineDateVal: { fontSize: 16, fontWeight: 800, color: BL },
  timelineLine: { flex: 1, height: 2, background: BLUE, borderRadius: 1 },

  riskCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  riskLevel: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', flexShrink: 0 },
  riskTitle: { flex: 1, fontSize: 14, fontWeight: 600 },
  mitigateBtn: { fontSize: 12, fontWeight: 700, padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },

  teamMemberCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  memberAvatar: { width: 36, height: 36, borderRadius: '50%', background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: 700, color: BL, marginBottom: 2 },
  memberRole: { fontSize: 12, color: '#6B7280' },

  docCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: GREY, borderRadius: 12, marginBottom: 10, border: '1px solid #E5E7EB' },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: 800, color: BL, marginBottom: 4 },
  docDesc: { fontSize: 13, color: '#6B7280' },
  downloadBtn: { padding: '8px 16px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  comingSoonTag: { fontSize: 11, fontWeight: 700, color: BLUE, background: '#EFF6FF', padding: '4px 12px', borderRadius: 100, flexShrink: 0 },
};
