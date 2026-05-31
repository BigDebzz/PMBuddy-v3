import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const DRAFT_KEY = 'pmbuddy_campaign_draft';

const STEPS = [
  { num: 1, label: 'About' },
  { num: 2, label: 'Concept' },
  { num: 3, label: 'Details' },
  { num: 4, label: 'AI Review' },
  { num: 5, label: 'Plan' },
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
    if (!SR) { alert('Voice input requires Chrome.'); return; }
    if (recognitionRef.current) { stop(); return; }

    onUpdateRef.current = onUpdate;
    const r = new SR();
    r.lang = 'en-NG';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    recognitionRef.current = r;
    baseTextRef.current = (currentValue || '').trim();

    r.onstart = () => setListening(true);
    r.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) baseTextRef.current = baseTextRef.current ? baseTextRef.current + ' ' + final.trim() : final.trim();
      const display = baseTextRef.current ? (interim ? baseTextRef.current + ' ' + interim : baseTextRef.current) : interim;
      if (onUpdateRef.current) onUpdateRef.current(display);
    };
    r.onend = () => { if (onUpdateRef.current) onUpdateRef.current(baseTextRef.current); setListening(false); recognitionRef.current = null; };
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.error('Voice:', e.error); setListening(false); recognitionRef.current = null; };
    r.start();
  }, [stop]);

  return { listening, start, stop, baseTextRef };
}

function VoiceTextarea({ value, onChange, placeholder, rows = 4 }) {
  const { listening, start, baseTextRef } = useSpeech();
  const handleChange = (e) => { baseTextRef.current = e.target.value; onChange(e.target.value); };
  const handleMic = useCallback(() => start(value, onChange), [start, value, onChange]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea style={vs.textarea} placeholder={placeholder} value={value} onChange={handleChange} rows={rows} />
        <button type="button" style={{ ...vs.mic, background: listening ? '#DC2626' : BLUE }} onClick={handleMic}>
          {listening ? <StopIcon /> : <MicIcon />}
        </button>
      </div>
      {listening && <div style={vs.badge}><span style={vs.dot} />Listening... speak naturally. Click stop when done.</div>}
    </div>
  );
}

function VoiceInput({ value, onChange, placeholder }) {
  const { listening, start, baseTextRef } = useSpeech();
  const handleChange = (e) => { baseTextRef.current = e.target.value; onChange(e.target.value); };
  const handleMic = useCallback(() => start(value, onChange), [start, value, onChange]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input style={vs.input} placeholder={placeholder} value={value} onChange={handleChange} />
        <button type="button" style={{ ...vs.micSm, background: listening ? '#DC2626' : BLUE }} onClick={handleMic}>
          {listening ? <StopIcon /> : <MicIcon />}
        </button>
      </div>
      {listening && <div style={{ ...vs.badge, marginTop: 6 }}><span style={vs.dot} />Listening... speak naturally. Click stop when done.</div>}
    </div>
  );
}

