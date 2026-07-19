import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';
const RULE = '#E5E7EB';

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch { return {}; }
}

function deriveMethodology(industry) {
  if (industry === 'Government' || industry === 'Health') return 'Predictive';
  return 'Hybrid';
}

function getComplianceFlags(industry) {
  const flags = {
    Fintech: ['CBN regulatory compliance', 'NDPR', 'KYC'],
    Health: ['Patient data privacy', 'Medical regulations'],
    Education: ['Student data protection'],
    Government: ['Procurement regulations'],
  };
  return flags[industry] || [];
}

const INDUSTRIES = [
  'Fintech', 'Health', 'Education', 'Agriculture', 'Logistics',
  'E-commerce', 'Real Estate', 'Media', 'Government', 'Other',
];

const EMPTY_EXTRACTED = {
  name: '',
  description: '',
  goal: '',
  industry: '',
  startDate: '',
  endDate: '',
  teamMembers: [],
  milestones: [],
  risks: [],
  communicationFlow: '',
};

export default function DocumentImport({ user, onComplete, onBack }) {
  const [step, setStep] = useState('paste'); // paste | extracting | review | saving
  const [pastedText, setPastedText] = useState('');
  const [extracted, setExtracted] = useState(EMPTY_EXTRACTED);
  const [extractError, setExtractError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [charCount, setCharCount] = useState(0);

  // ── STEP 1: Extract ─────────────────────────────────────────

  const handleExtract = useCallback(async () => {
    if (pastedText.trim().length < 50) {
      setExtractError('Please paste more content — at least a paragraph so PM Buddy has enough to work with.');
      return;
    }
    setExtractError('');
    setStep('extracting');

    const prompt = `You are PM Buddy, a plain-English project management assistant. A user has pasted a planning document below. Your job is to extract structured project information from it.

Read the document carefully and extract ONLY what is actually stated. Do not invent or assume anything that is not in the document. If a field is not mentioned, leave it as an empty string or empty array.

DOCUMENT:
"""
${pastedText.substring(0, 8000)}
"""

Extract the following and respond ONLY with a raw JSON object. No markdown. No code blocks. No explanation. Just the JSON:

{
  "name": "project name or title (string)",
  "description": "2-3 sentence plain English description of what this project is and what it will do (string)",
  "goal": "what success looks like — what outcome the project is trying to achieve (string)",
  "industry": "one of: Fintech, Health, Education, Agriculture, Logistics, E-commerce, Real Estate, Media, Government, Other (string)",
  "startDate": "ISO date string YYYY-MM-DD if mentioned, else empty string",
  "endDate": "ISO date string YYYY-MM-DD if mentioned, else empty string",
  "teamMembers": [{"name": "person name", "role": "their role"}],
  "milestones": [{"title": "milestone name", "date": "YYYY-MM-DD or empty string", "status": "pending"}],
  "risks": ["risk description as plain text string"],
  "communicationFlow": "how the team communicates or shares updates — plain English (string)"
}

Rules:
- name: if no clear title, use the first heading or subject of the document
- description: plain English, no jargon, maximum 3 sentences
- goal: what the project is trying to achieve. If not stated clearly, infer from the document's purpose
- industry: pick the closest match from the list. Default to Other if unclear
- teamMembers: only real named people with roles. Skip generic mentions like "the team"
- milestones: key checkpoints or deliverables mentioned. Maximum 8
- risks: things that could go wrong, challenges mentioned, or constraints. Maximum 5 as plain strings
- communicationFlow: meeting cadence, channels, reporting lines — whatever is mentioned`;

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      const raw = (result.result || '').replace(/```json|```/g, '').trim();
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) throw new Error('No JSON found in response');
      const parsed = JSON.parse(raw.substring(firstBrace, lastBrace + 1));

      setExtracted({
        name: parsed.name || '',
        description: parsed.description || '',
        goal: parsed.goal || '',
        industry: INDUSTRIES.includes(parsed.industry) ? parsed.industry : 'Other',
        startDate: parsed.startDate || '',
        endDate: parsed.endDate || '',
        teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : [],
        milestones: Array.isArray(parsed.milestones)
          ? parsed.milestones.map(m => ({ title: m.title || '', date: m.date || '', status: 'pending' }))
          : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks.filter(r => typeof r === 'string') : [],
        communicationFlow: parsed.communicationFlow || '',
      });
      setStep('review');
    } catch (err) {
      console.error('Extract error:', err);
      setExtractError('PM Buddy could not read this document. Try pasting a cleaner version — sometimes removing headers or tables first helps.');
      setStep('paste');
    }
  }, [pastedText]);

  // ── STEP 2: Save ────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!extracted.name.trim()) { setSaveError('Please add a project name before saving.'); return; }
    setSaveError('');
    setStep('saving');

    const userId = typeof user === 'string' ? user : user?.id;
    const userEmail = typeof user === 'string' ? '' : (user?.email || '');
    const methodology = deriveMethodology(extracted.industry);

    const { data: project, error } = await supabase.from('pm_projects').insert({
      user_id: userId,
      owner_email: userEmail,
      name: extracted.name,
      description: extracted.description,
      industry: extracted.industry || 'Other',
      team_type: extracted.teamMembers.length > 0 ? 'small' : 'solo',
      methodology,
      status: 'active',
      scope: { goal: extracted.goal },
      timeline: { start: extracted.startDate, end: extracted.endDate },
      resources: { tools: [], budget: '' },
      risks: extracted.risks.map(r => ({ title: r, level: 'medium', status: 'open' })),
      team: extracted.teamMembers,
      milestones: extracted.milestones,
      compliance: { industry: extracted.industry, flags: getComplianceFlags(extracted.industry) },
      planning: { communications: extracted.communicationFlow },
      history: [{
        type: 'document_imported',
        label: 'Project imported from document',
        detail: 'Created by pasting a planning document into PM Buddy',
        timestamp: new Date().toISOString(),
        by: userEmail || 'You',
      }],
    }).select().single();

    if (error || !project) {
      setSaveError('Could not save project. Please try again.');
      setStep('review');
      return;
    }

    // Auto-generate project brief
    try {
      const briefPrompt = `You are a professional project manager. Write a concise project brief in HTML for this project.

Project: ${extracted.name}
Industry: ${extracted.industry}
Description: ${extracted.description}
Goal: ${extracted.goal}
Team: ${extracted.teamMembers.length > 0 ? extracted.teamMembers.map(m => `${m.name} (${m.role})`).join(', ') : 'Solo project'}
Timeline: ${extracted.startDate ? `${extracted.startDate} to ${extracted.endDate}` : 'Not specified'}
Risks: ${extracted.risks.join(', ') || 'None listed'}
Milestones: ${extracted.milestones.map(m => m.title).join(', ') || 'None listed'}

Write in HTML (h1 for title, h2 for sections, p for paragraphs). No html/head/body tags. Sections: Project Overview, Objectives, Scope, Team and Roles, Timeline, Key Risks, Success Metrics. Minimum 300 words.`;

      const authHeader = await getAuthHeader();
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ prompt: briefPrompt, mode: 'document' }),
      });
      if (res.ok) {
        const result = await res.json();
        const content = (result.result || '').replace(/```html|```/g, '').trim();
        if (content && content.length > 100) {
          await supabase.from('documents').insert({
            user_id: userId,
            project_id: project.id,
            project_name: extracted.name,
            type: 'pm',
            title: `${extracted.name} — Project Brief`,
            content,
          });
        }
      }
    } catch (err) { console.error('Brief generation error:', err); }

    onComplete(project);
  }, [extracted, user, onComplete]);

  // ── Helpers ──────────────────────────────────────────────────

  const updateField = (field, value) => setExtracted(p => ({ ...p, [field]: value }));

  const updateMilestone = (i, field, val) => {
    const updated = [...extracted.milestones];
    updated[i] = { ...updated[i], [field]: val };
    setExtracted(p => ({ ...p, milestones: updated }));
  };

  const removeMilestone = (i) => setExtracted(p => ({ ...p, milestones: p.milestones.filter((_, idx) => idx !== i) }));

  const addMilestone = () => setExtracted(p => ({ ...p, milestones: [...p.milestones, { title: '', date: '', status: 'pending' }] }));

  const updateRisk = (i, val) => {
    const updated = [...extracted.risks];
    updated[i] = val;
    setExtracted(p => ({ ...p, risks: updated }));
  };

  const removeRisk = (i) => setExtracted(p => ({ ...p, risks: p.risks.filter((_, idx) => idx !== i) }));

  const addRisk = () => setExtracted(p => ({ ...p, risks: [...p.risks, ''] }));

  const updateMember = (i, field, val) => {
    const updated = [...extracted.teamMembers];
    updated[i] = { ...updated[i], [field]: val };
    setExtracted(p => ({ ...p, teamMembers: updated }));
  };

  const removeMember = (i) => setExtracted(p => ({ ...p, teamMembers: p.teamMembers.filter((_, idx) => idx !== i) }));

  const addMember = () => setExtracted(p => ({ ...p, teamMembers: [...p.teamMembers, { name: '', role: '' }] }));

  // ── RENDER ───────────────────────────────────────────────────

  if (step === 'extracting') {
    return (
      <div style={s.page}>
        <div style={s.wrap}>
          <div style={s.loadingCard}>
            <div style={s.spinner} />
            <p style={s.loadingTitle}>PM Buddy is reading your document</p>
            <p style={s.loadingSubtext}>Extracting project name, goal, milestones, risks and team details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'saving') {
    return (
      <div style={s.page}>
        <div style={s.wrap}>
          <div style={s.loadingCard}>
            <div style={s.spinner} />
            <p style={s.loadingTitle}>Creating your project</p>
            <p style={s.loadingSubtext}>Saving project and generating your project brief...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div style={s.page}>
        <div style={s.wrap}>
          <button style={s.backBtn} onClick={() => setStep('paste')}>← Back</button>

          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.successDot} />
              <div>
                <p style={s.stepTag}>Step 2 of 2 — Review</p>
                <h2 style={s.stepTitle}>Check what PM Buddy found</h2>
                <p style={s.stepSub}>Review and correct anything below before saving. PM Buddy reads documents well but is not perfect.</p>
              </div>
            </div>

            {/* Project name */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Project Name <span style={s.required}>*</span></label>
              <input
                style={s.input}
                value={extracted.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="e.g. Community Training Program"
              />
            </div>

            {/* Description */}
            <div style={s.fieldGroup}>
              <label style={s.label}>What is this project about?</label>
              <textarea
                style={s.textarea}
                rows={3}
                value={extracted.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Describe the project in plain English."
              />
            </div>

            {/* Goal */}
            <div style={s.fieldGroup}>
              <label style={s.label}>What does success look like?</label>
              <textarea
                style={s.textarea}
                rows={3}
                value={extracted.goal}
                onChange={e => updateField('goal', e.target.value)}
                placeholder="What outcome is this project trying to achieve?"
              />
            </div>

            {/* Industry */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Industry</label>
              <div style={s.industryGrid}>
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    style={{
                      ...s.industryBtn,
                      background: extracted.industry === ind ? BLUE : WH,
                      color: extracted.industry === ind ? WH : BL,
                      borderColor: extracted.industry === ind ? BLUE : RULE,
                    }}
                    onClick={() => updateField('industry', ind)}
                  >{ind}</button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Timeline</label>
              <div style={s.row}>
                <div style={{ flex: 1 }}>
                  <p style={s.sublabel}>Start date</p>
                  <input style={s.input} type="date" value={extracted.startDate} onChange={e => updateField('startDate', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={s.sublabel}>End date</p>
                  <input style={s.input} type="date" value={extracted.endDate} onChange={e => updateField('endDate', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Team */}
            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <label style={s.label}>Team Members</label>
                <button style={s.addSmallBtn} onClick={addMember}>+ Add</button>
              </div>
              {extracted.teamMembers.length === 0 && (
                <p style={s.emptyHint}>No team members found in the document. Add them manually if needed.</p>
              )}
              {extracted.teamMembers.map((m, i) => (
                <div key={i} style={s.memberRow}>
                  <input style={{ ...s.inputInline, flex: 2 }} placeholder="Name" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                  <input style={{ ...s.inputInline, flex: 2 }} placeholder="Role" value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} />
                  <button style={s.removeBtn} onClick={() => removeMember(i)}>✕</button>
                </div>
              ))}
            </div>

            {/* Milestones */}
            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <label style={s.label}>Milestones</label>
                <button style={s.addSmallBtn} onClick={addMilestone}>+ Add</button>
              </div>
              {extracted.milestones.length === 0 && (
                <p style={s.emptyHint}>No milestones found. Add key checkpoints manually.</p>
              )}
              {extracted.milestones.map((m, i) => (
                <div key={i} style={s.milestoneRow}>
                  <input
                    style={{ ...s.inputInline, flex: 3 }}
                    placeholder="Milestone name"
                    value={m.title}
                    onChange={e => updateMilestone(i, 'title', e.target.value)}
                  />
                  <input
                    style={{ ...s.inputInline, flex: 2 }}
                    type="date"
                    value={m.date || ''}
                    onChange={e => updateMilestone(i, 'date', e.target.value)}
                  />
                  <button style={s.removeBtn} onClick={() => removeMilestone(i)}>✕</button>
                </div>
              ))}
            </div>

            {/* Risks */}
            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <label style={s.label}>Risks and Challenges</label>
                <button style={s.addSmallBtn} onClick={addRisk}>+ Add</button>
              </div>
              {extracted.risks.length === 0 && (
                <p style={s.emptyHint}>No risks found. Add anything that could go wrong.</p>
              )}
              {extracted.risks.map((r, i) => (
                <div key={i} style={s.riskRow}>
                  <input
                    style={{ ...s.inputInline, flex: 1 }}
                    placeholder="Describe a risk..."
                    value={r}
                    onChange={e => updateRisk(i, e.target.value)}
                  />
                  <button style={s.removeBtn} onClick={() => removeRisk(i)}>✕</button>
                </div>
              ))}
            </div>

            {/* Communication */}
            <div style={s.fieldGroup}>
              <label style={s.label}>How does the team share updates?</label>
              <input
                style={s.input}
                placeholder="e.g. Weekly meetings, WhatsApp group, monthly email reports"
                value={extracted.communicationFlow}
                onChange={e => updateField('communicationFlow', e.target.value)}
              />
            </div>

            {saveError && (
              <div style={s.errorBox}>
                <p style={s.errorText}>{saveError}</p>
              </div>
            )}

            <div style={s.footer}>
              <button style={s.backFooterBtn} onClick={() => setStep('paste')}>← Back</button>
              <button style={s.saveBtn} onClick={handleSave}>
                Save Project →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: paste step
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>

        <div style={s.card}>
          <p style={s.stepTag}>Import from Document · Step 1 of 2</p>
          <h2 style={s.stepTitle}>Paste your planning document</h2>
          <p style={s.stepSub}>
            Copy the text from your existing document — a project plan, brief, proposal, scope document, or even a detailed WhatsApp message — and paste it below. PM Buddy will read it and pull out the key details automatically.
          </p>

          <div style={s.examplesRow}>
            {['Project plan', 'Proposal', 'Scope document', 'Project brief', 'Grant application'].map((ex, i) => (
              <span key={i} style={s.exampleChip}>{ex}</span>
            ))}
          </div>

          <div style={s.pasteArea}>
            <textarea
              style={s.pasteTextarea}
              placeholder="Paste your document here...&#10;&#10;PM Buddy works best with documents that describe:&#10;• What the project is and what it will achieve&#10;• Who is involved and their roles&#10;• Key dates and milestones&#10;• Risks or challenges&#10;&#10;The more detail you paste, the better the extraction."
              value={pastedText}
              onChange={e => { setPastedText(e.target.value); setCharCount(e.target.value.length); setExtractError(''); }}
              rows={14}
            />
            <div style={s.pasteFooter}>
              <span style={{ ...s.charCount, color: charCount > 8000 ? '#D97706' : '#9CA3AF' }}>
                {charCount > 0 ? `${charCount.toLocaleString()} characters${charCount > 8000 ? ' — only the first 8,000 will be read' : ''}` : ''}
              </span>
            </div>
          </div>

          {extractError && (
            <div style={s.errorBox}>
              <p style={s.errorText}>{extractError}</p>
            </div>
          )}

          <div style={s.hint}>
            <p style={s.hintText}>
              <strong>Tip:</strong> If your document is a PDF, open it, select all text (Ctrl+A), copy, and paste here. Tables and images won't copy perfectly but the text will.
            </p>
          </div>

          <button
            style={{ ...s.extractBtn, opacity: pastedText.trim().length < 50 ? 0.5 : 1 }}
            onClick={handleExtract}
            disabled={pastedText.trim().length < 50}
          >
            Read Document →
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '40px 24px 80px', fontFamily: "'DM Sans', system-ui, sans-serif" },
  wrap: { maxWidth: 640, margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24, padding: '8px 0', display: 'block' },
  card: { background: WH, borderRadius: 20, padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: `1px solid ${RULE}` },
  cardHeader: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${RULE}` },
  successDot: { width: 10, height: 10, borderRadius: '50%', background: '#15803D', flexShrink: 0, marginTop: 6 },
  stepTag: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 },
  stepTitle: { fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 900, color: BL, letterSpacing: '-0.5px', marginBottom: 8 },
  stepSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 0 },
  examplesRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  exampleChip: { fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: BLUE, padding: '4px 12px', borderRadius: 100 },
  pasteArea: { border: `1.5px solid ${RULE}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  pasteTextarea: { width: '100%', border: 'none', padding: '16px', fontSize: 14, fontFamily: 'inherit', color: BL, outline: 'none', resize: 'none', lineHeight: 1.7, background: WH, boxSizing: 'border-box' },
  pasteFooter: { display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', background: GREY, borderTop: `1px solid ${RULE}` },
  charCount: { fontSize: 12, fontWeight: 500 },
  hint: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', marginBottom: 20 },
  hintText: { fontSize: 13, color: '#92400E', lineHeight: 1.65 },
  extractBtn: { width: '100%', padding: '14px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.1px' },
  errorBox: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 16 },
  errorText: { fontSize: 13, color: '#DC2626', lineHeight: 1.6 },
  loadingCard: { background: WH, borderRadius: 20, padding: '60px 36px', textAlign: 'center', border: `1px solid ${RULE}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  spinner: { width: 36, height: 36, border: `3px solid ${RULE}`, borderTop: `3px solid ${BLUE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' },
  loadingTitle: { fontSize: 17, fontWeight: 700, color: BL, marginBottom: 8 },
  loadingSubtext: { fontSize: 14, color: '#6B7280', lineHeight: 1.65 },
  fieldGroup: { marginBottom: 24 },
  fieldLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '0.02em' },
  sublabel: { fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' },
  required: { color: '#DC2626' },
  input: { width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', color: BL, outline: 'none', background: WH, boxSizing: 'border-box' },
  textarea: { width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH, boxSizing: 'border-box' },
  inputInline: { border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: BL, outline: 'none', background: WH, boxSizing: 'border-box' },
  industryGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  industryBtn: { padding: '8px 16px', border: `1.5px solid`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  row: { display: 'flex', gap: 12 },
  memberRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  milestoneRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  riskRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  removeBtn: { background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit', flexShrink: 0, padding: '0 4px' },
  addSmallBtn: { background: 'none', border: 'none', color: BLUE, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0 },
  emptyHint: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },
  footer: { display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: `1px solid ${RULE}` },
  backFooterBtn: { padding: '13px 20px', background: 'none', color: '#6B7280', border: `1.5px solid ${RULE}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { flex: 1, padding: '13px', background: BL, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
};
