import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import DocumentGenerator from './DocumentGenerator';
import RemindersPanel from './RemindersPanel';
import TeamTab from './TeamTab';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const AGILE_TABS = ['Overview', 'What We Are Building', 'Work Cycles', 'Progress', 'What We Learned', 'Risks', 'Documents', 'Team', 'Reminders'];
const PREDICTIVE_TABS = ['Overview', 'Who Is Involved', 'Scope', 'Planning', 'Risks and Compliance', 'Progress', 'Documents', 'Team', 'Reminders'];
const HYBRID_TABS = ['Overview', 'What We Are Building', 'Who Is Involved', 'Planning', 'Risks and Compliance', 'Progress', 'Documents', 'Team', 'Reminders'];

const METHODOLOGY_INFO = {
  Agile: {
    color: '#0284C7',
    bg: '#EFF6FF',
    label: 'Agile',
    reason: 'Best for projects where things will change as you go. You build in short cycles, review often and adjust based on what you learn.',
  },
  Predictive: {
    color: '#7C3AED',
    bg: '#F5F3FF',
    label: 'Predictive',
    reason: 'Best for projects where the requirements are clear from the start. You plan everything upfront and follow the plan step by step.',
  },
  Hybrid: {
    color: '#0369A1',
    bg: '#E0F2FE',
    label: 'Hybrid',
    reason: 'A mix of both. You plan the big picture upfront but stay flexible on how you execute each part.',
  },
};

export default function ProjectWorkspace({ project, onBack, onUpdate }) {
  const [data, setData] = useState(project);
  const [methodology, setMethodology] = useState(project.methodology || 'Agile');
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [tab, setTab] = useState(project._openDoc ? 'Documents' : 'Overview');

  const tabs = methodology === 'Agile' ? AGILE_TABS : methodology === 'Predictive' ? PREDICTIVE_TABS : HYBRID_TABS;

  const save = async (updates) => {
    const updated = { ...data, ...updates, updated_at: new Date().toISOString() };
    setData(updated);
    await supabase.from('pm_projects').update(updates).eq('id', project.id);
    if (onUpdate) onUpdate(updated);
  };

  const changeMethodology = async (m) => {
    setMethodology(m);
    setTab('Overview');
    setShowMethodPicker(false);
    await supabase.from('pm_projects').update({ methodology: m }).eq('id', project.id);
  };

  const info = METHODOLOGY_INFO[methodology];

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}>← All Projects</button>
          <div style={s.headerRow}>
            <div style={s.headerLeft}>
              <h1 style={s.title}>{data.name}</h1>
              <div style={s.metaRow}>
                <span style={s.industryBadge}>{data.industry}</span>
                <span style={{ ...s.statusBadge, background: data.status === 'active' ? '#F0FDF4' : '#FEF2F2', color: data.status === 'active' ? '#15803D' : '#DC2626' }}>
                  {data.status === 'active' ? 'Active' : 'Completed'}
                </span>
              </div>
            </div>
            <div style={s.methodBox}>
              <div style={{ ...s.methodBadge, background: info.bg, color: info.color }}>
                {info.label} Approach
              </div>
              <button style={s.switchBtn} onClick={() => setShowMethodPicker(p => !p)}>
                Switch approach
              </button>
            </div>
          </div>
        </div>

        {showMethodPicker && (
          <div style={s.methodPicker}>
            <p style={s.methodPickerTitle}>PM Buddy recommended <strong>{project.methodology}</strong> based on your project. You can switch anytime.</p>
            <div style={s.methodPickerGrid}>
              {Object.entries(METHODOLOGY_INFO).map(([key, val]) => (
                <button key={key} style={{ ...s.methodPickerCard, borderColor: methodology === key ? val.color : '#E5E7EB', background: methodology === key ? val.bg : WH }} onClick={() => changeMethodology(key)}>
                  <p style={{ ...s.methodPickerName, color: val.color }}>{val.label}</p>
                  <p style={s.methodPickerReason}>{val.reason}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={s.tabBar}>
          {tabs.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? BLUE : '#6B7280', borderBottomColor: tab === t ? BLUE : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div style={s.content}>
          {tab === 'Overview' && <OverviewTab data={data} methodology={methodology} info={info} />}

          {tab === 'What We Are Building' && <BacklogTab data={data} onSave={save} />}
          {tab === 'Work Cycles' && <SprintsTab data={data} onSave={save} />}
          {tab === 'Progress' && <ProgressTab data={data} onSave={save} methodology={methodology} />}
          {tab === 'What We Learned' && <RetrospectiveTab data={data} onSave={save} />}

          {tab === 'Who Is Involved' && <StakeholdersTab data={data} onSave={save} />}
          {tab === 'Scope' && <ScopeTab data={data} onSave={save} />}
          {tab === 'Planning' && <PlanningTab data={data} onSave={save} methodology={methodology} />}
          {tab === 'Risks and Compliance' && <RisksComplianceTab data={data} onSave={save} />}

          {tab === 'Documents' && <DocumentsTab data={data} methodology={methodology} user={project.user_id} openDoc={project._openDoc} />}
          {tab === 'Team' && <TeamTab project={data} currentUser={project._currentUser} />}
          {tab === 'Reminders' && <RemindersPanel project={data} onUpdate={(updated) => { setData(updated); onUpdate(updated); }} />}
        </div>

      </div>
    </div>
  );
}

function OverviewTab({ data, methodology, info }) {
  const end = data.timeline?.end ? new Date(data.timeline.end) : null;
  const start = data.timeline?.start ? new Date(data.timeline.start) : null;
  const today = new Date();
  const totalDays = start && end ? Math.ceil((end - start) / 86400000) : 0;
  const daysLeft = end ? Math.ceil((end - today) / 86400000) : 0;
  const progress = totalDays > 0 ? Math.max(0, Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))) : 0;
  const openRisks = (data.risks || []).filter(r => r.status === 'open').length;
  const milestones = data.milestones || [];
  const doneMilestones = milestones.filter(m => m.status === 'done').length;

  return (
    <div>
      <div style={s.overviewGrid}>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Time Progress</p>
          <p style={s.overviewNum}>{progress}%</p>
          <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: `${progress}%` }} /></div>
          <p style={s.overviewSub}>{daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Milestones Done</p>
          <p style={s.overviewNum}>{doneMilestones}/{milestones.length}</p>
          <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: milestones.length > 0 ? `${(doneMilestones / milestones.length) * 100}%` : '0%' }} /></div>
          <p style={s.overviewSub}>completed</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Open Risks</p>
          <p style={{ ...s.overviewNum, color: openRisks > 0 ? '#DC2626' : '#15803D' }}>{openRisks}</p>
          <p style={s.overviewSub}>need attention</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Team Size</p>
          <p style={s.overviewNum}>{data.team_type === 'solo' ? '1' : (data.team || []).length}</p>
          <p style={s.overviewSub}>{data.team_type === 'solo' ? 'Solo project' : 'members'}</p>
        </div>
      </div>

      <div style={{ ...s.approachCard, background: info.bg, border: `1px solid ${info.color}30` }}>
        <p style={{ ...s.approachLabel, color: info.color }}>Your Approach: {info.label}</p>
        <p style={s.approachText}>{info.reason}</p>
      </div>

      <div style={s.overviewSection}>
        <p style={s.sectionLabel}>Your Project Goal</p>
        <div style={s.goalCard}>
          <p style={s.goalText}>{data.scope?.goal || 'No goal defined yet.'}</p>
        </div>
      </div>

      <div style={s.overviewSection}>
        <p style={s.sectionLabel}>Key Milestones</p>
        {milestones.slice(0, 4).map((m, i) => (
          <div key={i} style={s.milestoneRow}>
            <div style={{ ...s.milestoneCheck, background: m.status === 'done' ? BLUE : WH, borderColor: m.status === 'done' ? BLUE : '#D1D5DB' }}>
              {m.status === 'done' && <span style={{ color: WH, fontSize: 10, fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ ...s.milestoneName, textDecoration: m.status === 'done' ? 'line-through' : 'none', color: m.status === 'done' ? '#9CA3AF' : BL }}>{m.title}</p>
              <p style={s.milestoneDate}>{m.date ? formatDate(m.date) : 'No date set'}</p>
            </div>
            <span style={{ ...s.pill, background: m.status === 'done' ? '#F0FDF4' : m.status === 'in_progress' ? '#EFF6FF' : '#F9FAFB', color: m.status === 'done' ? '#15803D' : m.status === 'in_progress' ? BLUE : '#6B7280' }}>
              {m.status === 'done' ? 'Done' : m.status === 'in_progress' ? 'In Progress' : 'Pending'}
            </span>
          </div>
        ))}
      </div>

      {data.compliance?.flags?.length > 0 && (
        <div style={s.complianceAlert}>
          <p style={s.complianceAlertTitle}>Things to Keep in Mind</p>
          {data.compliance.flags.map((f, i) => <p key={i} style={s.complianceFlag}>· {f}</p>)}
        </div>
      )}
    </div>
  );
}

