import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

export default function DocumentGenerator({ data, methodology, user, openDoc }) {
  const [generating, setGenerating] = useState(null);
  const [preview, setPreview] = useState(openDoc?.content || null);
  const [previewType, setPreviewType] = useState(openDoc?.type || null);
  const [genError, setGenError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(openDoc?.content || '');
  const [saving, setSaving] = useState(false);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [currentDocId, setCurrentDocId] = useState(openDoc?.id || null);
  const [benefits, setBenefits] = useState({
    problem: '', affectedPeople: '', expectedRevenue: '',
    socialImpact: '', strategicAlignment: '', successMetrics: '',
    timeToValue: '', accountable: '',
  });
  const [aiReport, setAiReport] = useState(data.ai_health_check || null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportError, setAiReportError] = useState(null);
  const [showBenefitsForm, setShowBenefitsForm] = useState(false);

  const runAiReport = async () => {
    setAiReportLoading(true);
    setAiReport(null);
    setAiReportError(null);
    const scope = data.scope || {};
    const risks = (data.risks || []);
    const milestones = (data.milestones || []);
    const team = (data.team || []);
    const planning = data.planning || {};

    const prompt = `You are a senior project manager doing a detailed health check on a project. Be specific, honest and helpful. Reference the actual project details in your response.

PROJECT DETAILS:
Name: ${data.name}
Industry: ${data.industry}
Methodology: ${methodology}
Goal: ${scope.goal || 'Not provided'}
Description: ${data.description || 'Not provided'}
Team type: ${data.team_type || 'Not set'}
Team members: ${team.length > 0 ? team.map(m => `${m.name} (${m.role})`).join(', ') : 'None added'}
Risks identified: ${risks.length > 0 ? risks.map(r => r.title).join(', ') : 'None'}
Milestones: ${milestones.length > 0 ? milestones.map(m => m.title).join(', ') : 'None'}
Start date: ${data.timeline?.start || 'Not set'}
End date: ${data.timeline?.end || 'Not set'}
Communication plan: ${planning.communications || 'Not set'}
Tools: ${planning.tools || 'Not set'}

Respond ONLY with this JSON. No markdown. No code blocks. Pure JSON.
{"score":75,"verdict":"Almost ready","strengths":[{"title":"Clear title here","detail":"Specific explanation referencing their actual project data. Why this is good and what it enables."},{"title":"Second strength","detail":"Specific explanation."}],"gaps":[{"title":"Gap title","why":"Why this matters for THIS specific project","howToFix":"Concrete actionable step they can take right now, specific to their project"},{"title":"Second gap","why":"Why it matters","howToFix":"How to fix it"}],"recommendation":"One specific sentence telling them the single most important action to take today based on their project","readyToDocument":true}

Rules:
- Score 0-100 based on completeness and quality
- verdict: "Ready to document", "Almost ready", or "Needs more work"  
- Max 3 strengths and 3 gaps
- Reference their actual project name, goal, industry or team in your responses
- howToFix must be specific and actionable, not generic advice
- Keep each field under 30 words`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) {
        setAiReportError('AI is busy right now. Please try again in a moment.');
        setAiReportLoading(false);
        return;
      }
      const result = await res.json();
      if (result.result) {
        const clean = result.result.replace(/```json|```/g, '').trim();
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
          setAiReportError('Could not parse AI response. Please try again.');
          setAiReportLoading(false);
          return;
        }
        const jsonStr = clean.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);
        setAiReport(parsed);
        await supabase.from('pm_projects').update({ ai_health_check: parsed }).eq('id', data.id);
      } else {
        setAiReportError('No response from AI. Please try again.');
      }
    } catch (err) {
      console.error('AI report error:', err);
      setAiReportError('Something went wrong. Please try again.');
    }
    setAiReportLoading(false);
  };

  const fetchDocs = async () => {
    setLoadingDocs(true);
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', data.id)
      .order('updated_at', { ascending: false });
    setSavedDocs(docs || []);
    setLoadingDocs(false);
  };

  useEffect(() => { fetchDocs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateDocument = async (type) => {
    setGenerating(type);
    setPreview(null);
    setGenError(null);
    setCurrentDocId(null);
    try {
      const content = type === 'pm'
        ? await generatePMContent(data, methodology)
        : await generateBenefitsContent(data, benefits);
      if (!content || content.trim().length < 100) {
        setGenError('The document came back empty. Please try again.');
        setGenerating(null);
        return;
      }
      setPreview(content);
      setPreviewType(type);
      setEditContent(content);

      // Auto-save
      if (user) {
        const userId = typeof user === 'string' ? user : user?.id;
        const title = type === 'pm' ? 'Project Management Plan' : 'Benefits Management Document';
        const { data: doc } = await supabase.from('documents').insert({
          user_id: userId,
          project_id: data.id,
          project_name: data.name,
          type,
          title,
          content,
        }).select().single();
        if (doc) { setCurrentDocId(doc.id); fetchDocs(); }
      }
    } catch (err) {
      console.error('Document generation error:', err);
      if (err.name === 'AbortError') {
        setGenError('This is taking longer than expected. Please check your connection and try again.');
      } else {
        setGenError('AI is experiencing high demand right now. Please wait a moment and try again.');
      }
    }
    setGenerating(null);
  };

  const saveDocument = async () => {
    if (!preview || !user) return;
    setSaving(true);
    const userId = typeof user === 'string' ? user : user?.id;
    const title = previewType === 'pm' ? 'Project Management Plan' : 'Benefits Management Document';
    if (currentDocId) {
      await supabase.from('documents').update({
        content: editing ? editContent : preview,
        updated_at: new Date().toISOString(),
      }).eq('id', currentDocId);
    } else {
      const { data: doc } = await supabase.from('documents').insert({
        user_id: userId,
        project_id: data.id,
        project_name: data.name,
        type: previewType,
        title,
        content: preview,
      }).select().single();
      if (doc) setCurrentDocId(doc.id);
    }
    setSaving(false);
    fetchDocs();
  };

  const saveEdits = async () => {
    if (!currentDocId) { await saveDocument(); }
    setSaving(true);
    await supabase.from('documents').update({
      content: editContent,
      updated_at: new Date().toISOString(),
    }).eq('id', currentDocId);
    setPreview(editContent);
    setEditing(false);
    setSaving(false);
    fetchDocs();
  };

  const openSavedDoc = (doc) => {
    setPreview(doc.content);
    setPreviewType(doc.type);
    setEditContent(doc.content);
    setCurrentDocId(doc.id);
    setEditing(false);
  };

  const deleteDoc = async (id) => {
    await supabase.from('documents').delete().eq('id', id);
    if (currentDocId === id) { setPreview(null); setCurrentDocId(null); }
    fetchDocs();
  };

  const downloadHTML = (type, content) => {
    const html = buildStyledHTML(content || preview, type || previewType, data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '_')}_${type === 'pm' ? 'PM_Plan' : 'Benefits_Document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printDocument = (content) => {
    const html = buildStyledHTML(content || preview, previewType, data);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div>
      <div style={s.sectionHeadWrap}>
        <h3 style={s.sectionHeadTitle}>Documents</h3>
        <p style={s.sectionHeadSub}>Generate, edit and save professional PM documents for your project.</p>
      </div>

      {/* AI PROJECT HEALTH CHECK */}
      <div style={s.aiReportCard}>
        <div style={s.aiReportTop}>
          <div>
            <p style={s.aiReportTitle}>AI Project Health Check</p>
            <p style={s.aiReportSub}>Get an honest review of your project setup before generating documents.</p>
          </div>
          <button style={s.aiReportBtn} onClick={runAiReport} disabled={aiReportLoading}>
            {aiReportLoading ? 'Reviewing...' : aiReport ? 'Run Again' : 'Run Health Check'}
          </button>
        </div>

        {aiReportLoading && (
          <div style={s.aiReportLoading}>
            <div style={s.aiSpinner} />
            <p style={s.aiReportLoadingText}>Reviewing your project setup...</p>
          </div>
        )}

        {aiReportError && !aiReportLoading && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{aiReportError}</p>
            <button style={{ padding: '5px 12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={runAiReport}>Retry</button>
          </div>
        )}

        {aiReport && !aiReportLoading && (
          <div style={s.aiReportResult}>
            <div style={s.aiScoreRow}>
              <div style={s.aiScoreBlock}>
                <span style={{ ...s.aiScore, color: aiReport.score >= 70 ? '#15803D' : aiReport.score >= 50 ? BLUE : '#D97706' }}>
                  {aiReport.score}
                </span>
                <span style={s.aiScoreLabel}>/ 100</span>
              </div>
              <span style={{
                ...s.aiVerdict,
                background: aiReport.readyToDocument ? '#F0FDF4' : '#FFFBEB',
                color: aiReport.readyToDocument ? '#15803D' : '#D97706',
              }}>
                {aiReport.verdict}
              </span>
            </div>

            {aiReport.strengths?.length > 0 && (
              <div style={s.aiSection}>
                <p style={s.aiSectionLabel}>What is working</p>
                {aiReport.strengths.map((item, i) => (
                  <div key={i} style={s.aiStrengthCard}>
                    <div style={s.aiStrengthTop}>
                      <div style={{ ...s.aiDot, background: '#15803D', marginTop: 2 }} />
                      <p style={s.aiItemTitle}>{typeof item === 'string' ? item : item.title}</p>
                    </div>
                    {item.detail && <p style={s.aiItemDetail}>{item.detail}</p>}
                  </div>
                ))}
              </div>
            )}

            {aiReport.gaps?.length > 0 && (
              <div style={s.aiSection}>
                <p style={s.aiSectionLabel}>What needs attention</p>
                {aiReport.gaps.map((item, i) => (
                  <div key={i} style={s.aiGapCard}>
                    <div style={s.aiGapTop}>
                      <div style={{ ...s.aiDot, background: '#D97706', marginTop: 2 }} />
                      <p style={s.aiItemTitle}>{typeof item === 'string' ? item : item.title}</p>
                    </div>
                    {item.why && (
                      <div style={s.aiGapBody}>
                        <p style={s.aiGapWhy}><strong>Why it matters:</strong> {item.why}</p>
                        {item.howToFix && <p style={s.aiGapFix}><strong>How to fix it:</strong> {item.howToFix}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {aiReport.recommendation && (
              <div style={s.aiRecommendation}>
                <p style={s.aiRecLabel}>Top recommendation</p>
                <p style={s.aiRecText}>{aiReport.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SAVED DOCUMENTS */}
      {!loadingDocs && savedDocs.length > 0 && (
        <div style={s.savedSection}>
          <p style={s.savedLabel}>Saved Documents</p>
          {savedDocs.map(doc => (
            <div key={doc.id} style={s.savedRow}>
              <div style={s.savedLeft}>
                <span style={{ ...s.docAudience, background: doc.type === 'pm' ? '#EFF6FF' : '#F5F3FF', color: doc.type === 'pm' ? BLUE : '#7C3AED' }}>
                  {doc.type === 'pm' ? 'Internal' : 'External'}
                </span>
                <p style={s.savedTitle}>{doc.title}</p>
                <p style={s.savedDate}>Last updated {new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div style={s.savedActions}>
                <button style={s.smBtn} onClick={() => openSavedDoc(doc)}>Open</button>
                <button style={s.smBtn} onClick={() => downloadHTML(doc.type, doc.content)}>Download</button>
                <button style={{ ...s.smBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => deleteDoc(doc.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PM DOCUMENT */}
      <div style={s.docCard}>
        <span style={s.docAudience}>Internal</span>
        <p style={s.docTitle}>Project Management Plan</p>
        <p style={s.docDesc}>The full internal document for your team. Covers scope, timeline, milestones, team roles, risks, communication plan and compliance.</p>
        <div style={s.sectionTags}>
          {['Project Overview', 'Scope and Deliverables', 'Team and Roles', 'Timeline', 'Communication Plan', 'Risk Register', 'Compliance'].map((tag, i) => (
            <span key={i} style={s.sectionTag}>{tag}</span>
          ))}
        </div>
        <div style={s.docBtns}>
          <button style={{ ...s.primaryBtn, opacity: generating === 'pm' ? 0.7 : 1 }} onClick={() => generateDocument('pm')} disabled={!!generating}>
            {generating === 'pm' ? 'Writing document...' : 'Generate Document'}
          </button>
        </div>
        {generating === 'pm' && <p style={s.generatingNote}>PM Buddy is writing your masterpiece project management plan. This can take up to 1 min — nothing good comes easily 🤗</p>}
        {genError && previewType !== 'pm' && !generating && (
          <div style={s.errorNote}>
            <p style={s.errorNoteText}>{genError}</p>
            <button style={s.retryBtn} onClick={() => generateDocument('pm')}>Try again</button>
          </div>
        )}
      </div>

      {/* BENEFITS DOCUMENT */}
      <div style={s.docCard}>
        <span style={{ ...s.docAudience, background: '#F5F3FF', color: '#7C3AED' }}>External</span>
        <p style={s.docTitle}>Benefits Management Document</p>
        <p style={s.docDesc}>For investors, sponsors and senior stakeholders. Focused on why this project matters, what it delivers and what return to expect.</p>
        <div style={s.sectionTags}>
          {['Problem Statement', 'Expected Benefits', 'Business Case', 'Success Metrics', 'Accountability'].map((tag, i) => (
            <span key={i} style={{ ...s.sectionTag, background: '#F5F3FF', color: '#7C3AED' }}>{tag}</span>
          ))}
        </div>
        <button style={s.textBtn} onClick={() => setShowBenefitsForm(p => !p)}>
          {showBenefitsForm ? '▲ Hide additional details' : '▼ Add details for investors and sponsors'}
        </button>
        {showBenefitsForm && (
          <div style={s.benefitsForm}>
            <p style={s.benefitsFormNote}>These details make the document more compelling for investors. Fill in as much as you can.</p>
            {[
              { key: 'problem', label: 'What problem does this solve?', placeholder: 'Describe the problem in business terms...' },
              { key: 'affectedPeople', label: 'Who is affected and how many?', placeholder: 'Give a sense of the scale...' },
              { key: 'expectedRevenue', label: 'Expected revenue or financial return?', placeholder: 'Projected revenue figures...' },
              { key: 'socialImpact', label: 'Social or community impact?', placeholder: 'Jobs created, communities served...' },
              { key: 'strategicAlignment', label: 'Strategic alignment?', placeholder: 'How this aligns with wider priorities...' },
              { key: 'successMetrics', label: 'How will you measure success?', placeholder: 'Specific numbers and timeframes...' },
              { key: 'timeToValue', label: 'When will stakeholders see benefits?', placeholder: 'Realistic timeline to value...' },
              { key: 'accountable', label: 'Who is accountable?', placeholder: 'Name and role...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={s.label}>{label}</label>
                <textarea style={s.textarea} rows={2} placeholder={placeholder} value={benefits[key]} onChange={e => setBenefits(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}
        <div style={s.docBtns}>
          <button style={{ ...s.primaryBtn, background: '#7C3AED', opacity: generating === 'benefits' ? 0.7 : 1 }} onClick={() => generateDocument('benefits')} disabled={!!generating}>
            {generating === 'benefits' ? 'Writing document...' : 'Generate Document'}
          </button>
        </div>
        {generating === 'benefits' && <p style={s.generatingNote}>PM Buddy is writing your masterpiece benefits document. This can take up to 1 min — nothing good comes easily 🤗</p>}
        {genError && previewType !== 'benefits' && !generating && (
          <div style={s.errorNote}>
            <p style={s.errorNoteText}>{genError}</p>
            <button style={s.retryBtn} onClick={() => generateDocument('benefits')}>Try again</button>
          </div>
        )}
      </div>

      {/* PREVIEW */}
      {preview && (
        <div style={s.previewCard}>
          <div style={s.previewHeader}>
            <p style={s.previewLabel}>
              {currentDocId ? 'Saved Document' : 'Document Preview'}
              {!currentDocId && <span style={s.unsavedBadge}>Unsaved</span>}
            </p>
            <div style={s.previewBtns}>
              {!editing && (
                <>
                  <button style={s.smBtn} onClick={() => { setEditing(true); setEditContent(preview); }}>Edit</button>
                  <button style={s.smBtn} onClick={() => downloadHTML(previewType, preview)}>Download</button>
                  <button style={s.smBtn} onClick={() => printDocument(preview)}>Print / PDF</button>
                  {!currentDocId && (
                    <button style={{ ...s.smBtn, background: BL, color: WH, borderColor: BL }} onClick={saveDocument} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </>
              )}
              {editing && (
                <>
                  <button style={{ ...s.smBtn, background: BL, color: WH, borderColor: BL }} onClick={saveEdits} disabled={saving}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button style={s.smBtn} onClick={() => { setEditing(false); setEditContent(preview); }}>Cancel</button>
                </>
              )}
            </div>
          </div>

          {editing ? (
            <div style={s.editArea}>
              <p style={s.editNote}>Click anywhere in the document to edit. Your changes are saved when you click "Save changes".</p>
              <div
                style={s.editableDoc}
                contentEditable
                suppressContentEditableWarning
                onInput={e => setEditContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: editContent }}
              />
            </div>
          ) : (
            <div style={s.previewContent} dangerouslySetInnerHTML={{ __html: preview }} />
          )}
        </div>
      )}

      <div style={s.noteCard}>
        <p style={s.noteText}>To save as PDF: click Print, then choose Save as PDF. To open in Word: download the HTML file and open it with Microsoft Word.</p>
      </div>
    </div>
  );
}

async function generatePMContent(data, methodology) {
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
  const risks = (data.risks || []);
  const team = (data.team || []);
  const milestones = (data.milestones || []);
  const scope = data.scope || {};

  const prompt = `Write a Project Management Plan in HTML. Use h2 for headings, p for paragraphs. No html/head/body tags. Professional English. No bullet points in prose.

Project: ${data.name} | Industry: ${data.industry} | Approach: ${methodology}
Description: ${data.description}
Goal: ${scope.goal}
Timeline: ${formatDate(data.timeline?.start)} to ${formatDate(data.timeline?.end)}
Team: ${team.length > 0 ? team.map(m => `${m.name} (${m.role})`).join(', ') : 'Solo project'}
Risks: ${risks.map(r => `${r.title} (${r.level})`).join(', ') || 'None'}
Milestones: ${milestones.map(m => `${m.title} due ${formatDate(m.date)}`).join(', ')}

Write these sections: Executive Summary, Project Overview, Scope and Deliverables, Team and Responsibilities, Timeline and Milestones, Communication Plan, Risk Management, Definition of Done.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode: 'document' }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }
  const result = await response.json();
  return (result.result || '').replace(/```html|```/g, '').trim();
}

async function generateBenefitsContent(data, benefits) {
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
  const scope = data.scope || {};

  const prompt = `You are a professional business analyst writing a Benefits Management Document for investors and senior stakeholders. Write in clear, compelling, professional English. Be specific. Avoid technical PM language.

Project Name: ${data.name}
Industry: ${data.industry}
Goal: ${scope.goal}
Description: ${data.description}
Timeline: ${formatDate(data.timeline?.start)} to ${formatDate(data.timeline?.end)}
Problem: ${benefits.problem || 'See project description'}
People Affected: ${benefits.affectedPeople || 'Not specified'}
Expected Revenue: ${benefits.expectedRevenue || 'Not specified'}
Social Impact: ${benefits.socialImpact || 'Not specified'}
Strategic Alignment: ${benefits.strategicAlignment || 'Not specified'}
Success Metrics: ${benefits.successMetrics || 'Not specified'}
Time to Value: ${benefits.timeToValue || 'Not specified'}
Accountable: ${benefits.accountable || 'Not specified'}
Risks: ${(data.risks || []).map(r => r.title).join(', ') || 'Not specified'}

Write the following sections in HTML using h2 for headings and p for paragraphs. No html, head or body tags. No markdown.

Sections: Executive Summary, The Problem We Are Solving, The Solution and Its Value, Expected Benefits, How We Will Measure Success, Timeline to Benefits Realisation, Risks to Benefits Delivery, Accountability and Governance, Why This Investment Matters.

Write with conviction.`;

  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), 90000);
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode: 'document' }),
    signal: controller2.signal,
  });
  clearTimeout(timeout2);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }
  const result = await response.json();
  return (result.result || '').replace(/```html|```/g, '').trim();
}

function buildStyledHTML(content, type, data) {
  const isPM = type === 'pm';
  const accentColor = isPM ? '#0284C7' : '#7C3AED';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${data.name} — ${isPM ? 'Project Management Plan' : 'Benefits Management Document'}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; line-height: 1.7; } .cover { padding: 80px 60px; min-height: 100vh; border-left: 8px solid ${accentColor}; display: flex; flex-direction: column; justify-content: center; page-break-after: always; } .cover-tag { font-size: 9pt; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20px; } .cover-title { font-size: 32pt; font-weight: 900; color: #0a0a0a; line-height: 1.1; margin-bottom: 12px; } .cover-doctype { font-size: 16pt; color: ${accentColor}; font-weight: 600; margin-bottom: 40px; } .cover-desc { font-size: 12pt; color: #4B5563; max-width: 500px; margin-bottom: 48px; line-height: 1.7; } .cover-meta { display: flex; gap: 40px; flex-wrap: wrap; padding-top: 32px; border-top: 1px solid #E5E7EB; } .meta-item label { display: block; font-size: 8pt; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; } .meta-item span { font-size: 10pt; font-weight: 600; color: #0a0a0a; } .content { padding: 60px; max-width: 800px; margin: 0 auto; } h2 { font-size: 16pt; font-weight: 800; color: ${accentColor}; margin-top: 48px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid ${accentColor}25; } h3 { font-size: 12pt; font-weight: 700; color: #374151; margin-top: 20px; margin-bottom: 8px; } p { font-size: 11pt; line-height: 1.8; color: #374151; margin-bottom: 14px; } ul, ol { padding-left: 24px; margin-bottom: 14px; } li { font-size: 11pt; line-height: 1.7; color: #374151; margin-bottom: 6px; } strong { font-weight: 700; color: #0a0a0a; } .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 9pt; color: #9CA3AF; } @media print { .cover { min-height: 100vh; } }</style></head><body><div class="cover"><div class="cover-tag">PM Buddy — ${isPM ? 'Internal Document' : 'External Stakeholder Document'}</div><div class="cover-title">${data.name}</div><div class="cover-doctype">${isPM ? 'Project Management Plan' : 'Benefits Management Document'}</div><div class="cover-desc">${data.description || ''}</div><div class="cover-meta"><div class="meta-item"><label>Industry</label><span>${data.industry || 'Not set'}</span></div><div class="meta-item"><label>Approach</label><span>${data.methodology || 'Not set'}</span></div><div class="meta-item"><label>Generated</label><span>${today}</span></div></div></div><div class="content">${content}<div class="footer"><span>Generated by PM Buddy</span><span>${data.name} — ${today}</span></div></div></body></html>`;
}

const s = {
  sectionHeadWrap: { marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  aiReportCard: { border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px', marginBottom: 20, background: WH },
  aiReportTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 4 },
  aiReportTitle: { fontSize: 14, fontWeight: 600, color: BL, marginBottom: 4 },
  aiReportSub: { fontSize: 13, color: '#6B7280' },
  aiReportBtn: { padding: '8px 18px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  aiReportLoading: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0' },
  aiSpinner: { width: 20, height: 20, border: '2px solid #F3F4F6', borderTop: `2px solid ${BLUE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 },
  aiReportLoadingText: { fontSize: 13, color: '#6B7280' },
  aiReportResult: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #F3F4F6' },
  aiScoreRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  aiScoreBlock: { display: 'flex', alignItems: 'baseline', gap: 4 },
  aiScore: { fontSize: 36, fontWeight: 600, letterSpacing: '-1px', lineHeight: 1 },
  aiScoreLabel: { fontSize: 13, color: '#9CA3AF' },
  aiVerdict: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100 },
  aiSection: { marginBottom: 14 },
  aiSectionLabel: { fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  aiItem: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  aiDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6 },
  aiItemText: { fontSize: 13, color: '#374151', lineHeight: 1.6 },
  aiRecommendation: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px', marginTop: 4 },
  aiRecLabel: { fontSize: 11, fontWeight: 600, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  aiRecText: { fontSize: 13, color: '#1E40AF', lineHeight: 1.65 },
  sectionHeadTitle: { fontSize: 18, fontWeight: 700, color: BL, marginBottom: 4 },
  sectionHeadSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },
  savedSection: { marginBottom: 24, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' },
  savedLabel: { fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 16px', background: GREY, borderBottom: '1px solid #E5E7EB' },
  savedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap', gap: 10 },
  savedLeft: { flex: 1 },
  savedTitle: { fontSize: 14, fontWeight: 600, color: BL, marginTop: 4, marginBottom: 2 },
  savedDate: { fontSize: 12, color: '#9CA3AF' },
  savedActions: { display: 'flex', gap: 8 },
  docCard: { background: GREY, borderRadius: 12, padding: '20px', border: '1px solid #E5E7EB', marginBottom: 16 },
  docAudience: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100, display: 'inline-block', marginBottom: 10 },
  docTitle: { fontSize: 16, fontWeight: 700, color: BL, marginBottom: 6 },
  docDesc: { fontSize: 14, color: '#6B7280', lineHeight: 1.75, marginBottom: 12 },
  sectionTags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  sectionTag: { fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  docBtns: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  primaryBtn: { padding: '10px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  smBtn: { padding: '7px 14px', background: WH, color: BL, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  textBtn: { background: 'none', border: 'none', color: BLUE, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', marginBottom: 8, display: 'block' },
  generatingNote: { fontSize: 13, color: '#6B7280', marginTop: 10 },
  errorNote: { marginTop: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  errorNoteText: { fontSize: 13, color: '#DC2626', lineHeight: 1.5, flex: 1 },
  retryBtn: { padding: '6px 14px', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  benefitsForm: { background: WH, borderRadius: 10, padding: '16px', border: '1px solid #E5E7EB', marginBottom: 14 },
  benefitsFormNote: { fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 },
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  previewCard: { background: WH, borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginTop: 16 },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #E5E7EB', background: GREY, flexWrap: 'wrap', gap: 10 },
  previewLabel: { fontSize: 13, fontWeight: 700, color: BL, display: 'flex', alignItems: 'center', gap: 8 },
  unsavedBadge: { fontSize: 10, fontWeight: 600, background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: 100 },
  previewBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  previewContent: { padding: '24px', maxHeight: 500, overflowY: 'auto', fontSize: 14, lineHeight: 1.75, color: '#374151' },
  aiStrengthCard: { marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #F0FDF4' },
  aiStrengthTop: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 },
  aiGapCard: { marginBottom: 12, padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 },
  aiGapTop: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  aiItemTitle: { fontSize: 13, fontWeight: 600, color: BL, lineHeight: 1.4 },
  aiItemDetail: { fontSize: 13, color: '#374151', lineHeight: 1.6, marginLeft: 14, marginTop: 2 },
  aiGapBody: { marginLeft: 14 },
  aiGapWhy: { fontSize: 13, color: '#92400E', lineHeight: 1.6, marginBottom: 6 },
  aiGapFix: { fontSize: 13, color: '#374151', lineHeight: 1.6, background: WH, padding: '8px 10px', borderRadius: 6, border: '1px solid #FDE68A' },
  editArea: { padding: '0' },
  editNote: { fontSize: 12, color: '#9CA3AF', padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' },
  editableDoc: {
    padding: '32px',
    minHeight: 400,
    outline: 'none',
    fontSize: 14,
    lineHeight: 1.8,
    color: '#374151',
    fontFamily: 'Georgia, serif',
  },
  noteCard: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', marginTop: 12 },
  noteText: { fontSize: 12, color: '#92400E', lineHeight: 1.7 },
};
