import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AiLoading from './AiLoading';
import Icon from './Icon';
import useSpeech from '../lib/useSpeech';

const BLUE = 'var(--accent)';
const BL = 'var(--text)';
const WH = 'var(--surface)';
const GREY = 'var(--surface-2)';

const FIELDS = ['Technology', 'Health', 'Education', 'Business', 'Community', 'Events', 'Creative', 'Other'];
const STATUS_LABELS = { done: 'Done', in_progress: 'In progress', pending: 'To do' };
const DRAFT_KEY = (userId) => `pmb_wizard_draft_v2_${userId || 'anon'}`;

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

function toInputDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ─── Voice fields ─────────────────────────────────────────────
function VoiceField({ id, label, value, onChange, placeholder, rows, hint }) {
  const { listening, start, baseTextRef } = useSpeech('en-US');
  const handleChange = (e) => { baseTextRef.current = e.target.value; onChange(e.target.value); };
  const handleMic = useCallback(() => { start(value, onChange); }, [start, value, onChange]);
  const multi = rows && rows > 1;
  return (
    <div style={{ marginBottom: 22 }}>
      <label htmlFor={id} style={s.label}>{label}</label>
      {hint && <p id={`${id}-hint`} style={s.hint}>{hint}</p>}
      <div style={{ display: 'flex', gap: 8, alignItems: multi ? 'flex-start' : 'center' }}>
        {multi
          ? <textarea id={id} style={s.textarea} placeholder={placeholder} value={value} onChange={handleChange} rows={rows} aria-describedby={hint ? `${id}-hint` : undefined} />
          : <input id={id} style={s.input} placeholder={placeholder} value={value} onChange={handleChange} aria-describedby={hint ? `${id}-hint` : undefined} />}
        <button type="button" style={{ ...s.micBtn, background: listening ? 'var(--bad)' : BLUE, height: 48 }}
          onClick={handleMic} aria-label={listening ? 'Stop voice input' : 'Speak instead of typing'} aria-pressed={listening}>
          {listening ? <StopIcon /> : <MicIcon />}
        </button>
      </div>
      {listening && <div style={s.listening} role="status"><span style={s.dot} />Listening. Speak naturally and tap the red button when done.</div>}
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────
export default function ProjectWizard({ user, onComplete, onBack, onImport }) {
  const userId = typeof user === 'string' ? user : user?.id;
  const today = toInputDate(new Date());

  const blank = {
    name: '', description: '', industry: '',
    teamType: 'solo', teamMembers: [{ name: '', role: '' }],
    startDate: today, endDate: '', noEnd: false,
    doneSoFar: '', milestones: [],
  };

  const readDraft = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY(userId)) || 'null');
      if (saved && saved.data && (saved.data.name || saved.data.description)) return saved.data;
    } catch (e) { /* no draft */ }
    return null;
  };

  const [draft] = useState(readDraft);
  const [data, setData] = useState(() => ({ ...blank, ...(draft || {}) }));
  const [showDraftNote, setShowDraftNote] = useState(!!draft);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [stepsNote, setStepsNote] = useState('');
  const [refining, setRefining] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const autoTried = useRef(false);
  const topRef = useRef(null);

  const alreadyStarted = !!data.startDate && data.startDate < today;

  // The draft is kept on this device so a closed tab does not lose the work.
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY(userId), JSON.stringify({ data, savedAt: Date.now() })); } catch (e) { /* storage unavailable */ }
  }, [data, userId]);

  useEffect(() => { if (topRef.current) topRef.current.scrollIntoView({ block: 'start' }); }, [step]);

  const update = (key, val) => setData(p => ({ ...p, [key]: val }));
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY(userId)); } catch (e) { /* ignore */ } };

  const startFresh = () => {
    clearDraft();
    setData(blank);
    autoTried.current = false;
    setShowDraftNote(false);
  };

  const endBeforeStart = !data.noEnd && data.endDate && data.startDate && data.endDate < data.startDate;

  const problem = (() => {
    if (step === 1 && (!data.name.trim() || !data.description.trim())) return 'Add a project name and a short description to continue.';
    if (step === 2 && !data.startDate) return 'Choose a start date to continue.';
    if (step === 2 && endBeforeStart) return 'The end date comes before the start date. Please check the dates.';
    return '';
  })();

  // ── AI helpers ──
  const callAi = async (prompt) => {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error('AI error');
    const result = await res.json();
    return (result.result || '').trim();
  };

  const refineDescription = async () => {
    setRefining(true);
    try {
      const out = await callAi(`Rewrite this as a clear, simple description of a project, in one or two plain sentences that say what it is, who it is for and what it will achieve. Keep the person's meaning. No jargon, no emoji.\n\n"${data.description}"\n\nReturn ONLY the rewritten text.`);
      if (out) setSuggestion(out);
    } catch (e) { /* the button simply does nothing, the original text stays */ }
    setRefining(false);
  };

  const suggestSteps = async (append) => {
    setSuggesting(true);
    setStepsNote('');
    const started = alreadyStarted
      ? `It has already started. Done so far: ${data.doneSoFar.trim() || 'not said'}. Mark steps that are clearly finished "done", the current one "in_progress", and the rest "pending".`
      : 'It is new, so mark every step "pending".';
    const prompt = `Suggest 5 key steps (milestones) for this project, in the order they would happen.\nProject: ${data.name}\nWhat it is for: ${data.description}\n${data.industry ? `Field: ${data.industry}\n` : ''}${started}\nUse short plain words, 6 words or fewer each. No emoji.\nReturn ONLY a JSON array like [{"title":"...","status":"pending"}]`;
    try {
      const raw = await callAi(prompt);
      const clean = raw.replace(/```json|```/g, '');
      const a = clean.indexOf('[');
      const b = clean.lastIndexOf(']');
      if (a < 0 || b <= a) throw new Error('no list');
      const list = JSON.parse(clean.slice(a, b + 1))
        .filter(m => m && m.title)
        .map(m => ({ title: String(m.title), date: '', status: STATUS_LABELS[m.status] ? m.status : 'pending' }));
      if (!list.length) throw new Error('empty');
      setData(p => {
        if (!append) return { ...p, milestones: list };
        const have = new Set(p.milestones.map(m => m.title.trim().toLowerCase()));
        return { ...p, milestones: [...p.milestones, ...list.filter(m => !have.has(m.title.trim().toLowerCase()))] };
      });
    } catch (e) {
      setData(p => (p.milestones.length ? p : { ...p, milestones: [
        { title: 'Get started', date: '', status: 'pending' },
        { title: 'First result ready', date: '', status: 'pending' },
        { title: 'Check progress and feedback', date: '', status: 'pending' },
        { title: 'Finish and review', date: '', status: 'pending' },
      ] }));
      setStepsNote('PM Buddy could not suggest steps just now, so here is a simple starting set. Change them any way you like.');
    }
    setSuggesting(false);
  };

  const next = () => {
    if (problem) return;
    const to = step + 1;
    setStep(to);
    if (to === 3 && !data.milestones.length && !autoTried.current) {
      autoTried.current = true;
      suggestSteps(false);
    }
  };

  const back = () => { if (step === 1) { onBack(); } else setStep(step - 1); };

  // ── People and steps lists ──
  const updateMember = (i, field, val) => setData(p => ({ ...p, teamMembers: p.teamMembers.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)) }));
  const addMember = () => setData(p => ({ ...p, teamMembers: [...p.teamMembers, { name: '', role: '' }] }));
  const removeMember = (i) => setData(p => ({ ...p, teamMembers: p.teamMembers.filter((_, idx) => idx !== i) }));
  const updateStep = (i, field, val) => setData(p => ({ ...p, milestones: p.milestones.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)) }));
  const addStep = () => setData(p => ({ ...p, milestones: [...p.milestones, { title: '', date: '', status: 'pending' }] }));
  const removeStep = (i) => setData(p => ({ ...p, milestones: p.milestones.filter((_, idx) => idx !== i) }));

  // ── Save ──
  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    if (!userId) { setSaveMsg('You need to be logged in to create a project.'); setSaving(false); return; }
    const withOthers = data.teamType === 'team';
    const { data: project, error } = await supabase.from('pm_projects').insert({
      user_id: userId,
      owner_email: typeof user === 'string' ? '' : (user?.email || ''),
      name: data.name.trim(),
      description: data.description.trim(),
      industry: data.industry || 'General',
      team_type: withOthers ? 'team' : 'solo',
      methodology: withOthers ? 'Hybrid' : 'Agile',
      status: 'active',
      scope: { goal: data.description.trim(), deliverables: [], currentPhase: '', completedWork: data.doneSoFar.trim(), remainingWork: '' },
      timeline: { start: data.startDate, end: data.noEnd ? '' : data.endDate },
      resources: { tools: [], budget: '' },
      risks: [],
      team: withOthers ? data.teamMembers.filter(m => m.name.trim()).map(m => ({ name: m.name.trim(), role: m.role.trim() })) : [],
      milestones: data.milestones.filter(m => m.title.trim()).map(m => ({ title: m.title.trim(), date: m.date || '', status: m.status || 'pending' })),
      compliance: { industry: data.industry || 'General', flags: [] },
      planning: { communications: '', blockers: '' },
    }).select().single();

    setSaving(false);
    if (error) { setSaveMsg(`Could not create the project: ${error.message}`); return; }
    if (!project) { setSaveMsg('Something went wrong. Please try again.'); return; }
    clearDraft();
    onComplete(project);
  };

  const titles = { 1: 'What are you working on?', 2: 'Who is on it, and when?', 3: 'What are the key steps?' };
  const subs = {
    1: 'Just the basics. You can change anything later.',
    2: 'A rough idea is fine. You can change all of this later.',
    3: 'PM Buddy suggests steps from what you told it. Change, add or remove any of them.',
  };

  return (
    <div style={s.page}>
      <div style={s.wrap} ref={topRef}>
        <div style={s.topRow}>
          <button type="button" style={s.backBtn} onClick={back}><Icon name="arrow-left" size={15} style={{ marginRight: 6 }} />{step === 1 ? 'Back to dashboard' : 'Back'}</button>
          <span style={s.stepCount}>Step {step} of 3</span>
        </div>
        <div style={s.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={step} aria-label={`Step ${step} of 3`}>
          <div style={{ ...s.progressFill, width: `${(step / 3) * 100}%` }} />
        </div>

        <div style={s.card}>
          {showDraftNote && step === 1 && (
            <div style={s.note} role="status">
              <span>You have an unfinished project{draft && draft.name ? `: “${draft.name}”` : ''}. We filled it back in.</span>
              <button type="button" style={s.linkBtn} onClick={startFresh}>Start fresh</button>
            </div>
          )}
          {step === 1 && onImport && (
            <button type="button" style={s.importLink} onClick={onImport}><Icon name="upload" size={15} style={{ marginRight: 8 }} />Have a plan or proposal? Upload it instead</button>
          )}

          <h2 style={s.stepTitle}>{titles[step]}</h2>
          <p style={s.stepSub}>{subs[step]}</p>

          {step === 1 && (
            <div>
              <VoiceField id="pw-name" label="Project name (required)" value={data.name} onChange={v => update('name', v)} placeholder="e.g. Community coding class" />
              <VoiceField id="pw-desc" label="What is it for? (required)" hint="One or two sentences: what it is, who it helps, what it should achieve."
                value={data.description} onChange={v => { update('description', v); if (suggestion) setSuggestion(''); }} placeholder="e.g. A free weekend coding class for 30 young people in our area" rows={3} />
              {data.description.trim().length > 20 && !suggestion && (
                <button type="button" style={s.aiBtn} onClick={refineDescription} disabled={refining}>
                  <Icon name="spark" size={14} style={{ marginRight: 6 }} />{refining ? 'Working on it...' : 'Make this clearer'}
                </button>
              )}
              {suggestion && (
                <div style={s.suggestionBox} role="status">
                  <p style={s.suggestionLabel}>A clearer version</p>
                  <p style={s.suggestionText}>{suggestion}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={s.acceptBtn} onClick={() => { update('description', suggestion); setSuggestion(''); }}>Use this</button>
                    <button type="button" style={s.dismissBtn} onClick={() => setSuggestion('')}>Keep mine</button>
                  </div>
                </div>
              )}
              <p style={{ ...s.label, marginTop: 22 }} id="pw-field-label">Area of work (optional)</p>
              <div style={s.chips} role="group" aria-labelledby="pw-field-label">
                {FIELDS.map(f => (
                  <button key={f} type="button" aria-pressed={data.industry === f} onClick={() => update('industry', data.industry === f ? '' : f)}
                    style={{ ...s.chip, ...(data.industry === f ? s.chipOn : null) }}>{f}</button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={s.label} id="pw-who-label">Who is working on it?</p>
              <div style={s.seg} role="group" aria-labelledby="pw-who-label">
                {[{ v: 'solo', t: 'Just me' }, { v: 'team', t: 'Me and others' }].map(o => (
                  <button key={o.v} type="button" aria-pressed={data.teamType === o.v} onClick={() => update('teamType', o.v)}
                    style={{ ...s.segBtn, ...(data.teamType === o.v ? s.segOn : null) }}>{o.t}</button>
                ))}
              </div>
              {data.teamType === 'team' && (
                <div style={{ marginBottom: 22 }}>
                  <p style={s.hint}>Names are optional. You can also invite people by email from the People tab once the project is created.</p>
                  {data.teamMembers.map((m, i) => (
                    <div key={i} style={s.memberRow}>
                      <input style={s.inputInline} aria-label={`Person ${i + 1} name`} placeholder="Name" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                      <input style={s.inputInline} aria-label={`Person ${i + 1} role`} placeholder="Role (optional)" value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} />
                      {data.teamMembers.length > 1 && <button type="button" style={s.removeBtn} onClick={() => removeMember(i)} aria-label={`Remove person ${i + 1}`}><Icon name="x" size={16} /></button>}
                    </div>
                  ))}
                  <button type="button" style={s.addBtn} onClick={addMember}>+ Add another person</button>
                </div>
              )}

              <div style={s.dateRow}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label htmlFor="pw-start" style={s.label}>When does it start?</label>
                  <input id="pw-start" style={s.dateInput} type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label htmlFor="pw-end" style={s.label}>When should it end? (optional)</label>
                  <input id="pw-end" style={{ ...s.dateInput, opacity: data.noEnd ? 0.5 : 1 }} type="date" value={data.noEnd ? '' : data.endDate} disabled={data.noEnd} onChange={e => update('endDate', e.target.value)} />
                </div>
              </div>
              <label style={s.check}>
                <input type="checkbox" checked={data.noEnd} onChange={e => update('noEnd', e.target.checked)} style={{ width: 20, height: 20 }} />
                <span>No fixed end date</span>
              </label>
              {endBeforeStart && <div style={s.warn} role="alert">The end date comes before the start date.</div>}

              {alreadyStarted && (
                <div style={{ marginTop: 24 }}>
                  <VoiceField id="pw-done" label="This has already started. What has been done so far? (optional)"
                    value={data.doneSoFar} onChange={v => update('doneSoFar', v)} placeholder="e.g. Venue booked, 12 people signed up" rows={3} />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              {suggesting && <AiLoading compact kind="think" title="Suggesting steps for your project" />}
              {stepsNote && <div style={s.note} role="status">{stepsNote}</div>}
              {!suggesting && data.milestones.map((m, i) => (
                <div key={i} style={s.stepRow}>
                  <input style={{ ...s.inputInline, flex: '2 1 200px' }} aria-label={`Step ${i + 1}`} placeholder={`Step ${i + 1}, e.g. First version ready`} value={m.title} onChange={e => updateStep(i, 'title', e.target.value)} />
                  <input style={{ ...s.inputInline, flex: '1 1 140px' }} type="date" aria-label={`Step ${i + 1} date (optional)`} value={m.date || ''} onChange={e => updateStep(i, 'date', e.target.value)} />
                  {alreadyStarted && (
                    <select style={s.select} aria-label={`Step ${i + 1} progress`} value={m.status} onChange={e => updateStep(i, 'status', e.target.value)}>
                      {Object.keys(STATUS_LABELS).map(k => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
                    </select>
                  )}
                  <button type="button" style={s.removeBtn} onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`}><Icon name="x" size={16} /></button>
                </div>
              ))}
              {!suggesting && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  <button type="button" style={s.addBtn} onClick={addStep}>+ Add a step</button>
                  <button type="button" style={s.addBtn} onClick={() => suggestSteps(data.milestones.length > 0)}>{data.milestones.length ? 'Suggest more steps' : 'Suggest steps for me'}</button>
                </div>
              )}
              <p style={{ ...s.hint, marginTop: 18 }}>Dates are optional. Risks, tasks and your team can be added inside the project.</p>
            </div>
          )}

          <div style={s.footer}>
            {saveMsg && <p style={s.error} role="alert">{saveMsg}</p>}
            {problem && <p style={s.problem} role="status">{problem}</p>}
            {step < 3 ? (
              <button type="button" style={{ ...s.nextBtn, opacity: problem ? 0.55 : 1 }} onClick={next} aria-disabled={!!problem}>Continue</button>
            ) : (
              <button type="button" style={{ ...s.nextBtn, opacity: saving || suggesting ? 0.6 : 1 }} onClick={save} disabled={saving || suggesting}>
                {saving ? 'Creating your project...' : 'Create project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MicIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
}

function StopIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
}

const field = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', background: WH, minHeight: 48 };

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', padding: '28px 16px 80px' },
  wrap: { maxWidth: 620, margin: '0 auto' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 },
  backBtn: { background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0', display: 'inline-flex', alignItems: 'center', minHeight: 44 },
  stepCount: { fontSize: 15, fontWeight: 700, color: 'var(--text-2)' },
  progressTrack: { height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: '100%', background: BLUE, borderRadius: 3, transition: 'width 0.3s ease' },
  card: { background: WH, borderRadius: 20, padding: '28px 24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' },
  stepTitle: { fontFamily: 'var(--font-head)', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: BL, marginBottom: 6, letterSpacing: '-0.02em' },
  stepSub: { fontSize: 16, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 },
  label: { display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  hint: { fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 10 },
  input: { ...field, flex: 1 },
  textarea: { ...field, flex: 1, resize: 'vertical', lineHeight: 1.6 },
  inputInline: { ...field, flex: 1, minWidth: 0 },
  dateInput: { ...field },
  select: { ...field, width: 'auto', flex: '0 0 auto', padding: '10px 10px', cursor: 'pointer' },
  micBtn: { width: 48, border: 'none', borderRadius: 12, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listening: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--bad-text)', fontWeight: 600, padding: '8px 12px', background: 'var(--bad-tint)', borderRadius: 10, border: '1px solid var(--bad-border)', marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--bad)', flexShrink: 0 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { padding: '10px 16px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: WH, color: 'var(--text-2)', minHeight: 44 },
  chipOn: { background: 'var(--accent-tint)', color: 'var(--accent-text)', borderColor: 'var(--accent)' },
  seg: { display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' },
  segBtn: { flex: 1, minWidth: 140, padding: '14px 16px', border: '1.5px solid var(--border)', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: WH, color: 'var(--text-2)', minHeight: 52 },
  segOn: { background: 'var(--accent-tint)', color: 'var(--accent-text)', borderColor: 'var(--accent)' },
  memberRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 },
  stepRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  dateRow: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 },
  check: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--text-2)', cursor: 'pointer', minHeight: 44 },
  removeBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addBtn: { background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0', minHeight: 44 },
  aiBtn: { display: 'inline-flex', alignItems: 'center', padding: '9px 16px', background: GREY, color: 'var(--text)', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 6 },
  suggestionBox: { background: 'var(--ok-tint)', border: '1px solid var(--ok-border)', borderRadius: 12, padding: '14px 16px', marginBottom: 6 },
  suggestionLabel: { fontSize: 13, fontWeight: 700, color: 'var(--ok-text)', marginBottom: 6 },
  suggestionText: { fontSize: 15, color: 'var(--text)', lineHeight: 1.65, marginBottom: 12 },
  acceptBtn: { padding: '9px 18px', background: 'var(--ok)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  dismissBtn: { padding: '9px 16px', background: 'none', color: 'var(--text-2)', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  note: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: 'var(--text)', marginBottom: 18, lineHeight: 1.5 },
  linkBtn: { background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0', textDecoration: 'underline' },
  importLink: { display: 'inline-flex', alignItems: 'center', textAlign: 'left', background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0', marginBottom: 14, minHeight: 44 },
  warn: { background: 'var(--bad-tint)', border: '1px solid var(--bad-border)', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: 'var(--bad-text)', lineHeight: 1.5, marginTop: 8 },
  footer: { marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border)' },
  problem: { fontSize: 15, color: 'var(--text-2)', marginBottom: 12, textAlign: 'center' },
  error: { fontSize: 15, color: 'var(--bad-text)', marginBottom: 12, textAlign: 'center' },
  nextBtn: { width: '100%', padding: '15px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 52 },
};
