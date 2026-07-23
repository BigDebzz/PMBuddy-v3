import React, { useState, useCallback, useRef } from 'react';
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

// Strip markdown formatting so Gemini gets clean text
function cleanText(text) {
  return text
    .replace(/#{1,6}\s+/g, '')        // ## headings
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
    .replace(/\*(.+?)\*/g, '$1')       // *italic*
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1') // __underline__
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url)
    .replace(/^\s*[-*+]\s+/gm, '')    // bullet points
    .replace(/^\s*\d+\.\s+/gm, '')    // numbered lists
    .replace(/\|[^\n]+\|/g, '')        // table rows
    .replace(/[-]{3,}/g, '')           // horizontal rules
    .replace(/\n{3,}/g, '\n\n')        // excessive newlines
    .trim();
}

// Try multiple JSON extraction strategies
function extractJSON(raw) {
  if (!raw) return null;

  // Strategy 1: find { ... } block
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Strategy 2: strip markdown code fences and try again
  const stripped = raw.replace(/```json|```/g, '').trim();
  const f2 = stripped.indexOf('{');
  const l2 = stripped.lastIndexOf('}');
  if (f2 !== -1 && l2 !== -1) {
    try {
      return JSON.parse(stripped.substring(f2, l2 + 1));
    } catch {}
  }

  // Strategy 3: line by line, find the JSON block
  const lines = raw.split('\n');
  let jsonLines = [];
  let inJson = false;
  for (const line of lines) {
    if (line.trim().startsWith('{')) inJson = true;
    if (inJson) jsonLines.push(line);
    if (inJson && line.trim().endsWith('}')) break;
  }
  if (jsonLines.length > 0) {
    try {
      return JSON.parse(jsonLines.join('\n'));
    } catch {}
  }

  return null;
}

const INDUSTRIES = [
  'Fintech', 'Health', 'Education', 'Agriculture', 'Logistics',
  'E-commerce', 'Real Estate', 'Media', 'Government', 'Other',
];

const EMPTY_EXTRACTED = {
  name: '', description: '', goal: '', industry: '',
  startDate: '', endDate: '', teamMembers: [], milestones: [],
  risks: [], communicationFlow: '',
};

