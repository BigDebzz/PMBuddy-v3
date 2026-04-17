import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const INDUSTRIES = [
  'Fintech', 'Health', 'Education', 'Agriculture', 'Logistics',
  'E-commerce', 'Real Estate', 'Media', 'Government', 'Other'
];

function useSpeech() {
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const onUpdateRef = useRef(null);
  const [listening, setListening] = useState(false);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback((currentValue, onUpdate) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser. Please use Chrome.'); return; }
    if (recognitionRef.current) { stop(); return; }
    onUpdateRef.current = onUpdate;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    baseTextRef.current = (currentValue || '').trim();
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) { final += t; } else { interim += t; }
      }
      if (final) { baseTextRef.current = baseTextRef.current ? baseTextRef.current + ' ' + final.trim() : final.trim(); }
      const display = baseTextRef.current ? (interim ? baseTextRef.current + ' ' + interim : baseTextRef.current) : interim;
      if (onUpdateRef.current) onUpdateRef.current(display);
    };
    recognition.onend = () => { if (onUpdateRef.current) onUpdateRef.current(baseTextRef.current); setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognition.start();
  }, [stop]);

  return { listening, start, stop, baseTextRef };
}

function VoiceTextarea({ value, onChange, placeholder, rows = 3 }) {
  const { listening, start, baseTextRef } = useSpeech();
  const handleChange = (e) => { baseTextRef.current = e.target.value; onChange(e.target.value); };
  const handleMic = useCallback(() => { start(value, onChange); }, [start, value, onChange]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea style={vs.textarea} placeholder={placeholder} value={value} onChange={handleChange} rows={rows} />
        <button type="button" style={{ ...vs.micBtn, background: listening ? '#DC2626' : BLUE }} onClick={handleMic}>{listening ? <StopIcon /> : <MicIcon />}</button>
      </div>
      {listening && <div style={vs.badge}><span style={vs.dot} />Listening... speak naturally. Click stop when done.</div>}
    </div>
  );
}

function VoiceInput({ value, onChange, placeholder }) {
  const { listening, start, baseTextRef } = useSpeech();
  const handleChange = (e) => { baseTextRef.current = e.target.value; onChange(e.target.value); };
  const handleMic = useCallback(() => { start(value, onChange); }, [start, value, onChange]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input style={vs.input} placeholder={placeholder} value={value} onChange={handleChange} />
        <button type="button" style={{ ...vs.micBtnSm, background: listening ? '#DC2626' : BLUE }} onClick={handleMic}>{listening ? <StopIcon /> : <MicIcon />}</button>
      </div>
      {listening && <div style={{ ...vs.badge, marginTop: 6 }}><span style={vs.dot} />Listening...</div>}
    </div>
  );
}