const vs = {
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  input: { flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', background: WH, width: '100%' },
  mic: { width: 44, height: 88, border: 'none', borderRadius: 10, color: WH, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  micSm: { width: 44, height: 44, border: 'none', borderRadius: 10, color: WH, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#DC2626', fontWeight: 600, padding: '6px 10px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#DC2626', flexShrink: 0 },
};

const EMPTY_DATA = {
  campaignName: '',
  leadOrg: '',
  collaborator: '',
  targetAudience: '',
  conceptNote: '',
  objective: '',
  startDate: '',
  endDate: '',
  teamLead: '',
  teamMembers: '',
  successMetrics: '',
  whatYouNeed: '',
  risks: '',
};

export default function CampaignWizard({ user, onComplete, onBack }) {
  const [step, setStep] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const [aiError, setAiError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [conceptFile, setConceptFile] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const fileRef = useRef(null);

  const [data, setData] = useState(EMPTY_DATA);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data && parsed.data.campaignName) {
          setData(parsed.data);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 4000);
        }
      }
    } catch {}
  }, []);

  // Save draft whenever data, step or aiReview changes
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step, aiReview }));
    } catch {}
  }, [data, step, aiReview]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((key, val) => setData(p => ({ ...p, [key]: val })), []);

  const onChangeCampaignName = useCallback((val) => update('campaignName', val), [update]);
  const onChangeLeadOrg = useCallback((val) => update('leadOrg', val), [update]);
  const onChangeCollaborator = useCallback((val) => update('collaborator', val), [update]);
  const onChangeTargetAudience = useCallback((val) => update('targetAudience', val), [update]);
  const onChangeConceptNote = useCallback((val) => update('conceptNote', val), [update]);
  const onChangeObjective = useCallback((val) => update('objective', val), [update]);
  const onChangeTeamLead = useCallback((val) => update('teamLead', val), [update]);
  const onChangeTeamMembers = useCallback((val) => update('teamMembers', val), [update]);
  const onChangeSuccessMetrics = useCallback((val) => update('successMetrics', val), [update]);
  const onChangeWhatYouNeed = useCallback((val) => update('whatYouNeed', val), [update]);
  const onChangeRisks = useCallback((val) => update('risks', val), [update]);

  const next = () => setStep(s => Math.min(s + 1, 5));
  const back = () => { if (step === 1) { onBack(); return; } setStep(s => s - 1); };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setConceptFile(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => update('conceptNote', (data.conceptNote ? data.conceptNote + '\n\n' : '') + `[Uploaded file: ${file.name}]\n` + ev.target.result.slice(0, 3000));
    reader.readAsText(file);
  };

  const canProceed = () => {
    if (step === 1) return data.campaignName.trim() && data.leadOrg.trim() && data.targetAudience.trim();
    if (step === 2) return data.conceptNote.trim() || data.objective.trim();
    if (step === 3) return data.startDate && data.endDate && data.teamLead.trim();
    return true;
  };

  const runAiReview = async () => {
    setAiLoading(true);
    setAiReview(null);
    setAiError(false);

    // Simplified prompt — no "research organisations" instruction which caused slowness
    const prompt = `You are a senior project manager reviewing a short campaign or initiative. Be direct and specific.

Details:
- Name: ${data.campaignName}
- Led by: ${data.leadOrg}
- Collaborator: ${data.collaborator || 'None'}
- Audience: ${data.targetAudience}
- Objective / Concept: ${data.objective || data.conceptNote}
- Timeline: ${data.startDate} to ${data.endDate}
- Team Lead: ${data.teamLead}
- Team: ${data.teamMembers || 'Not specified'}
- Success Metrics: ${data.successMetrics || 'Not specified'}
- What they need: ${data.whatYouNeed || 'Not specified'}
- Risks: ${data.risks || 'Not specified'}

Respond ONLY with raw JSON, no markdown, no code blocks:

{
  "conceptStrength": "1-2 sentences on what is genuinely strong about this plan.",
  "gaps": ["gap 1 in plain English", "gap 2", "gap 3"],
  "keyQuestions": ["question the team must answer before launching", "another critical question", "one more"],
  "successFactors": ["factor 1", "factor 2", "factor 3"],
  "recommendation": "1-2 sentence direct recommendation on how to make this succeed."
}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const result = await response.json();
      if (result.result) {
        const clean = result.result.replace(/```json|```/g, '').trim();
        const lastBrace = clean.lastIndexOf('}');
        const fixed = lastBrace !== -1 ? clean.substring(0, lastBrace + 1) : clean;
        setAiReview(JSON.parse(fixed));
      } else {
        setAiError(true);
      }
    } catch (err) {
      console.error('AI review error:', err);
      setAiError(true);
    }
    setAiLoading(false);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const days = Math.ceil((endDate - startDate) / 86400000);

    const { data: project, error } = await supabase.from('pm_projects').insert({
      user_id: user.id,
      owner_email: user.email,
      name: data.campaignName,
      description: data.conceptNote || data.objective,
      industry: 'Campaign',
      team_type: 'small',
      methodology: 'Agile',
      status: 'active',
      scope: {
        goal: data.objective,
        leadOrg: data.leadOrg,
        collaborator: data.collaborator,
        targetAudience: data.targetAudience,
        conceptNote: data.conceptNote,
        successMetrics: data.successMetrics,
        whatYouNeed: data.whatYouNeed,
        projectType: 'campaign',
      },
      timeline: { start: data.startDate, end: data.endDate, durationDays: days },
      resources: { tools: [], budget: '' },
      risks: data.risks ? [{ title: data.risks, level: 'medium', status: 'open' }] : [],
      team: [
        { name: data.teamLead, role: 'Team Lead' },
        ...(data.teamMembers ? data.teamMembers.split(',').map(m => ({ name: m.trim(), role: 'Team Member' })) : [])
      ].filter(m => m.name),
      milestones: generateCampaignMilestones(data),
      compliance: { industry: 'Campaign', flags: [] },
      ai_review: aiReview,
    }).select().single();

    setSaving(false);

    if (error) {
      console.error('Save error:', error);
      setSaveError(error.message || 'Something went wrong saving your campaign. Please try again.');
      return;
    }

    // Clear the draft now that it's saved
    try { localStorage.removeItem(DRAFT_KEY); } catch {}

    if (project) onComplete(project);
  };

  const progress = ((step - 1) / 4) * 100;

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <button style={s.backBtn} onClick={back}>← Back</button>

        {draftRestored && (
          <div style={s.draftBanner}>
            ✓ Draft restored — your previous progress has been loaded.
          </div>
        )}

        <div style={s.header}>
          <span style={s.typeBadge}>Campaign / Initiative / Short Project</span>
          <p style={s.headerSub}>For campaigns, events, community initiatives and short-duration projects — with or without collaborators.</p>
        </div>

        <div style={s.progressTrack}><div style={{ ...s.progressFill, width: `${progress}%` }} /></div>

        <div style={s.steps}>
          {STEPS.map(st => (
            <div key={st.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ ...s.stepDot, background: step >= st.num ? BLUE : '#E5E7EB' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: step >= st.num ? WH : '#9CA3AF' }}>{st.num}</span>
              </div>
              <span style={{ fontSize: 10, color: step >= st.num ? BLUE : '#9CA3AF', fontWeight: 600 }}>{st.label}</span>
            </div>
          ))}
        </div>

        <div style={s.card}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>
              <p style={s.stepTag}>Step 1 of 5</p>
              <h2 style={s.stepTitle}>What Is This and Who Is It For?</h2>
              <p style={s.stepSub}>Give PM Buddy enough context to guide you properly. This could be a solo initiative, a team effort, or something involving an external collaborator.</p>

              <label style={s.label}>Campaign or Project Name *</label>
              <div style={{ marginBottom: 20 }}>
                <VoiceInput value={data.campaignName} onChange={onChangeCampaignName} placeholder="e.g. Community Clean-Up Day, Product Launch Sprint, School Outreach Drive" />
              </div>

              <label style={s.label}>Your Name or Organisation (Lead) *</label>
              <div style={{ marginBottom: 20 }}>
                <VoiceInput value={data.leadOrg} onChange={onChangeLeadOrg} placeholder="e.g. Your name, your team or your organisation" />
              </div>

              <label style={s.label}>Collaborator or Partner (if any)</label>
              <div style={{ marginBottom: 20 }}>
                <VoiceInput value={data.collaborator} onChange={onChangeCollaborator} placeholder="e.g. Another organisation, individual, or sponsor — leave blank if none" />
              </div>

              <label style={s.label}>Target Audience *</label>
              <div style={{ marginBottom: 8 }}>
                <VoiceInput value={data.targetAudience} onChange={onChangeTargetAudience} placeholder="e.g. Local residents in the area, around 50 people" />
              </div>
              <p style={s.fieldHint}>Be specific — who exactly is this for and roughly how many people?</p>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div>
              <p style={s.stepTag}>Step 2 of 5</p>
              <h2 style={s.stepTitle}>What Is This About?</h2>
              <p style={s.stepSub}>Describe what you are doing and why it matters. Type, speak, or upload a concept note if you have one. The more you share, the better PM Buddy can help.</p>

              <label style={s.label}>What Are You Trying to Achieve?</label>
              <div style={{ marginBottom: 20 }}>
                <VoiceTextarea value={data.objective} onChange={onChangeObjective} placeholder="What changes or improves when this project succeeds? What does success actually look like?" rows={3} />
              </div>

              <label style={s.label}>Concept Note or Description</label>
              <div style={{ marginBottom: 12 }}>
                <VoiceTextarea value={data.conceptNote} onChange={onChangeConceptNote} placeholder="Background, approach, and what you plan to do. The more detail the better." rows={6} />
              </div>

              <div style={s.uploadRow}>
                <button style={s.uploadBtn} onClick={() => fileRef.current.click()}>
                  Upload a concept note
                </button>
                {conceptFile && <span style={s.fileName}>{conceptFile}</span>}
                <input ref={fileRef} type="file" accept=".txt,.doc,.docx,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
              <p style={s.fieldHint}>Accepted: .txt, .doc, .docx, .pdf — first 3000 characters will be used.</p>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div>
              <p style={s.stepTag}>Step 3 of 5</p>
              <h2 style={s.stepTitle}>Timeline, Team and What You Need</h2>
              <p style={s.stepSub}>Short projects still need clear ownership and a realistic timeline. Getting this right now saves a lot of confusion later.</p>

              <div style={s.twoCol}>
                <div>
                  <label style={s.label}>Start Date *</label>
                  <input style={s.input} type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>End Date *</label>
                  <input style={s.input} type="date" value={data.endDate} onChange={e => update('endDate', e.target.value)} />
                </div>
              </div>

              {data.startDate && data.endDate && (() => {
                const days = Math.ceil((new Date(data.endDate) - new Date(data.startDate)) / 86400000);
                if (days < 0) return <div style={s.timelineWarn}>End date is before start date.</div>;
                if (days <= 30) return <div style={s.timelineOk}>This is a {days}-day project. Keep scope tight and focus sharp.</div>;
                return <div style={s.timelineOk}>You have {days} days. Make sure your milestones are spread realistically across this timeline.</div>;
              })()}

              <label style={{ ...s.label, marginTop: 20 }}>Who Is Leading This? *</label>
              <div style={{ marginBottom: 16 }}>
                <VoiceInput value={data.teamLead} onChange={onChangeTeamLead} placeholder="Who is accountable for this end to end?" />
              </div>

              <label style={s.label}>Other People Involved</label>
              <div style={{ marginBottom: 16 }}>
                <VoiceInput value={data.teamMembers} onChange={onChangeTeamMembers} placeholder="Names separated by commas" />
              </div>

              <label style={s.label}>How Will You Know It Worked?</label>
              <div style={{ marginBottom: 16 }}>
                <VoiceTextarea value={data.successMetrics} onChange={onChangeSuccessMetrics} placeholder="e.g. 100 people attended, 3 media mentions, product page live and getting traffic" rows={3} />
              </div>

              <label style={s.label}>What Do You Need to Make This Happen?</label>
              <div style={{ marginBottom: 16 }}>
                <VoiceTextarea value={data.whatYouNeed} onChange={onChangeWhatYouNeed} placeholder="e.g. Budget approval, a venue, a graphic designer, access to a mailing list" rows={3} />
              </div>

              <label style={s.label}>What Could Go Wrong?</label>
              <div style={{ marginBottom: 8 }}>
                <VoiceTextarea value={data.risks} onChange={onChangeRisks} placeholder="e.g. Low turnout, budget not confirmed, key person unavailable, timeline too tight" rows={3} />
              </div>
            </div>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div>
              <p style={s.stepTag}>Step 4 of 5</p>
              <h2 style={s.stepTitle}>AI Review</h2>
              <p style={s.stepSub}>PM Buddy will review your plan and flag gaps, ask the questions your team needs to answer, and give you a direct recommendation before you finalise.</p>

              {!aiReview && !aiLoading && !aiError && (
                <div style={s.aiPromptBox}>
                  <p style={s.aiPromptText}>PM Buddy will look at everything you have entered, assess the concept and surface the questions your team needs to answer before you launch.</p>
                  <button style={s.aiBtn} onClick={runAiReview}>Run AI Review</button>
                  <p style={s.aiSkipNote}>Takes around 10 seconds. You can skip if you prefer.</p>
                </div>
              )}

              {aiLoading && (
                <div style={s.aiLoading}>
                  <div style={s.aiSpinner} />
                  <p style={s.aiLoadingText}>Reviewing your plan...</p>
                  <p style={s.aiLoadingSub}>This usually takes around 10 seconds</p>
                </div>
              )}

              {aiError && (
                <div style={s.aiErrorBox}>
                  <p style={s.aiErrorText}>The AI review didn't come back. You can try again or skip and continue to your plan.</p>
                  <button style={s.aiBtn} onClick={runAiReview}>Try Again</button>
                </div>
              )}

              {aiReview && (
                <div>
                  {aiReview.conceptStrength && (
                    <div style={{ ...s.reviewBlock, borderLeftColor: '#15803D', background: '#F0FDF4' }}>
                      <p style={{ ...s.reviewBlockLabel, color: '#15803D' }}>What Is Strong</p>
                      <p style={s.reviewBlockText}>{aiReview.conceptStrength}</p>
                    </div>
                  )}
                  {aiReview.gaps?.length > 0 && (
                    <div style={{ ...s.reviewBlock, borderLeftColor: '#DC2626', background: '#FEF2F2' }}>
                      <p style={{ ...s.reviewBlockLabel, color: '#DC2626' }}>Gaps to Address</p>
                      {aiReview.gaps.map((g, i) => <p key={i} style={{ ...s.reviewBlockText, marginBottom: 6 }}>· {g}</p>)}
                    </div>
                  )}
                  {aiReview.keyQuestions?.length > 0 && (
                    <div style={{ ...s.reviewBlock, borderLeftColor: BLUE, background: '#EFF6FF' }}>
                      <p style={{ ...s.reviewBlockLabel, color: BLUE }}>Questions to Answer Before You Launch</p>
                      {aiReview.keyQuestions.map((q, i) => <p key={i} style={{ ...s.reviewBlockText, marginBottom: 6 }}>· {q}</p>)}
                    </div>
                  )}
                  {aiReview.successFactors?.length > 0 && (
                    <div style={s.reviewBlock}>
                      <p style={s.reviewBlockLabel}>Key Success Factors</p>
                      {aiReview.successFactors.map((f, i) => <p key={i} style={{ ...s.reviewBlockText, marginBottom: 6 }}>· {f}</p>)}
                    </div>
                  )}
                  {aiReview.recommendation && (
                    <div style={{ ...s.reviewBlock, borderLeftColor: BL, background: BL }}>
                      <p style={{ ...s.reviewBlockLabel, color: BLUE }}>PM Buddy's Recommendation</p>
                      <p style={{ ...s.reviewBlockText, color: WH }}>{aiReview.recommendation}</p>
                    </div>
                  )}
                  <button style={s.retryBtn} onClick={runAiReview}>Re-run review</button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5 ── */}
          {step === 5 && (
            <div>
              <p style={s.stepTag}>Step 5 of 5</p>
              <h2 style={s.stepTitle}>Your Plan Summary</h2>
              <p style={s.stepSub}>Review your campaign summary before launching. PM Buddy will create your project workspace with milestones ready to track.</p>

              <div style={s.summaryGrid}>
                <SummaryItem label="Name" value={data.campaignName} />
                <SummaryItem label="Led By" value={data.leadOrg} />
                {data.collaborator && <SummaryItem label="Collaborator" value={data.collaborator} />}
                <SummaryItem label="Audience" value={data.targetAudience} />
                <SummaryItem label="Timeline" value={data.startDate && data.endDate ? `${fmtDate(data.startDate)} to ${fmtDate(data.endDate)}` : 'Not set'} />
                <SummaryItem label="Lead" value={data.teamLead} />
              </div>

              {data.successMetrics && (
                <div style={s.summaryNote}>
                  <p style={s.summaryNoteLabel}>How You'll Know It Worked</p>
                  <p style={s.summaryNoteText}>{data.successMetrics}</p>
                </div>
              )}
              {data.whatYouNeed && (
                <div style={s.summaryNote}>
                  <p style={s.summaryNoteLabel}>What You Need to Succeed</p>
                  <p style={s.summaryNoteText}>{data.whatYouNeed}</p>
                </div>
              )}

              <div style={s.milestonesPreview}>
                <p style={s.milestonesLabel}>Auto-Generated Milestones</p>
                {generateCampaignMilestones(data).map((m, i) => (
                  <div key={i} style={s.milestoneRow}>
                    <div style={s.milestoneDot} />
                    <div>
                      <p style={s.milestoneTitle}>{m.title}</p>
                      <p style={s.milestoneDate}>{fmtDate(m.date)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {saveError && (
                <div style={s.saveErrorBox}>
                  <p style={s.saveErrorText}>⚠ Could not save: {saveError}</p>
                  <p style={{ fontSize: 13, color: '#991B1B', marginTop: 4 }}>Check your connection and try again.</p>
                </div>
              )}
            </div>
          )}

          {/* ── FOOTER NAV ── */}
          <div style={s.footer}>
            {step < 4 ? (
              <button style={{ ...s.nextBtn, opacity: canProceed() ? 1 : 0.5 }} onClick={next} disabled={!canProceed()}>
                Continue
              </button>
            ) : step === 4 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  style={{ ...s.nextBtn, opacity: aiLoading ? 0.6 : 1 }}
                  onClick={next}
                  disabled={aiLoading}
                >
                  {aiLoading ? 'AI Review Running...' : aiReview ? 'Continue to Plan' : 'Skip and Continue'}
                </button>
                {!aiReview && !aiLoading && (
                  <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                    The review helps you catch gaps early — but you can skip it if you prefer.
                  </p>
                )}
              </div>
            ) : (
              <button style={{ ...s.nextBtn, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
                {saving ? 'Setting Up Your Campaign...' : 'Launch Campaign Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={s.summaryItem}>
      <p style={s.summaryLabel}>{label}</p>
      <p style={s.summaryValue}>{value}</p>
    </div>
  );
}

function generateCampaignMilestones(data) {
  if (!data.startDate || !data.endDate) return [];
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const total = end - start;
  const m1 = new Date(start.getTime() + total * 0.25).toISOString().split('T')[0];
  const m2 = new Date(start.getTime() + total * 0.5).toISOString().split('T')[0];
  const m3 = new Date(start.getTime() + total * 0.75).toISOString().split('T')[0];
  return [
    { title: 'Kickoff', date: data.startDate, status: 'pending' },
    { title: 'First Phase Complete', date: m1, status: 'pending' },
    { title: 'Midpoint Review', date: m2, status: 'pending' },
    { title: 'Final Phase', date: m3, status: 'pending' },
    { title: 'Wrap-up and Review', date: data.endDate, status: 'pending' },
  ];
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  );
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '40px 24px 80px' },
  wrap: { maxWidth: 680, margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0 },
  header: { marginBottom: 24 },
  typeBadge: { display: 'inline-block', fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.12em', background: '#EFF6FF', padding: '4px 12px', borderRadius: 100, marginBottom: 8 },
  headerSub: { fontSize: 13, color: '#6B7280' },
  draftBanner: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#15803D', fontWeight: 600, marginBottom: 20 },
  progressTrack: { height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.4s ease' },
  steps: { display: 'flex', gap: 16, marginBottom: 28, justifyContent: 'space-between' },
  stepDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s ease' },
  card: { background: WH, borderRadius: 20, padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' },
  stepTag: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 },
  stepTitle: { fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 900, color: BL, marginBottom: 8, letterSpacing: '-0.5px' },
  stepSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 28 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: '0.02em' },
  fieldHint: { fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 16, marginTop: 4 },
  input: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 4, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 },
  timelineOk: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: BLUE, lineHeight: 1.6, marginBottom: 16 },
  timelineWarn: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', lineHeight: 1.6, marginBottom: 16 },
  uploadRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  uploadBtn: { padding: '9px 16px', background: WH, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: BLUE, cursor: 'pointer', fontFamily: 'inherit' },
  fileName: { fontSize: 12, color: '#6B7280', fontWeight: 500 },
  aiPromptBox: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '28px', textAlign: 'center' },
  aiPromptText: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 20 },
  aiSkipNote: { fontSize: 12, color: '#9CA3AF', marginTop: 12 },
  aiBtn: { padding: '12px 28px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  aiLoading: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: 14 },
  aiSpinner: { width: 36, height: 36, border: '3px solid #F3F4F6', borderTop: `3px solid ${BLUE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  aiLoadingText: { fontSize: 15, fontWeight: 600, color: '#374151', textAlign: 'center' },
  aiLoadingSub: { fontSize: 13, color: '#9CA3AF' },
  aiErrorBox: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '24px', textAlign: 'center' },
  aiErrorText: { fontSize: 14, color: '#991B1B', lineHeight: 1.7, marginBottom: 16 },
  reviewBlock: { borderLeft: '3px solid #E5E7EB', padding: '14px 16px', marginBottom: 12, borderRadius: '0 10px 10px 0', background: GREY },
  reviewBlockLabel: { fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  reviewBlockText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  retryBtn: { background: 'none', border: 'none', color: BLUE, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginTop: 8 },
  summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  summaryItem: { background: GREY, borderRadius: 10, padding: '14px 16px' },
  summaryLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: BL },
  summaryNote: { background: GREY, borderRadius: 10, padding: '14px 16px', marginBottom: 12 },
  summaryNoteLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  summaryNoteText: { fontSize: 14, color: '#374151', lineHeight: 1.65 },
  milestonesPreview: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '18px', marginTop: 8 },
  milestonesLabel: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 },
  milestoneRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  milestoneDot: { width: 8, height: 8, borderRadius: '50%', background: BLUE, flexShrink: 0, marginTop: 5 },
  milestoneTitle: { fontSize: 14, fontWeight: 600, color: BL },
  milestoneDate: { fontSize: 12, color: '#6B7280' },
  saveErrorBox: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px', marginTop: 16 },
  saveErrorText: { fontSize: 14, fontWeight: 700, color: '#991B1B' },
  footer: { marginTop: 32, paddingTop: 24, borderTop: '1px solid #F3F4F6' },
  nextBtn: { width: '100%', padding: '14px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s ease' },
};