export default function DocumentImport({ user, onComplete, onBack }) {
  const [step, setStep] = useState('paste');
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'upload'
  const [pastedText, setPastedText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extracted, setExtracted] = useState(EMPTY_EXTRACTED);
  const [extractError, setExtractError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const fileInputRef = useRef(null);

  // ── File upload handler ──────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExtractError('');
    setUploadedFileName(file.name);

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt' || ext === 'md') {
      // Plain text — read directly
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        setPastedText(text);
        setCharCount(text.length);
      };
      reader.readAsText(file);
      return;
    }

    if (ext === 'pdf') {
      // Send PDF as base64 to Gemini
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        setStep('extracting');
        await extractFromBase64(base64, 'application/pdf', file.name);
      };
      reader.readAsDataURL(file);
      return;
    }

    if (ext === 'doc' || ext === 'docx') {
      // Send Word doc as base64 to Gemini
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        setStep('extracting');
        await extractFromBase64(base64, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', file.name);
      };
      reader.readAsDataURL(file);
      return;
    }

    setExtractError('Unsupported file type. Please upload a PDF, Word (.docx), or text file — or paste the text directly.');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Extract from base64 file (PDF or Word) ──────────────────
  const extractFromBase64 = useCallback(async (base64Data, mimeType, fileName) => {
    setExtractError('');
    try {
      const authHeader = await getAuthHeader();
      const prompt = `You are PM Buddy, a plain-English project management assistant. A user has uploaded a planning document called "${fileName}". Extract structured project information from it.

Read the document carefully and extract ONLY what is actually stated. If a field is not mentioned, leave it as an empty string or empty array.

Respond ONLY with this JSON object. No markdown. No explanation. No code blocks. Just raw JSON:

{"name":"project name or title","description":"2-3 sentence plain English description","goal":"what success looks like for this project","industry":"one of: Fintech Health Education Agriculture Logistics E-commerce Real Estate Media Government Other","startDate":"YYYY-MM-DD or empty string","endDate":"YYYY-MM-DD or empty string","teamMembers":[{"name":"person name","role":"their role"}],"milestones":[{"title":"milestone name","date":"YYYY-MM-DD or empty","status":"pending"}],"risks":["risk as plain text string"],"communicationFlow":"how team shares updates"}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          prompt,
          fileData: { base64: base64Data, mimeType },
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      const parsed = extractJSON(result.result || '');

      if (!parsed) throw new Error('Could not parse response');
      applyExtracted(parsed);
      setStep('review');
    } catch (err) {
      console.error('File extract error:', err);
      setExtractError('PM Buddy could not read this file. Try pasting the text directly instead.');
      setStep('paste');
    }
  }, []);

  // ── Extract from pasted text ─────────────────────────────────
  const handleExtract = useCallback(async () => {
    if (pastedText.trim().length < 50) {
      setExtractError('Please paste more content — at least a paragraph so PM Buddy has enough to work with.');
      return;
    }
    setExtractError('');
    setStep('extracting');

    // Clean markdown before sending
    const cleanedText = cleanText(pastedText);

    const prompt = `You are PM Buddy. Extract project information from this planning document. Respond ONLY with raw JSON — no markdown, no code fences, no explanation, just the JSON object.

DOCUMENT:
${cleanedText.substring(0, 8000)}

Required JSON format (use empty string or empty array if not found):
{"name":"project name","description":"2-3 sentence plain English description of what this project is and what it will do","goal":"what the project is trying to achieve and what success looks like","industry":"closest match from: Fintech Health Education Agriculture Logistics E-commerce Real Estate Media Government Other","startDate":"YYYY-MM-DD or empty string","endDate":"YYYY-MM-DD or empty string","teamMembers":[{"name":"person name","role":"their role"}],"milestones":[{"title":"milestone name","date":"YYYY-MM-DD or empty string","status":"pending"}],"risks":["risk description"],"communicationFlow":"how team shares updates or empty string"}

Rules:
- name: use the document title or main subject
- description: plain English, no jargon, 2-3 sentences max
- goal: what outcome the project aims to achieve
- industry: pick the single closest match
- teamMembers: only named people with clear roles, skip generic mentions
- milestones: key checkpoints or deliverables, max 8
- risks: challenges or things that could go wrong, max 5, as plain strings
- Respond with ONLY the JSON. Nothing before or after it.`;

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      const parsed = extractJSON(result.result || '');

      if (!parsed) {
        // Last resort: build a partial result from what we can infer
        console.error('JSON parse failed, raw response:', result.result);
        setExtractError('PM Buddy had trouble structuring the response. Try removing any tables from the document and paste again, or use the Upload option instead.');
        setStep('paste');
        return;
      }

      applyExtracted(parsed);
      setStep('review');
    } catch (err) {
      console.error('Extract error:', err);
      setExtractError('Something went wrong. Check your connection and try again.');
      setStep('paste');
    }
  }, [pastedText]);

  const applyExtracted = (parsed) => {
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
  };

  // ── Save project ─────────────────────────────────────────────
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
        detail: uploadedFileName ? `Imported from ${uploadedFileName}` : 'Created by pasting a planning document into PM Buddy',
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
      const briefPrompt = `Write a project brief in HTML for this project. Use h1 for title, h2 for sections, p for paragraphs. No html/head/body tags.

Project: ${extracted.name}
Industry: ${extracted.industry}
Description: ${extracted.description}
Goal: ${extracted.goal}
Team: ${extracted.teamMembers.length > 0 ? extracted.teamMembers.map(m => `${m.name} (${m.role})`).join(', ') : 'Solo project'}
Timeline: ${extracted.startDate ? `${extracted.startDate} to ${extracted.endDate}` : 'Not specified'}
Risks: ${extracted.risks.join(', ') || 'None listed'}
Milestones: ${extracted.milestones.map(m => m.title).join(', ') || 'None listed'}

Sections: Project Overview, Objectives, Scope, Team and Roles, Timeline, Key Risks, Success Metrics.`;

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
    } catch (err) { console.error('Brief error:', err); }

    onComplete(project);
  }, [extracted, user, onComplete, uploadedFileName]);

  // ── Field helpers ────────────────────────────────────────────
  const updateField = (field, value) => setExtracted(p => ({ ...p, [field]: value }));
  const updateMilestone = (i, field, val) => { const u = [...extracted.milestones]; u[i] = { ...u[i], [field]: val }; setExtracted(p => ({ ...p, milestones: u })); };
  const removeMilestone = (i) => setExtracted(p => ({ ...p, milestones: p.milestones.filter((_, idx) => idx !== i) }));
  const addMilestone = () => setExtracted(p => ({ ...p, milestones: [...p.milestones, { title: '', date: '', status: 'pending' }] }));
  const updateRisk = (i, val) => { const u = [...extracted.risks]; u[i] = val; setExtracted(p => ({ ...p, risks: u })); };
  const removeRisk = (i) => setExtracted(p => ({ ...p, risks: p.risks.filter((_, idx) => idx !== i) }));
  const addRisk = () => setExtracted(p => ({ ...p, risks: [...p.risks, ''] }));
  const updateMember = (i, field, val) => { const u = [...extracted.teamMembers]; u[i] = { ...u[i], [field]: val }; setExtracted(p => ({ ...p, teamMembers: u })); };
  const removeMember = (i) => setExtracted(p => ({ ...p, teamMembers: p.teamMembers.filter((_, idx) => idx !== i) }));
  const addMember = () => setExtracted(p => ({ ...p, teamMembers: [...p.teamMembers, { name: '', role: '' }] }));

  // ── Loading screens ──────────────────────────────────────────
  if (step === 'extracting' || step === 'saving') {
    return (
      <div style={s.page}>
        <div style={s.wrap}>
          <div style={s.loadingCard}>
            <div style={s.spinner} />
            <p style={s.loadingTitle}>{step === 'extracting' ? 'PM Buddy is reading your document' : 'Creating your project'}</p>
            <p style={s.loadingSubtext}>{step === 'extracting' ? 'Extracting project name, goal, milestones, risks and team details...' : 'Saving project and generating your project brief...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Review screen ────────────────────────────────────────────
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
                <p style={s.stepSub}>Review and correct anything below. PM Buddy reads documents well but is not perfect — especially with tables and complex formatting.</p>
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Project Name <span style={s.required}>*</span></label>
              <input style={s.input} value={extracted.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Community Training Program" />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>What is this project about?</label>
              <textarea style={s.textarea} rows={3} value={extracted.description} onChange={e => updateField('description', e.target.value)} placeholder="Describe the project in plain English." />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>What does success look like?</label>
              <textarea style={s.textarea} rows={3} value={extracted.goal} onChange={e => updateField('goal', e.target.value)} placeholder="What outcome is this project trying to achieve?" />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Industry</label>
              <div style={s.industryGrid}>
                {INDUSTRIES.map(ind => (
                  <button key={ind} style={{ ...s.industryBtn, background: extracted.industry === ind ? BLUE : WH, color: extracted.industry === ind ? WH : BL, borderColor: extracted.industry === ind ? BLUE : RULE }} onClick={() => updateField('industry', ind)}>{ind}</button>
                ))}
              </div>
            </div>

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

            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <label style={s.label}>Team Members</label>
                <button style={s.addSmallBtn} onClick={addMember}>+ Add</button>
              </div>
              {extracted.teamMembers.length === 0 && <p style={s.emptyHint}>No team members found. Add them manually if needed.</p>}
              {extracted.teamMembers.map((m, i) => (
                <div key={i} style={s.memberRow}>
                  <input style={{ ...s.inputInline, flex: 2 }} placeholder="Name" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                  <input style={{ ...s.inputInline, flex: 2 }} placeholder="Role" value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} />
                  <button style={s.removeBtn} onClick={() => removeMember(i)}>✕</button>
                </div>
              ))}
            </div>

            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <label style={s.label}>Milestones</label>
                <button style={s.addSmallBtn} onClick={addMilestone}>+ Add</button>
              </div>
              {extracted.milestones.length === 0 && <p style={s.emptyHint}>No milestones found. Add key checkpoints manually.</p>}
              {extracted.milestones.map((m, i) => (
                <div key={i} style={s.milestoneRow}>
                  <input style={{ ...s.inputInline, flex: 3 }} placeholder="Milestone name" value={m.title} onChange={e => updateMilestone(i, 'title', e.target.value)} />
                  <input style={{ ...s.inputInline, flex: 2 }} type="date" value={m.date || ''} onChange={e => updateMilestone(i, 'date', e.target.value)} />
                  <button style={s.removeBtn} onClick={() => removeMilestone(i)}>✕</button>
                </div>
              ))}
            </div>

            <div style={s.fieldGroup}>
              <div style={s.fieldLabelRow}>
                <label style={s.label}>Risks and Challenges</label>
                <button style={s.addSmallBtn} onClick={addRisk}>+ Add</button>
              </div>
              {extracted.risks.length === 0 && <p style={s.emptyHint}>No risks found. Add anything that could go wrong.</p>}
              {extracted.risks.map((r, i) => (
                <div key={i} style={s.riskRow}>
                  <input style={{ ...s.inputInline, flex: 1 }} placeholder="Describe a risk..." value={r} onChange={e => updateRisk(i, e.target.value)} />
                  <button style={s.removeBtn} onClick={() => removeRisk(i)}>✕</button>
                </div>
              ))}
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>How does the team share updates?</label>
              <input style={s.input} placeholder="e.g. Weekly meetings, WhatsApp group, monthly email reports" value={extracted.communicationFlow} onChange={e => updateField('communicationFlow', e.target.value)} />
            </div>

            {saveError && <div style={s.errorBox}><p style={s.errorText}>{saveError}</p></div>}

            <div style={s.footer}>
              <button style={s.backFooterBtn} onClick={() => setStep('paste')}>← Back</button>
              <button style={s.saveBtn} onClick={handleSave}>Save Project →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Paste / Upload screen ────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>

        <div style={s.card}>
          <p style={s.stepTag}>Import from Document · Step 1 of 2</p>
          <h2 style={s.stepTitle}>Bring in your planning document</h2>
          <p style={s.stepSub}>Already have a project plan, brief, proposal or scope document? PM Buddy will read it and pull out the key details automatically.</p>

          {/* Mode toggle */}
          <div style={s.modeToggle}>
            <button
              style={{ ...s.modeBtn, background: inputMode === 'paste' ? BL : WH, color: inputMode === 'paste' ? WH : '#374151', border: `1.5px solid ${inputMode === 'paste' ? BL : RULE}` }}
              onClick={() => { setInputMode('paste'); setExtractError(''); }}
            >✏ Paste text</button>
            <button
              style={{ ...s.modeBtn, background: inputMode === 'upload' ? BL : WH, color: inputMode === 'upload' ? WH : '#374151', border: `1.5px solid ${inputMode === 'upload' ? BL : RULE}` }}
              onClick={() => { setInputMode('upload'); setExtractError(''); }}
            >⬆ Upload file</button>
          </div>

          {/* PASTE MODE */}
          {inputMode === 'paste' && (
            <>
              <div style={s.examplesRow}>
                {['Project plan', 'Proposal', 'Scope document', 'Project brief', 'Grant application'].map((ex, i) => (
                  <span key={i} style={s.exampleChip}>{ex}</span>
                ))}
              </div>
              <div style={s.pasteArea}>
                <textarea
                  style={s.pasteTextarea}
                  placeholder={"Paste your document here...\n\nPM Buddy works best with documents that describe:\n• What the project is and what it will achieve\n• Who is involved and their roles\n• Key dates and milestones\n• Risks or challenges\n\nTip: if the document has tables, try removing them before pasting — plain text works best."}
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
              {extractError && <div style={s.errorBox}><p style={s.errorText}>{extractError}</p></div>}
              <button
                style={{ ...s.extractBtn, opacity: pastedText.trim().length < 50 ? 0.5 : 1 }}
                onClick={handleExtract}
                disabled={pastedText.trim().length < 50}
              >Read Document →</button>
            </>
          )}

          {/* UPLOAD MODE */}
          {inputMode === 'upload' && (
            <>
              <div style={s.uploadZone} onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <div style={s.uploadIcon}>⬆</div>
                <p style={s.uploadTitle}>{uploadedFileName || 'Click to upload your document'}</p>
                <p style={s.uploadSub}>Supports PDF, Word (.docx), and plain text files</p>
                <div style={s.uploadFormats}>
                  {['.pdf', '.docx', '.doc', '.txt'].map(f => <span key={f} style={s.formatChip}>{f}</span>)}
                </div>
              </div>

              {uploadedFileName && pastedText && (
                <div style={s.fileReadyBox}>
                  <p style={s.fileReadyText}>✓ {uploadedFileName} loaded — {charCount.toLocaleString()} characters</p>
                  <button style={s.extractBtn} onClick={handleExtract}>Read Document →</button>
                </div>
              )}

              {extractError && <div style={{ ...s.errorBox, marginTop: 16 }}><p style={s.errorText}>{extractError}</p></div>}

              <div style={{ ...s.hint, marginTop: 16 }}>
                <p style={s.hintText}><strong>PDF tip:</strong> If upload fails, open your PDF, select all text (Ctrl+A), copy it, and use the Paste option instead. Tables won't copy perfectly but the text will.</p>
              </div>
            </>
          )}
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
  stepSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },
  modeToggle: { display: 'flex', gap: 8, marginBottom: 20, marginTop: 4 },
  modeBtn: { padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  examplesRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  exampleChip: { fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: BLUE, padding: '4px 12px', borderRadius: 100 },
  pasteArea: { border: `1.5px solid ${RULE}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  pasteTextarea: { width: '100%', border: 'none', padding: '16px', fontSize: 14, fontFamily: 'inherit', color: BL, outline: 'none', resize: 'none', lineHeight: 1.7, background: WH, boxSizing: 'border-box' },
  pasteFooter: { display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', background: GREY, borderTop: `1px solid ${RULE}` },
  charCount: { fontSize: 12, fontWeight: 500 },
  uploadZone: { border: `2px dashed ${RULE}`, borderRadius: 14, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, transition: 'border-color 0.15s', background: GREY },
  uploadIcon: { fontSize: 32, marginBottom: 12, color: '#9CA3AF' },
  uploadTitle: { fontSize: 15, fontWeight: 700, color: BL, marginBottom: 6 },
  uploadSub: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  uploadFormats: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  formatChip: { fontSize: 11, fontWeight: 700, background: WH, color: '#6B7280', border: `1px solid ${RULE}`, padding: '3px 10px', borderRadius: 6 },
  fileReadyBox: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px', marginBottom: 16 },
  fileReadyText: { fontSize: 13, color: '#15803D', fontWeight: 600, marginBottom: 12 },
  hint: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', marginBottom: 20 },
  hintText: { fontSize: 13, color: '#92400E', lineHeight: 1.65 },
  extractBtn: { width: '100%', padding: '14px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
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
  industryBtn: { padding: '8px 16px', border: '1.5px solid', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
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