const vs = {
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  input: { flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', background: WH, width: '100%' },
  micBtn: { width: 44, height: 80, border: 'none', borderRadius: 10, color: WH, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  micBtnSm: { width: 44, height: 44, border: 'none', borderRadius: 10, color: WH, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#DC2626', fontWeight: 600, padding: '6px 10px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#DC2626', flexShrink: 0 },
};

function MilestoneEditor({ milestones, onChange, industry, description, isOngoing }) {
  const [suggesting, setSuggesting] = useState(false);

  const addMilestone = () => onChange([...milestones, { title: '', date: '', status: isOngoing ? 'done' : 'pending' }]);

  const updateMilestone = (i, field, val) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };

  const removeMilestone = (i) => onChange(milestones.filter((_, idx) => idx !== i));

  const suggestMilestones = async () => {
    setSuggesting(true);
    const prompt = `List 5 project milestones for a ${industry || 'general'} project. ${description ? `Project: ${description}` : ''} ${isOngoing ? 'Project is in progress, mix done and upcoming.' : 'New project, all pending.'}

Respond with ONLY a raw JSON array. No explanation. No markdown. No code blocks. Just the array:
[{"title":"milestone name","status":"pending"},{"title":"milestone name","status":"pending"}]`;

    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      if (!res.ok) throw new Error('API error');
      const result = await res.json();
      const raw = result.result || result.text || '';
      if (!raw) throw new Error('Empty response');
      const clean = raw.replace(/```json|```/g, '').trim();
      const firstBracket = clean.indexOf('[');
      const lastBracket = clean.lastIndexOf(']');
      if (firstBracket === -1 || lastBracket === -1) throw new Error('No JSON array found');
      const parsed = JSON.parse(clean.substring(firstBracket, lastBracket + 1));
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty array');
      onChange(parsed.map(m => ({ title: m.title || '', date: '', status: m.status || 'pending' })));
    } catch (err) {
      console.error('Milestone suggest error:', err);
      onChange([
        { title: 'Project Kickoff', date: '', status: isOngoing ? 'done' : 'pending' },
        { title: 'Planning Complete', date: '', status: isOngoing ? 'done' : 'pending' },
        { title: 'First Deliverable', date: '', status: isOngoing ? 'in_progress' : 'pending' },
        { title: 'Review and Feedback', date: '', status: 'pending' },
        { title: 'Project Complete', date: '', status: 'pending' },
      ]);
    }
    setSuggesting(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label style={s.label}>Milestones</label>
        <button style={s.aiSuggestBtn} onClick={suggestMilestones} disabled={suggesting}>{suggesting ? 'Suggesting...' : 'AI Suggest'}</button>
      </div>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
        {isOngoing ? 'Mark milestones as done, in progress or pending to show where you are now.' : 'Add your key project milestones. PM Buddy can suggest them based on your project.'}
      </p>
      {milestones.map((m, i) => (
        <div key={i} style={s.milestoneRow}>
          <input style={{ ...s.milestoneInput, flex: 2 }} placeholder={`Milestone ${i + 1} e.g. MVP Launch`} value={m.title} onChange={e => updateMilestone(i, 'title', e.target.value)} />
          <input style={{ ...s.milestoneInput, flex: 1 }} type="date" value={m.date || ''} onChange={e => updateMilestone(i, 'date', e.target.value)} />
          <select style={s.milestoneStatus} value={m.status} onChange={e => updateMilestone(i, 'status', e.target.value)}>
            <option value="done">Done</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
          </select>
          <button style={s.removeBtn} onClick={() => removeMilestone(i)}>✕</button>
        </div>
      ))}
      <button style={s.addBtn} onClick={addMilestone}>+ Add Milestone</button>
    </div>
  );
}

const DRAFT_KEY = 'pmb_wizard_draft';

export default function ProjectWizard({ user, onComplete, onBack }) {
  const [projectType, setProjectType] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  const defaultData = {
    name: '', description: '', goal: '', industry: '',
    teamType: 'solo', teamMembers: [{ name: '', role: '' }],
    startDate: '', endDate: '', topRisks: ['', '', ''],
    milestones: [],
    currentPhase: '', completedWork: '', remainingWork: '',
    blockers: '', communicationFlow: '', methodology: '',
  };

  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) { const parsed = JSON.parse(saved); return { ...defaultData, ...parsed.data }; }
    } catch {}
    return defaultData;
  });

  useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.projectType) setProjectType(parsed.projectType);
        if (parsed.step) setStep(parsed.step);
      }
    } catch {}
  });

  const saveDraft = useCallback((newData, newStep, newType) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: newData, step: newStep, projectType: newType, savedAt: Date.now() })); } catch {}
  }, []);

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  const update = useCallback((key, val) => {
    setData(p => { const updated = { ...p, [key]: val }; saveDraft(updated, step, projectType); return updated; });
  }, [step, projectType, saveDraft]);

  const progress = step === 0 ? 0 : ((step - 1) / 4) * 100;

  const next = () => { const newStep = step + 1; setStep(newStep); saveDraft(data, newStep, projectType); };
  const back = () => {
    if (step === 0) { onBack(); return; }
    if (step === 1) { setProjectType(null); setStep(0); saveDraft(data, 0, null); return; }
    const newStep = step - 1; setStep(newStep); saveDraft(data, newStep, projectType);
  };

  const addMember = () => setData(p => ({ ...p, teamMembers: [...p.teamMembers, { name: '', role: '' }] }));
  const updateMember = (i, field, val) => { const members = [...data.teamMembers]; members[i][field] = val; setData(p => ({ ...p, teamMembers: members })); };
  const removeMember = (i) => setData(p => ({ ...p, teamMembers: p.teamMembers.filter((_, idx) => idx !== i) }));

  const selectType = (type) => {
    if (step !== 0) return;
    setProjectType(type);
    const milestones = type === 'ongoing'
      ? [{ title: '', date: '', status: 'done' }, { title: '', date: '', status: 'in_progress' }, { title: '', date: '', status: 'pending' }]
      : [{ title: 'Project Kickoff', date: '', status: 'pending' }, { title: 'First Deliverable', date: '', status: 'pending' }, { title: 'Midpoint Review', date: '', status: 'pending' }];
    setData(p => { const updated = { ...p, milestones }; saveDraft(updated, 1, type); return updated; });
    setStep(1);
  };

  const [refining, setRefining] = useState({ description: false, goal: false });
  const [suggestions, setSuggestions] = useState({ description: '', goal: '' });

  const refineField = async (field, value) => {
    if (!value.trim()) return;
    setRefining(p => ({ ...p, [field]: true }));
    const prompts = {
      description: `You are PM Buddy, a friendly project management coach helping everyday people plan their projects better. Someone described their project like this: "${value}"

Your job is to rewrite this as a clear, simple 2-3 sentence project description that anyone can understand. No jargon. No corporate speak. Just plain English that explains what the project is, who it is for, and what it will do. Keep the person's original idea — just make it cleaner and clearer.

Return ONLY the rewritten description. Nothing else.`,

      goal: `You are PM Buddy, a friendly project management coach. Someone was asked "what does success look like for your project?" and they wrote: "${value}"

They may have described what done looks like rather than a proper goal. Turn this into a clear, measurable project goal that answers: WHO will benefit, WHAT will change or be achieved, and HOW they will know it worked.

Use simple everyday language. No jargon. Write it as one or two sentences starting with "This project will succeed when..." or similar. Make it specific and realistic based on what they wrote.

Return ONLY the rewritten goal. Nothing else.`,
    };
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompts[field] }) });
      const result = await res.json();
      const refined = (result.result || '').trim();
      if (refined) setSuggestions(p => ({ ...p, [field]: refined }));
    } catch (err) { console.error(err); }
    setRefining(p => ({ ...p, [field]: false }));
  };

  const acceptSuggestion = (field) => {
    update(field, suggestions[field]);
    setSuggestions(p => ({ ...p, [field]: '' }));
  };

  const canProceed = () => {
    if (step === 1) return data.name.trim() && data.description.trim() && data.goal.trim() && data.industry;
    if (step === 3 && projectType === 'new') return data.startDate && data.endDate;
    return true;
  };

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    const userId = typeof user === 'string' ? user : user?.id;
    const userEmail = typeof user === 'string' ? '' : (user?.email || '');
    if (!userId) { setSaveMsg('You must be logged in.'); setSaving(false); return; }
    const methodology = data.methodology || deriveMethodology(data);

    const { data: project, error } = await supabase.from('pm_projects').insert({
      user_id: userId,
      owner_email: userEmail,
      name: data.name,
      description: data.description,
      industry: data.industry,
      team_type: data.teamType,
      methodology,
      status: 'active',
      scope: { goal: data.goal, deliverables: [], currentPhase: data.currentPhase, completedWork: data.completedWork, remainingWork: data.remainingWork },
      timeline: { start: data.startDate, end: data.endDate },
      resources: { tools: [], budget: '' },
      risks: data.topRisks.filter(r => r.trim()).map(r => ({ title: r, level: 'medium', status: 'open' })),
      team: data.teamMembers.filter(m => m.name.trim()),
      milestones: data.milestones.filter(m => m.title.trim()),
      compliance: { industry: data.industry, flags: getComplianceFlags(data.industry) },
      planning: { communications: data.communicationFlow, blockers: data.blockers },
    }).select().single();

    setSaving(false);
    if (error) { setSaveMsg(`Could not save: ${error.message}`); return; }
    if (!project) { setSaveMsg('Something went wrong. Please try again.'); return; }

    clearDraft();
    setGenerating(true);

    try {
      const briefPrompt = `You are a professional project manager. Write a concise project brief for this project.

Project: ${data.name}
Industry: ${data.industry}
Type: ${projectType === 'ongoing' ? 'Already in progress' : 'New project'}
Description: ${data.description}
Goal: ${data.goal}
Methodology: ${methodology}
Team: ${data.teamType === 'solo' ? 'Solo project' : data.teamMembers.filter(m => m.name).map(m => `${m.name} (${m.role})`).join(', ')}
Timeline: ${data.startDate ? `${data.startDate} to ${data.endDate}` : 'Not set'}
${projectType === 'ongoing' ? `Current Phase: ${data.currentPhase}\nCompleted: ${data.completedWork}\nRemaining: ${data.remainingWork}\nBlockers: ${data.blockers}` : ''}
Risks: ${data.topRisks.filter(r => r.trim()).join(', ') || 'None listed'}
Milestones: ${data.milestones.filter(m => m.title).map(m => m.title).join(', ')}

Write a professional project brief in HTML (h1 for title, h2 for sections, p for paragraphs). No html/head/body tags. Include: Project Overview, Objectives, Scope, Team and Roles, Timeline, Key Risks, Success Metrics. Make it specific to their actual inputs. Minimum 400 words.`;

      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: briefPrompt, mode: 'document' }) });
      if (res.ok) {
        const result = await res.json();
        const content = (result.result || '').replace(/```html|```/g, '').trim();
        if (content && content.length > 100) {
          await supabase.from('documents').insert({ user_id: userId, project_id: project.id, project_name: data.name, type: 'pm', title: `${data.name} — Project Brief`, content });
        }
      }
    } catch (err) { console.error('Brief generation error:', err); }

    setGenerating(false);
    onComplete(project);
  };

  if (step === 0) {
    return (
      <div style={s.page}>
        <div style={s.wrap}>
          <button style={s.backBtn} onClick={back}>← Back</button>
          <div style={s.card}>
            <p style={s.stepTag}>New Project</p>
            <h2 style={s.stepTitle}>Is this a new project or one already in progress?</h2>
            <p style={s.stepSub}>This helps PM Buddy ask the right questions and set up your workspace correctly.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <button style={s.typeCard} onClick={() => selectType('new')}>
                <div style={s.typeIcon}>◈</div>
                <div><p style={s.typeName}>Starting Fresh</p><p style={s.typeDesc}>I am starting this project from scratch. Help me plan it properly from the beginning.</p></div>
              </button>
              <button style={s.typeCard} onClick={() => selectType('ongoing')}>
                <div style={{ ...s.typeIcon, background: '#EFF6FF', color: BLUE }}>↻</div>
                <div><p style={s.typeName}>Already in Progress</p><p style={s.typeDesc}>This project is already running. I want to bring it into PM Buddy to manage it better from here.</p></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const STEPS_NEW = ['Basics', 'Team', 'Timeline', 'Milestones', 'Review'];
  const STEPS_ONGOING = ['Basics', 'Current Status', 'Team', 'Milestones', 'Review'];
  const stepLabels = projectType === 'new' ? STEPS_NEW : STEPS_ONGOING;

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <button style={s.backBtn} onClick={back}>← Back</button>
        <div style={s.progressTrack}><div style={{ ...s.progressFill, width: `${progress}%` }} /></div>
        <div style={s.steps}>
          {stepLabels.map((label, i) => (
            <div key={i} style={{ ...s.stepPill, background: step > i ? BLUE : step === i + 1 ? BLUE : '#E5E7EB', color: step >= i + 1 ? WH : '#9CA3AF' }}>{label}</div>
          ))}
        </div>

        <div style={s.card}>
          {step === 1 && (
            <div>
              <p style={s.stepTag}>{projectType === 'ongoing' ? 'Ongoing Project' : 'New Project'} · Step 1 of 5</p>
              <h2 style={s.stepTitle}>Tell Us About Your Project</h2>
              <p style={s.stepSub}>{projectType === 'ongoing' ? 'Start with what this project is about.' : 'The clearer you are here the better PM Buddy can support you.'}</p>
              <label style={s.label}>Project Name</label>
              <div style={{ marginBottom: 20 }}><VoiceInput value={data.name} onChange={v => update('name', v)} placeholder="e.g. Product Launch, Community Training, App Development" /></div>
              <label style={s.label}>What is this project about?</label>
              <div style={{ marginBottom: suggestions.description ? 8 : 20 }}>
                <VoiceTextarea value={data.description} onChange={v => update('description', v)} placeholder="Describe what this project is and what it is trying to achieve." rows={3} />
              </div>
              {data.description.trim().length > 20 && !suggestions.description && (
                <button style={s.refineBtn} onClick={() => refineField('description', data.description)} disabled={refining.description}>
                  {refining.description ? 'Refining...' : 'AI Refine'}
                </button>
              )}
              {suggestions.description && (
                <div style={s.suggestionBox}>
                  <p style={s.suggestionLabel}>AI Suggestion</p>
                  <p style={s.suggestionText}>{suggestions.description}</p>
                  <div style={s.suggestionActions}>
                    <button style={s.acceptBtn} onClick={() => acceptSuggestion('description')}>Use this</button>
                    <button style={s.dismissBtn} onClick={() => setSuggestions(p => ({ ...p, description: '' }))}>Keep mine</button>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }} />
              <label style={s.label}>What does success look like?</label>
              <div style={{ marginBottom: suggestions.goal ? 8 : 20 }}>
                <VoiceTextarea value={data.goal} onChange={v => update('goal', v)} placeholder="What outcome are you trying to achieve? Be specific." rows={3} />
              </div>
              {data.goal.trim().length > 20 && !suggestions.goal && (
                <button style={s.refineBtn} onClick={() => refineField('goal', data.goal)} disabled={refining.goal}>
                  {refining.goal ? 'Refining...' : 'AI Refine'}
                </button>
              )}
              {suggestions.goal && (
                <div style={s.suggestionBox}>
                  <p style={s.suggestionLabel}>AI Suggestion</p>
                  <p style={s.suggestionText}>{suggestions.goal}</p>
                  <div style={s.suggestionActions}>
                    <button style={s.acceptBtn} onClick={() => acceptSuggestion('goal')}>Use this</button>
                    <button style={s.dismissBtn} onClick={() => setSuggestions(p => ({ ...p, goal: '' }))}>Keep mine</button>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }} />
              <label style={s.label}>Industry</label>
              <div style={s.industryGrid}>
                {INDUSTRIES.map(ind => (
                  <button key={ind} style={{ ...s.industryBtn, background: data.industry === ind ? BLUE : WH, color: data.industry === ind ? WH : BL, borderColor: data.industry === ind ? BLUE : '#E5E7EB' }} onClick={() => update('industry', ind)}>{ind}</button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && projectType === 'new' && (
            <div>
              <p style={s.stepTag}>New Project · Step 2 of 5</p>
              <h2 style={s.stepTitle}>Who is working on this?</h2>
              <p style={s.stepSub}>Even if it is just you, defining roles prevents confusion later.</p>
              <div style={s.teamTypeGrid}>
                {[{ val: 'solo', label: 'Just Me', desc: 'I am building this alone' }, { val: 'small', label: 'Small Team', desc: '2 to 5 people' }, { val: 'large', label: 'Larger Team', desc: '6 or more people' }].map(t => (
                  <button key={t.val} style={{ ...s.teamTypeBtn, borderColor: data.teamType === t.val ? BLUE : '#E5E7EB', background: data.teamType === t.val ? '#EFF6FF' : WH }} onClick={() => update('teamType', t.val)}>
                    <p style={{ ...s.teamTypeName, color: data.teamType === t.val ? BLUE : BL }}>{t.label}</p>
                    <p style={s.teamTypeDesc}>{t.desc}</p>
                  </button>
                ))}
              </div>
              {data.teamType !== 'solo' && (
                <div style={{ marginTop: 24 }}>
                  <label style={s.label}>Team Members</label>
                  {data.teamMembers.map((m, i) => (
                    <div key={i} style={s.memberRow}>
                      <input style={s.inputInline} placeholder="Name" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                      <input style={s.inputInline} placeholder="Role e.g. Developer" value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} />
                      {i > 0 && <button style={s.removeBtn} onClick={() => removeMember(i)}>✕</button>}
                    </div>
                  ))}
                  <button style={s.addBtn} onClick={addMember}>+ Add Member</button>
                </div>
              )}
            </div>
          )}

          {step === 2 && projectType === 'ongoing' && (
            <div>
              <p style={s.stepTag}>Ongoing Project · Step 2 of 5</p>
              <h2 style={s.stepTitle}>Where are you right now?</h2>
              <p style={s.stepSub}>Help PM Buddy understand what has already happened and what is still to come.</p>
              <label style={s.label}>What phase or stage is the project in?</label>
              <div style={{ marginBottom: 20 }}><VoiceInput value={data.currentPhase} onChange={v => update('currentPhase', v)} placeholder="e.g. Planning, Development, Testing, Launch Preparation" /></div>
              <label style={s.label}>What has already been done?</label>
              <div style={{ marginBottom: 20 }}><VoiceTextarea value={data.completedWork} onChange={v => update('completedWork', v)} placeholder="List what has been completed so far. Be specific." rows={3} /></div>
              <label style={s.label}>What is still left to do?</label>
              <div style={{ marginBottom: 20 }}><VoiceTextarea value={data.remainingWork} onChange={v => update('remainingWork', v)} placeholder="What work remains before this project is done?" rows={3} /></div>
              <label style={s.label}>What are the current blockers or challenges?</label>
              <div style={{ marginBottom: 20 }}><VoiceTextarea value={data.blockers} onChange={v => update('blockers', v)} placeholder="What is slowing things down or could cause problems?" rows={3} /></div>
              <label style={s.label}>How does the team currently communicate?</label>
              <div style={{ marginBottom: 20 }}><VoiceInput value={data.communicationFlow} onChange={v => update('communicationFlow', v)} placeholder="e.g. WhatsApp group, weekly meetings, email updates" /></div>
              <label style={s.label}>What approach are you using to manage this project?</label>
              <div style={s.methodGrid}>
                {[
                  { val: 'Agile', desc: 'Flexible, iterative, adapt as you go' },
                  { val: 'Predictive', desc: 'Structured plan, fixed phases and approvals' },
                  { val: 'Hybrid', desc: 'Mix of both — plan the big picture, stay flexible on details' },
                  { val: 'Not sure', desc: 'I am not sure — help me figure it out' },
                ].map(m => (
                  <button key={m.val} style={{ ...s.methodBtn, borderColor: data.methodology === m.val ? BLUE : '#E5E7EB', background: data.methodology === m.val ? '#EFF6FF' : WH }} onClick={() => update('methodology', m.val)}>
                    <p style={{ ...s.methodName, color: data.methodology === m.val ? BLUE : BL }}>{m.val}</p>
                    <p style={s.methodDesc}>{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && projectType === 'new' && (
            <div>
              <p style={s.stepTag}>New Project · Step 3 of 5</p>
              <h2 style={s.stepTitle}>When does this need to happen?</h2>
              <p style={s.stepSub}>Set realistic dates. PM Buddy will flag if your timeline looks too tight.</p>
              <label style={s.label}>Start Date</label>
              <input style={s.input} type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
              <label style={s.label}>Target End Date</label>
              <input style={s.input} type="date" value={data.endDate} onChange={e => update('endDate', e.target.value)} />
              {data.startDate && data.endDate && <TimelineCheck start={data.startDate} end={data.endDate} />}
              <div style={{ marginTop: 24 }}>
                <label style={s.label}>Top Risks</label>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>What could go wrong? Name your top concerns.</p>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <VoiceInput value={data.topRisks[i]} onChange={v => { const r = [...data.topRisks]; r[i] = v; update('topRisks', r); }} placeholder={getRiskPlaceholder(i, data.industry)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && projectType === 'ongoing' && (
            <div>
              <p style={s.stepTag}>Ongoing Project · Step 3 of 5</p>
              <h2 style={s.stepTitle}>Who is on this project?</h2>
              <p style={s.stepSub}>Add the team members already working on this project and their roles.</p>
              <label style={s.label}>Start Date</label>
              <input style={s.input} type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
              <label style={s.label}>Target End Date</label>
              <input style={s.input} type="date" value={data.endDate} onChange={e => update('endDate', e.target.value)} />
              <div style={{ marginTop: 20 }}>
                <label style={s.label}>Team Members</label>
                {data.teamMembers.map((m, i) => (
                  <div key={i} style={s.memberRow}>
                    <input style={s.inputInline} placeholder="Name" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                    <input style={s.inputInline} placeholder="Role e.g. Developer" value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} />
                    {i > 0 && <button style={s.removeBtn} onClick={() => removeMember(i)}>✕</button>}
                  </div>
                ))}
                <button style={s.addBtn} onClick={addMember}>+ Add Member</button>
              </div>
              <div style={{ marginTop: 24 }}>
                <label style={s.label}>Risks and Concerns</label>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>What are the biggest risks right now?</p>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <VoiceInput value={data.topRisks[i]} onChange={v => { const r = [...data.topRisks]; r[i] = v; update('topRisks', r); }} placeholder={getRiskPlaceholder(i, data.industry)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <p style={s.stepTag}>{projectType === 'ongoing' ? 'Ongoing' : 'New'} Project · Step 4 of 5</p>
              <h2 style={s.stepTitle}>Project Milestones</h2>
              <p style={s.stepSub}>{projectType === 'ongoing' ? 'Show where you are now. Mark completed milestones as done, current ones as in progress.' : 'Set the key checkpoints for your project. Use AI Suggest to get milestone ideas.'}</p>
              <MilestoneEditor milestones={data.milestones} onChange={v => update('milestones', v)} industry={data.industry} description={data.description} isOngoing={projectType === 'ongoing'} />
            </div>
          )}

          {step === 5 && (
            <div>
              <p style={s.stepTag}>Step 5 of 5</p>
              <h2 style={s.stepTitle}>Review Your Project</h2>
              <p style={s.stepSub}>Everything can be updated later inside your project workspace.</p>
              <div style={s.reviewGrid}>
                <ReviewItem label="Project Name" value={data.name} />
                <ReviewItem label="Industry" value={data.industry} />
                <ReviewItem label="Type" value={projectType === 'ongoing' ? 'Ongoing Project' : 'New Project'} />
                <ReviewItem label="Goal" value={data.goal} />
                <ReviewItem label="Team" value={data.teamType === 'solo' ? 'Solo' : `${data.teamMembers.filter(m => m.name).length} members`} />
                <ReviewItem label="Milestones" value={`${data.milestones.filter(m => m.title.trim()).length} set`} />
                {projectType === 'ongoing' && <ReviewItem label="Current Phase" value={data.currentPhase || 'Not set'} />}
                {projectType === 'ongoing' && <ReviewItem label="Blockers" value={data.blockers ? 'Noted' : 'None noted'} />}
              </div>
              {data.industry && (
                <div style={s.complianceCard}>
                  <p style={s.complianceLabel}>Compliance Heads Up</p>
                  <p style={s.complianceText}>{getComplianceText(data.industry)}</p>
                </div>
              )}
            </div>
          )}

          <div style={s.footer}>
            {saveMsg && <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>{saveMsg}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={s.backFooterBtn} onClick={back}>← Back</button>
              {step < 5 ? (
                <button style={{ ...s.nextBtn, opacity: canProceed() ? 1 : 0.5, flex: 1 }} onClick={next} disabled={!canProceed()}>Continue</button>
              ) : (
                <button style={{ ...s.nextBtn, flex: 1 }} onClick={save} disabled={saving || generating}>
                  {generating ? 'Generating your project brief...' : saving ? 'Saving...' : 'Save My Project'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div style={s.reviewItem}>
      <p style={s.reviewLabel}>{label}</p>
      <p style={s.reviewValue}>{value || 'Not set'}</p>
    </div>
  );
}

function TimelineCheck({ start, end }) {
  const days = Math.ceil((new Date(end) - new Date(start)) / 86400000);
  if (days < 0) return <div style={s.timelineWarn}>Your end date is before your start date.</div>;
  if (days < 14) return <div style={s.timelineWarn}>Very tight timeline of {days} days. Make sure your scope is small.</div>;
  return <div style={s.timelineOk}>You have {days} days. {days < 30 ? 'Stay focused on your core deliverables.' : 'A workable timeline.'}</div>;
}

function deriveMethodology(data) {
  if (data.methodology && data.methodology !== 'Not sure') return data.methodology;
  if (data.teamType === 'solo') return 'Agile';
  if (data.industry === 'Government' || data.industry === 'Health') return 'Predictive';
  return 'Hybrid';
}

function getComplianceFlags(industry) {
  const flags = { Fintech: ['CBN regulatory compliance', 'NDPR', 'KYC'], Health: ['Patient data privacy', 'Medical regulations'], Education: ['Student data protection'], Government: ['Procurement regulations'] };
  return flags[industry] || [];
}

function getComplianceText(industry) {
  const texts = { Fintech: 'As a fintech project you need to be aware of CBN regulations, NDPR data protection requirements and KYC obligations.', Health: 'Health projects must handle patient data with strict privacy controls.', Education: 'Ensure any student data you collect is protected and content is properly licensed.', Government: 'Government projects require formal procurement processes and public data policies.' };
  return texts[industry] || `Research regulatory requirements specific to ${industry} in your target market.`;
}

function getRiskPlaceholder(i, industry) {
  const defaults = { Fintech: ['Regulatory approval delays', 'Payment integration issues', 'Security vulnerabilities'], Health: ['Data privacy compliance gaps', 'User adoption resistance', 'Regulatory approvals'], default: ['Timeline slipping', 'Team member unavailability', 'Budget overrun'] };
  return (defaults[industry] || defaults.default)[i] || 'Describe a risk...';
}

function MicIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
}

function StopIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '40px 24px 80px' },
  wrap: { maxWidth: 640, margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24, padding: '8px 0', display: 'block' },
  progressTrack: { height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.4s ease' },
  steps: { display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' },
  stepPill: { padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' },
  card: { background: WH, borderRadius: 20, padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' },
  stepTag: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 },
  stepTitle: { fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 900, color: BL, marginBottom: 8, letterSpacing: '-0.5px' },
  stepSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 28 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: '0.02em' },
  input: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 20, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  inputInline: { flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  industryGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  industryBtn: { padding: '9px 16px', border: '1.5px solid', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  teamTypeGrid: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  teamTypeBtn: { flex: 1, minWidth: 140, padding: '16px', border: '1.5px solid', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  teamTypeName: { fontSize: 15, fontWeight: 800, marginBottom: 4 },
  teamTypeDesc: { fontSize: 12, color: '#6B7280' },
  methodGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 },
  methodBtn: { padding: '14px 16px', border: '1.5px solid', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  methodName: { fontSize: 14, fontWeight: 700, marginBottom: 3 },
  methodDesc: { fontSize: 12, color: '#6B7280' },
  memberRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 },
  removeBtn: { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit', flexShrink: 0 },
  addBtn: { background: 'none', border: 'none', color: BLUE, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginTop: 4 },
  milestoneRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  milestoneInput: { border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', background: WH, minWidth: 80 },
  milestoneStatus: { border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '10px 8px', fontSize: 12, fontFamily: 'inherit', color: BL, background: WH, cursor: 'pointer' },
  aiSuggestBtn: { padding: '6px 14px', background: BLUE, color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  refineBtn: { padding: '6px 14px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12, display: 'inline-block' },
  suggestionBox: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px', marginBottom: 12 },
  suggestionLabel: { fontSize: 10, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  suggestionText: { fontSize: 14, color: '#166534', lineHeight: 1.7, marginBottom: 12 },
  suggestionActions: { display: 'flex', gap: 8 },
  acceptBtn: { padding: '6px 16px', background: '#15803D', color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  dismissBtn: { padding: '6px 14px', background: 'none', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  timelineWarn: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#DC2626', lineHeight: 1.6, marginTop: 8 },
  timelineOk: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: BLUE, lineHeight: 1.6, marginTop: 8 },
  reviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  reviewItem: { background: GREY, borderRadius: 10, padding: '14px 16px' },
  reviewLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  reviewValue: { fontSize: 14, fontWeight: 700, color: BL },
  complianceCard: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px' },
  complianceLabel: { fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
  complianceText: { fontSize: 14, color: '#92400E', lineHeight: 1.7 },
  footer: { marginTop: 32, paddingTop: 24, borderTop: '1px solid #F3F4F6' },
  nextBtn: { width: '100%', padding: '14px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  backFooterBtn: { padding: '14px 20px', background: 'none', color: '#6B7280', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  typeCard: { display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px', border: '1.5px solid #E5E7EB', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', background: WH, width: '100%' },
  typeIcon: { width: 44, height: 44, borderRadius: 10, background: BL, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  typeName: { fontSize: 16, fontWeight: 700, color: BL, marginBottom: 6 },
  typeDesc: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },
};