function BacklogTab({ data, onSave }) {
  const backlog = data.backlog || { epics: [] };
  const [newEpic, setNewEpic] = useState('');
  const [newStory, setNewStory] = useState({});
  const [expandedEpic, setExpandedEpic] = useState(null);

  const addEpic = () => {
    if (!newEpic.trim()) return;
    const updated = { epics: [...(backlog.epics || []), { title: newEpic.trim(), stories: [] }] };
    onSave({ backlog: updated });
    setNewEpic('');
  };

  const addStory = (epicIdx) => {
    if (!newStory[epicIdx]?.trim()) return;
    const epics = [...(backlog.epics || [])];
    epics[epicIdx].stories = [...(epics[epicIdx].stories || []), { title: newStory[epicIdx].trim(), status: 'todo', priority: 'medium' }];
    onSave({ backlog: { epics } });
    setNewStory(p => ({ ...p, [epicIdx]: '' }));
  };

  const toggleStory = (epicIdx, storyIdx) => {
    const epics = [...(backlog.epics || [])];
    const story = epics[epicIdx].stories[storyIdx];
    story.status = story.status === 'done' ? 'todo' : 'done';
    onSave({ backlog: { epics } });
  };

  const removeEpic = (i) => {
    const epics = (backlog.epics || []).filter((_, idx) => idx !== i);
    onSave({ backlog: { epics } });
  };

  return (
    <div>
      <SectionHead title="What We Are Building" sub="Break your project into big areas of work, then list what needs to be built inside each one. Think of it as your master list of everything." />

      <div style={s.addRow}>
        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Add a big area of work e.g. User Authentication" value={newEpic} onChange={e => setNewEpic(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEpic()} />
        <button style={s.addBtn} onClick={addEpic}>Add</button>
      </div>

      {(backlog.epics || []).length === 0 && <p style={s.emptyText}>No work areas added yet. Start by adding the big things you need to build.</p>}

      {(backlog.epics || []).map((epic, epicIdx) => (
        <div key={epicIdx} style={s.epicCard}>
          <div style={s.epicHeader}>
            <button style={s.epicToggle} onClick={() => setExpandedEpic(expandedEpic === epicIdx ? null : epicIdx)}>
              <span style={s.epicArrow}>{expandedEpic === epicIdx ? '▼' : '▶'}</span>
              <span style={s.epicTitle}>{epic.title}</span>
              <span style={s.epicCount}>{(epic.stories || []).length} items</span>
            </button>
            <button style={s.removeSmallBtn} onClick={() => removeEpic(epicIdx)}>✕</button>
          </div>

          {expandedEpic === epicIdx && (
            <div style={s.epicBody}>
              <p style={s.epicBodyLabel}>What needs to be built inside this area</p>
              <p style={s.epicBodyHint}>Write each item as "As a [user], I need to [do something] so that [outcome]" or just describe what needs to happen.</p>

              {(epic.stories || []).map((story, storyIdx) => (
                <div key={storyIdx} style={s.storyRow}>
                  <button style={{ ...s.checkBtn, background: story.status === 'done' ? BLUE : WH, borderColor: story.status === 'done' ? BLUE : '#D1D5DB' }} onClick={() => toggleStory(epicIdx, storyIdx)}>
                    {story.status === 'done' && <span style={{ color: WH, fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </button>
                  <span style={{ ...s.storyTitle, textDecoration: story.status === 'done' ? 'line-through' : 'none', color: story.status === 'done' ? '#9CA3AF' : BL }}>{story.title}</span>
                  <span style={{ ...s.pill, background: story.status === 'done' ? '#F0FDF4' : '#EFF6FF', color: story.status === 'done' ? '#15803D' : BLUE, fontSize: 10 }}>
                    {story.status === 'done' ? 'Done' : 'To Do'}
                  </span>
                </div>
              ))}

              <div style={{ ...s.addRow, marginTop: 12 }}>
                <input style={{ ...s.input, flex: 1, marginBottom: 0, fontSize: 13 }} placeholder="Add something to build in this area..." value={newStory[epicIdx] || ''} onChange={e => setNewStory(p => ({ ...p, [epicIdx]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addStory(epicIdx)} />
                <button style={s.addBtn} onClick={() => addStory(epicIdx)}>Add</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SprintsTab({ data, onSave }) {
  const sprints = data.sprints || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newSprint, setNewSprint] = useState({ goal: '', duration: '2 weeks', start: '', end: '' });

  const addSprint = () => {
    if (!newSprint.goal.trim()) return;
    const updated = [...sprints, { ...newSprint, number: sprints.length + 1, status: 'planning', items: [] }];
    onSave({ sprints: updated });
    setNewSprint({ goal: '', duration: '2 weeks', start: '', end: '' });
    setShowAdd(false);
  };

  const updateSprintStatus = (i, status) => {
    const updated = sprints.map((s, idx) => idx === i ? { ...s, status } : s);
    onSave({ sprints: updated });
  };

  const statusColors = { planning: { bg: '#EFF6FF', color: BLUE }, active: { bg: '#FFF7ED', color: '#D97706' }, done: { bg: '#F0FDF4', color: '#15803D' } };

  return (
    <div>
      <SectionHead title="Work Cycles" sub="A work cycle is a short focused period where your team builds a specific set of things. Typically 1 to 4 weeks. At the end of each cycle you review what was done and plan the next one." />

      <button style={s.primaryBtn} onClick={() => setShowAdd(p => !p)}>+ Plan a New Work Cycle</button>

      {showAdd && (
        <div style={s.addCard}>
          <label style={s.label}>What is the goal of this work cycle?</label>
          <input style={s.input} placeholder="e.g. Complete user login and signup flow" value={newSprint.goal} onChange={e => setNewSprint(p => ({ ...p, goal: e.target.value }))} />
          <label style={s.label}>How long is this cycle?</label>
          <select style={s.select} value={newSprint.duration} onChange={e => setNewSprint(p => ({ ...p, duration: e.target.value }))}>
            <option>1 week</option>
            <option>2 weeks</option>
            <option>3 weeks</option>
            <option>4 weeks</option>
          </select>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Start date</label>
              <input style={s.input} type="date" value={newSprint.start} onChange={e => setNewSprint(p => ({ ...p, start: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>End date</label>
              <input style={s.input} type="date" value={newSprint.end} onChange={e => setNewSprint(p => ({ ...p, end: e.target.value }))} />
            </div>
          </div>
          <button style={s.primaryBtn} onClick={addSprint}>Save Work Cycle</button>
        </div>
      )}

      {sprints.length === 0 && !showAdd && <p style={s.emptyText}>No work cycles planned yet.</p>}

      {sprints.map((sprint, i) => {
        const sc = statusColors[sprint.status] || statusColors.planning;
        return (
          <div key={i} style={s.sprintCard}>
            <div style={s.sprintHeader}>
              <div>
                <p style={s.sprintNum}>Cycle {sprint.number}</p>
                <p style={s.sprintGoal}>{sprint.goal}</p>
                <p style={s.sprintMeta}>{sprint.duration} · {sprint.start ? formatDate(sprint.start) : ''} {sprint.end ? `to ${formatDate(sprint.end)}` : ''}</p>
              </div>
              <span style={{ ...s.pill, background: sc.bg, color: sc.color }}>{sprint.status === 'planning' ? 'Planning' : sprint.status === 'active' ? 'In Progress' : 'Completed'}</span>
            </div>
            <div style={s.sprintActions}>
              {sprint.status === 'planning' && <button style={s.sprintBtn} onClick={() => updateSprintStatus(i, 'active')}>Start This Cycle</button>}
              {sprint.status === 'active' && <button style={s.sprintBtn} onClick={() => updateSprintStatus(i, 'done')}>Mark Complete</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RetrospectiveTab({ data, onSave }) {
  const retros = data.retrospectives || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newRetro, setNewRetro] = useState({ cycle: '', wentWell: '', improve: '', lessons: '' });

  const addRetro = () => {
    if (!newRetro.wentWell.trim()) return;
    onSave({ retrospectives: [...retros, { ...newRetro, date: new Date().toISOString().split('T')[0] }] });
    setNewRetro({ cycle: '', wentWell: '', improve: '', lessons: '' });
    setShowAdd(false);
  };

  return (
    <div>
      <SectionHead title="What We Learned" sub="After each work cycle, take 30 minutes to reflect. What went well? What needs to change? What did you learn? This is how you get better with every cycle." />

      <button style={s.primaryBtn} onClick={() => setShowAdd(p => !p)}>+ Add a Reflection</button>

      {showAdd && (
        <div style={s.addCard}>
          <label style={s.label}>Which cycle is this for?</label>
          <input style={s.input} placeholder="e.g. Cycle 1" value={newRetro.cycle} onChange={e => setNewRetro(p => ({ ...p, cycle: e.target.value }))} />
          <label style={s.label}>What went well?</label>
          <textarea style={s.textarea} placeholder="What worked and should be kept..." rows={3} value={newRetro.wentWell} onChange={e => setNewRetro(p => ({ ...p, wentWell: e.target.value }))} />
          <label style={s.label}>What needs to improve?</label>
          <textarea style={s.textarea} placeholder="What did not work and needs to change..." rows={3} value={newRetro.improve} onChange={e => setNewRetro(p => ({ ...p, improve: e.target.value }))} />
          <label style={s.label}>Key lessons learned</label>
          <textarea style={s.textarea} placeholder="What will you do differently next cycle..." rows={3} value={newRetro.lessons} onChange={e => setNewRetro(p => ({ ...p, lessons: e.target.value }))} />
          <button style={s.primaryBtn} onClick={addRetro}>Save Reflection</button>
        </div>
      )}

      {retros.length === 0 && !showAdd && <p style={s.emptyText}>No reflections added yet. Add one after each work cycle.</p>}

      {retros.map((r, i) => (
        <div key={i} style={s.retroCard}>
          <div style={s.retroHeader}>
            <p style={s.retroCycle}>{r.cycle || `Reflection ${i + 1}`}</p>
            <p style={s.retroDate}>{r.date ? formatDate(r.date) : ''}</p>
          </div>
          <div style={s.retroSection}>
            <p style={s.retroSectionLabel}>What went well</p>
            <p style={s.retroText}>{r.wentWell}</p>
          </div>
          <div style={s.retroSection}>
            <p style={s.retroSectionLabel}>What needs to improve</p>
            <p style={s.retroText}>{r.improve}</p>
          </div>
          <div style={s.retroSection}>
            <p style={s.retroSectionLabel}>Key lessons</p>
            <p style={s.retroText}>{r.lessons}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StakeholdersTab({ data, onSave }) {
  const stakeholders = data.stakeholders || [];
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [influence, setInfluence] = useState('high');
  const [comms, setComms] = useState('');

  const add = () => {
    if (!name.trim()) return;
    onSave({ stakeholders: [...stakeholders, { name, role, influence, comms }] });
    setName(''); setRole(''); setComms('');
  };

  const remove = (i) => onSave({ stakeholders: stakeholders.filter((_, idx) => idx !== i) });

  const influenceColors = { high: { bg: '#FEF2F2', color: '#DC2626' }, medium: { bg: '#FFFBEB', color: '#D97706' }, low: { bg: '#F0FDF4', color: '#15803D' } };

  return (
    <div>
      <SectionHead title="Who Is Involved" sub="List every person or group who has an interest in this project. This includes people who will use it, approve it, fund it or be affected by it. Knowing who they are helps you manage expectations and communicate well." />

      <div style={s.addCard}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={s.label}>Name or group</label>
            <input style={s.input} placeholder="e.g. Investors" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={s.label}>Their role in this project</label>
            <input style={s.input} placeholder="e.g. Provide funding" value={role} onChange={e => setRole(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={s.label}>How much influence do they have?</label>
            <select style={s.select} value={influence} onChange={e => setInfluence(e.target.value)}>
              <option value="high">High — can stop or change the project</option>
              <option value="medium">Medium — has some say</option>
              <option value="low">Low — just needs to be kept informed</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={s.label}>How will you communicate with them?</label>
            <input style={s.input} placeholder="e.g. Weekly email update" value={comms} onChange={e => setComms(e.target.value)} />
          </div>
        </div>
        <button style={s.primaryBtn} onClick={add}>Add Person or Group</button>
      </div>

      {stakeholders.length === 0 && <p style={s.emptyText}>No stakeholders added yet.</p>}

      {stakeholders.map((st, i) => {
        const ic = influenceColors[st.influence] || influenceColors.medium;
        return (
          <div key={i} style={s.stakeholderCard}>
            <div style={s.stakeholderLeft}>
              <div style={s.memberAvatar}>{st.name[0]?.toUpperCase()}</div>
              <div>
                <p style={s.memberName}>{st.name}</p>
                <p style={s.memberRole}>{st.role}</p>
                {st.comms && <p style={s.stakeholderComms}>📢 {st.comms}</p>}
              </div>
            </div>
            <div style={s.stakeholderRight}>
              <span style={{ ...s.pill, background: ic.bg, color: ic.color }}>{st.influence} influence</span>
              <button style={s.removeSmallBtn} onClick={() => remove(i)}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScopeTab({ data, onSave }) {
  const scope = data.scope || {};
  const [deliverable, setDeliverable] = useState('');
  const [assumption, setAssumption] = useState('');
  const [constraint, setConstraint] = useState('');
  const [excluded, setExcluded] = useState('');

  const addToList = (field, value, setter) => {
    if (!value.trim()) return;
    const current = scope[field] || [];
    onSave({ scope: { ...scope, [field]: [...current, value.trim()] } });
    setter('');
  };

  const removeFromList = (field, i) => {
    const current = (scope[field] || []).filter((_, idx) => idx !== i);
    onSave({ scope: { ...scope, [field]: current } });
  };

  return (
    <div>
      <SectionHead title="Scope" sub="Define exactly what this project will and will not deliver. Being clear about this from the start prevents confusion and scope creep later." />

      <div style={s.goalCard}>
        <p style={s.sectionLabel}>Project Goal</p>
        <p style={s.goalText}>{scope.goal || 'No goal defined.'}</p>
      </div>

      {[
        { field: 'deliverables', label: 'What will this project deliver?', hint: 'List the specific outputs e.g. a mobile app, a report, a working prototype', value: deliverable, setter: setDeliverable, placeholder: 'Add a deliverable...' },
        { field: 'assumptions', label: 'What are we assuming?', hint: 'Things you believe are true but have not confirmed e.g. The client will provide branding assets by week 2', value: assumption, setter: setAssumption, placeholder: 'Add an assumption...' },
        { field: 'constraints', label: 'What is limiting us?', hint: 'Fixed limitations e.g. budget cap, must launch before a specific date, must use existing infrastructure', value: constraint, setter: setConstraint, placeholder: 'Add a constraint...' },
        { field: 'exclusions', label: 'What is NOT included in this project?', hint: 'Being clear about what you will not do prevents people from adding things later', value: excluded, setter: setExcluded, placeholder: 'Add something that is out of scope...' },
      ].map(({ field, label, hint, value, setter, placeholder }) => (
        <div key={field} style={s.scopeSection}>
          <p style={s.scopeLabel}>{label}</p>
          <p style={s.scopeHint}>{hint}</p>
          <div style={s.addRow}>
            <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder={placeholder} value={value} onChange={e => setter(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToList(field, value, setter)} />
            <button style={s.addBtn} onClick={() => addToList(field, value, setter)}>Add</button>
          </div>
          {(scope[field] || []).map((item, i) => (
            <div key={i} style={s.scopeItem}>
              <div style={s.scopeDot} />
              <span style={s.scopeItemText}>{item}</span>
              <button style={s.removeSmallBtn} onClick={() => removeFromList(field, i)}>✕</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlanningTab({ data, onSave, methodology }) {
  const planning = data.planning || {};

  const updateField = (field, value) => onSave({ planning: { ...planning, [field]: value } });

  const areas = methodology === 'Agile' ? [
    { key: 'timeline', label: 'Timeline', hint: 'When does the project start and end? How many work cycles do you expect?' },
    { key: 'resources', label: 'Who and What Do You Need?', hint: 'List the people, tools and budget needed to deliver this project.' },
    { key: 'quality', label: 'How Will You Know It Is Good Enough?', hint: 'What does done look like? What standards does the work need to meet?' },
    { key: 'communications', label: 'How Will You Keep Everyone Informed?', hint: 'Who gets updates? How often? Through what channel?' },
  ] : [
    { key: 'timeline', label: 'Timeline and Milestones', hint: 'Break the project into phases. What happens in each phase and when?' },
    { key: 'resources', label: 'Who and What Do You Need?', hint: 'List the people, tools, equipment and budget required.' },
    { key: 'quality', label: 'Quality Standards', hint: 'What does a successful output look like? Who approves it?' },
    { key: 'communications', label: 'Communication Plan', hint: 'Who gets what information, how often and through what channel?' },
    { key: 'procurement', label: 'What Do You Need to Buy or Hire?', hint: 'List any external services, tools or contractors you need to bring in.' },
    { key: 'budget', label: 'Budget Overview', hint: 'What is the total budget? How is it allocated across phases?' },
  ];

  return (
    <div>
      <SectionHead title="Planning" sub="Good planning prevents surprises. Fill in each area below so you have a complete picture of how this project will run." />
      {areas.map(({ key, label, hint }) => (
        <div key={key} style={s.planningSection}>
          <p style={s.scopeLabel}>{label}</p>
          <p style={s.scopeHint}>{hint}</p>
          <textarea style={s.textarea} rows={4} placeholder={`Add your ${label.toLowerCase()} details here...`} value={planning[key] || ''} onChange={e => updateField(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function RisksComplianceTab({ data, onSave }) {
  const risks = data.risks || [];
  const compliance = data.compliance || { flags: [], internal: [], external: [] };
  const [newRisk, setNewRisk] = useState('');
  const [newLevel, setNewLevel] = useState('medium');
  const [newInternal, setNewInternal] = useState('');
  const [newExternal, setNewExternal] = useState('');

  const addRisk = () => {
    if (!newRisk.trim()) return;
    onSave({ risks: [...risks, { title: newRisk.trim(), level: newLevel, status: 'open' }] });
    setNewRisk('');
  };

  const toggleRisk = (i) => {
    const updated = risks.map((r, idx) => idx === i ? { ...r, status: r.status === 'open' ? 'mitigated' : 'open' } : r);
    onSave({ risks: updated });
  };

  const addCompliance = (type, value, setter) => {
    if (!value.trim()) return;
    const current = compliance[type] || [];
    onSave({ compliance: { ...compliance, [type]: [...current, value.trim()] } });
    setter('');
  };

  const removeCompliance = (type, i) => {
    onSave({ compliance: { ...compliance, [type]: (compliance[type] || []).filter((_, idx) => idx !== i) } });
  };

  const levelColors = { high: { bg: '#FEF2F2', color: '#DC2626' }, medium: { bg: '#FFFBEB', color: '#D97706' }, low: { bg: '#F0FDF4', color: '#15803D' } };

  return (
    <div>
      <SectionHead title="Risks and Compliance" sub="Know what could go wrong before it happens. Also keep track of rules and policies your project needs to follow." />

      <p style={s.scopeLabel}>What Could Go Wrong?</p>
      <p style={s.scopeHint}>List anything that could delay, block or derail this project. The earlier you spot risks the easier they are to manage.</p>
      <div style={s.addRow}>
        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Describe a risk..." value={newRisk} onChange={e => setNewRisk(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRisk()} />
        <select style={s.select} value={newLevel} onChange={e => setNewLevel(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button style={s.addBtn} onClick={addRisk}>Add</button>
      </div>

      {risks.length === 0 && <p style={s.emptyText}>No risks added yet.</p>}
      {risks.map((r, i) => {
        const lc = levelColors[r.level] || levelColors.medium;
        return (
          <div key={i} style={s.riskCard}>
            <span style={{ ...s.pill, background: lc.bg, color: lc.color, flexShrink: 0 }}>{r.level}</span>
            <p style={{ ...s.riskTitle, textDecoration: r.status === 'mitigated' ? 'line-through' : 'none', color: r.status === 'mitigated' ? '#9CA3AF' : BL }}>{r.title}</p>
            <button style={{ ...s.sprintBtn, background: r.status === 'mitigated' ? '#F0FDF4' : WH, color: r.status === 'mitigated' ? '#15803D' : '#6B7280', flexShrink: 0 }} onClick={() => toggleRisk(i)}>
              {r.status === 'mitigated' ? 'Handled' : 'Mark Handled'}
            </button>
          </div>
        );
      })}

      <div style={{ marginTop: 32 }}>
        <p style={s.scopeLabel}>Internal Rules and Policies</p>
        <p style={s.scopeHint}>Company policies, approval processes or internal standards this project must follow.</p>
        <div style={s.addRow}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. All features must go through a security review before launch" value={newInternal} onChange={e => setNewInternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('internal', newInternal, setNewInternal)} />
          <button style={s.addBtn} onClick={() => addCompliance('internal', newInternal, setNewInternal)}>Add</button>
        </div>
        {(compliance.internal || []).map((item, i) => (
          <div key={i} style={s.scopeItem}>
            <div style={{ ...s.scopeDot, background: '#7C3AED' }} />
            <span style={s.scopeItemText}>{item}</span>
            <button style={s.removeSmallBtn} onClick={() => removeCompliance('internal', i)}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <p style={s.scopeLabel}>External Rules and Regulations</p>
        <p style={s.scopeHint}>Government regulations, industry standards or legal requirements this project must comply with.</p>
        <div style={s.addRow}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. Must comply with NDPR data protection requirements" value={newExternal} onChange={e => setNewExternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('external', newExternal, setNewExternal)} />
          <button style={s.addBtn} onClick={() => addCompliance('external', newExternal, setNewExternal)}>Add</button>
        </div>
        {(compliance.external || []).map((item, i) => (
          <div key={i} style={s.scopeItem}>
            <div style={{ ...s.scopeDot, background: '#DC2626' }} />
            <span style={s.scopeItemText}>{item}</span>
            <button style={s.removeSmallBtn} onClick={() => removeCompliance('external', i)}>✕</button>
          </div>
        ))}
        {(compliance.flags || []).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={s.scopeHint}>PM Buddy flagged these based on your industry:</p>
            {compliance.flags.map((f, i) => (
              <div key={i} style={s.scopeItem}>
                <div style={{ ...s.scopeDot, background: '#D97706' }} />
                <span style={s.scopeItemText}>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressTab({ data, onSave, methodology }) {
  const milestones = data.milestones || [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(milestones);

  const statusColors = {
    done: { bg: '#F0FDF4', color: '#15803D', label: 'Done' },
    in_progress: { bg: '#EFF6FF', color: BLUE, label: 'In Progress' },
    pending: { bg: '#F9FAFB', color: '#6B7280', label: 'Pending' },
  };

  const updateDraft = (i, field, val) => {
    const updated = [...draft];
    updated[i] = { ...updated[i], [field]: val };
    setDraft(updated);
  };

  const addMilestone = () => {
    setDraft(prev => [...prev, { title: '', date: '', status: 'pending' }]);
  };

  const removeMilestone = (i) => {
    setDraft(prev => prev.filter((_, idx) => idx !== i));
  };

  const saveEdits = () => {
    const cleaned = draft.filter(m => m.title.trim());
    onSave({ milestones: cleaned });
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(milestones);
    setEditing(false);
  };

  const cycleStatus = (i) => {
    const order = ['pending', 'in_progress', 'done'];
    const current = milestones[i].status || 'pending';
    const next = order[(order.indexOf(current) + 1) % order.length];
    const updated = milestones.map((m, idx) => idx === i ? { ...m, status: next } : m);
    onSave({ milestones: updated });
  };

  return (
    <div>
      <SectionHead title="Progress" sub="Track where things stand. Click a milestone status to cycle through Pending, In Progress and Done. Use Edit to rename milestones or add new ones." />

      <div style={s.timelineRange}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={s.timelineDateLabel}>Start Date</p>
          <p style={s.timelineDateVal}>{data.timeline?.start ? formatDate(data.timeline.start) : 'Not set'}</p>
        </div>
        <div style={{ flex: 1, height: 2, background: BLUE, borderRadius: 1 }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={s.timelineDateLabel}>End Date</p>
          <p style={s.timelineDateVal}>{data.timeline?.end ? formatDate(data.timeline.end) : 'Not set'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={s.sectionLabel}>Milestones</p>
        {!editing ? (
          <button style={{ ...s.sprintBtn, fontSize: 12 }} onClick={() => { setDraft([...milestones]); setEditing(true); }}>Edit Milestones</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...s.sprintBtn, background: BLUE, color: WH, borderColor: BLUE, fontSize: 12 }} onClick={saveEdits}>Save</button>
            <button style={{ ...s.sprintBtn, fontSize: 12 }} onClick={cancelEdit}>Cancel</button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          {milestones.length === 0 && <p style={s.emptyText}>No milestones yet. Click Edit Milestones to add some.</p>}
          {milestones.map((m, i) => {
            const sc = statusColors[m.status] || statusColors.pending;
            return (
              <div key={i} style={s.milestoneCard}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...s.milestoneName, textDecoration: m.status === 'done' ? 'line-through' : 'none', color: m.status === 'done' ? '#9CA3AF' : BL }}>{m.title}</p>
                  <p style={s.milestoneDate}>{m.date ? formatDate(m.date) : 'No date set'}</p>
                </div>
                <button
                  style={{ ...s.pill, background: sc.bg, color: sc.color, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
                  onClick={() => cycleStatus(i)}
                  title="Click to change status"
                >
                  {sc.label}
                </button>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {draft.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
              <input
                style={{ ...s.input, flex: 2, marginBottom: 0, fontSize: 13 }}
                placeholder="Milestone title"
                value={m.title}
                onChange={e => updateDraft(i, 'title', e.target.value)}
              />
              <input
                style={{ ...s.input, flex: 1, marginBottom: 0, fontSize: 13, minWidth: 120 }}
                type="date"
                value={m.date || ''}
                onChange={e => updateDraft(i, 'date', e.target.value)}
              />
              <select
                style={{ ...s.select, fontSize: 12 }}
                value={m.status || 'pending'}
                onChange={e => updateDraft(i, 'status', e.target.value)}
              >
                <option value="done">Done</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
              </select>
              <button style={s.removeSmallBtn} onClick={() => removeMilestone(i)}>✕</button>
            </div>
          ))}
          <button style={s.addBtn} onClick={addMilestone}>+ Add Milestone</button>
        </>
      )}
    </div>
  );
}

function DocumentsTab({ data, methodology, user, openDoc }) {
  return <DocumentGenerator data={data} methodology={methodology} user={user} openDoc={openDoc} />;
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
  wrap: { maxWidth: 900, margin: '0 auto' },
  header: { marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 12, display: 'block' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  headerLeft: {},
  title: { fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: BL, letterSpacing: '-0.8px', marginBottom: 10 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  industryBadge: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  methodBox: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  methodBadge: { fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100 },
  switchBtn: { fontSize: 12, fontWeight: 600, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' },
  methodPicker: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, marginBottom: 20 },
  methodPickerTitle: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 },
  methodPickerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 },
  methodPickerCard: { padding: 16, border: '2px solid', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' },
  methodPickerName: { fontSize: 15, fontWeight: 800, marginBottom: 6 },
  methodPickerReason: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },
  tabBar: { display: 'flex', borderBottom: '1.5px solid #E5E7EB', marginBottom: 20, overflowX: 'auto' },
  tabBtn: { padding: '10px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s' },
  content: { background: WH, borderRadius: 20, padding: '28px', border: '1px solid #E5E7EB' },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 },
  sectionHeadWrap: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionHeadTitle: { fontSize: 18, fontWeight: 800, color: BL, marginBottom: 4, letterSpacing: '-0.3px' },
  sectionHeadSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  overviewCard: { background: GREY, borderRadius: 14, padding: '18px', border: '1px solid #E5E7EB' },
  overviewLabel: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  overviewNum: { fontSize: 28, fontWeight: 900, color: BLUE, letterSpacing: '-1px', marginBottom: 6 },
  overviewSub: { fontSize: 12, color: '#6B7280' },
  miniBar: { height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  miniBarFill: { height: '100%', background: BLUE, borderRadius: 2 },
  approachCard: { borderRadius: 12, padding: '14px 16px', marginBottom: 20 },
  approachLabel: { fontSize: 12, fontWeight: 800, marginBottom: 6 },
  approachText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  overviewSection: { marginBottom: 20 },
  goalCard: { background: GREY, borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid #E5E7EB' },
  goalText: { fontSize: 15, color: BL, lineHeight: 1.7 },
  milestoneRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  milestoneCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  milestoneCheck: { width: 20, height: 20, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  milestoneName: { fontSize: 14, fontWeight: 600, color: BL, marginBottom: 2 },
  milestoneDate: { fontSize: 12, color: '#9CA3AF' },
  complianceAlert: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' },
  complianceAlertTitle: { fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  complianceFlag: { fontSize: 13, color: '#92400E', lineHeight: 1.7 },
  pill: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  input: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 14, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 14, boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  select: { padding: '11px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: BL, outline: 'none' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 },
  addRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 },
  addBtn: { padding: '11px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  primaryBtn: { padding: '11px 22px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, display: 'inline-block' },
  addCard: { background: GREY, borderRadius: 14, padding: 20, border: '1px solid #E5E7EB', marginBottom: 20 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' },
  removeSmallBtn: { background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', flexShrink: 0 },
  checkBtn: { width: 22, height: 22, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  epicCard: { background: GREY, borderRadius: 14, border: '1px solid #E5E7EB', marginBottom: 10, overflow: 'hidden' },
  epicHeader: { display: 'flex', alignItems: 'center', padding: '14px 16px' },
  epicToggle: { flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  epicArrow: { fontSize: 10, color: '#9CA3AF', flexShrink: 0 },
  epicTitle: { fontSize: 15, fontWeight: 700, color: BL, flex: 1 },
  epicCount: { fontSize: 11, color: '#9CA3AF', fontWeight: 600 },
  epicBody: { padding: '0 16px 16px', borderTop: '1px solid #E5E7EB', paddingTop: 16 },
  epicBodyLabel: { fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 },
  epicBodyHint: { fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 12 },
  storyRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' },
  storyTitle: { flex: 1, fontSize: 13, fontWeight: 600 },
  sprintCard: { background: GREY, borderRadius: 14, padding: '18px', border: '1px solid #E5E7EB', marginBottom: 10 },
  sprintHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sprintNum: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  sprintGoal: { fontSize: 15, fontWeight: 700, color: BL, marginBottom: 4 },
  sprintMeta: { fontSize: 12, color: '#9CA3AF' },
  sprintActions: { display: 'flex', gap: 8 },
  sprintBtn: { padding: '7px 14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: WH, color: '#374151' },
  retroCard: { background: GREY, borderRadius: 14, padding: '20px', border: '1px solid #E5E7EB', marginBottom: 12 },
  retroHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  retroCycle: { fontSize: 14, fontWeight: 800, color: BL },
  retroDate: { fontSize: 12, color: '#9CA3AF' },
  retroSection: { marginBottom: 12 },
  retroSectionLabel: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  retroText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  stakeholderCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px', background: GREY, borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 10 },
  stakeholderLeft: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  stakeholderRight: { display: 'flex', alignItems: 'center', gap: 8 },
  stakeholderComms: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  memberAvatar: { width: 36, height: 36, borderRadius: '50%', background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 },
  memberName: { fontSize: 14, fontWeight: 700, color: BL, marginBottom: 2 },
  memberRole: { fontSize: 12, color: '#6B7280' },
  scopeSection: { marginBottom: 24 },
  scopeLabel: { fontSize: 13, fontWeight: 800, color: BL, marginBottom: 4 },
  scopeHint: { fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 12 },
  scopeItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' },
  scopeDot: { width: 8, height: 8, borderRadius: '50%', background: BLUE, flexShrink: 0, marginTop: 5 },
  scopeItemText: { flex: 1, fontSize: 14, color: BL, lineHeight: 1.6 },
  planningSection: { marginBottom: 24 },
  riskCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  riskTitle: { flex: 1, fontSize: 14, fontWeight: 600 },
  timelineRange: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: GREY, borderRadius: 12, padding: '18px' },
  timelineDateLabel: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  timelineDateVal: { fontSize: 15, fontWeight: 800, color: BL },
  docCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: GREY, borderRadius: 12, marginBottom: 10, border: '1px solid #E5E7EB' },
  docTitle: { fontSize: 14, fontWeight: 800, color: BL, marginBottom: 4 },
  docDesc: { fontSize: 13, color: '#6B7280' },
  downloadBtn: { padding: '8px 16px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
};
