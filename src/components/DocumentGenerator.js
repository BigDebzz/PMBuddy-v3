import React, { useState } from 'react';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

export default function DocumentGenerator({ data, methodology }) {
  const [generating, setGenerating] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [benefits, setBenefits] = useState({
    problem: '',
    affectedPeople: '',
    expectedRevenue: '',
    socialImpact: '',
    strategicAlignment: '',
    successMetrics: '',
    timeToValue: '',
    accountable: '',
  });
  const [showBenefitsForm, setShowBenefitsForm] = useState(false);

  const generateDocument = async (type) => {
    setGenerating(type);
    setPreview(null);

    try {
      const content = type === 'pm'
        ? await generatePMContent(data, methodology)
        : await generateBenefitsContent(data, benefits);

      setPreview(content);
      setPreviewType(type);
    } catch (err) {
      console.error(err);
    }
    setGenerating(null);
  };

  const downloadHTML = (type) => {
    const html = buildStyledHTML(preview, type, data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '_')}_${type === 'pm' ? 'Project_Management_Plan' : 'Benefits_Management_Document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDocument = () => {
    const html = buildStyledHTML(preview, previewType, data);
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
        <p style={s.sectionHeadSub}>PM Buddy generates two types of documents. One for your internal team and one for external stakeholders and sponsors.</p>
      </div>

      {/* PM DOCUMENT */}
      <div style={s.docCard}>
        <div style={s.docCardTop}>
          <div style={s.docCardLeft}>
            <span style={s.docAudience}>Internal</span>
            <p style={s.docTitle}>Project Management Plan</p>
            <p style={s.docDesc}>The full internal document for your team. Covers scope, timeline, milestones, team roles, risks, communication plan and compliance. Written professionally and ready to share with anyone running or supporting this project.</p>
            <div style={s.sectionTags}>
              {['Project Overview', 'Scope and Deliverables', 'Team and Roles', 'Timeline and Milestones', 'Communication Plan', 'Risk Register', 'Compliance'].map((tag, i) => (
                <span key={i} style={s.sectionTag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={s.docBtns}>
          <button style={{ ...s.primaryBtn, opacity: generating === 'pm' ? 0.7 : 1 }} onClick={() => generateDocument('pm')} disabled={!!generating}>
            {generating === 'pm' ? 'Writing document...' : 'Generate Document'}
          </button>
          {previewType === 'pm' && preview && (
            <>
              <button style={s.outlineBtn} onClick={() => downloadHTML('pm')}>Download HTML</button>
              <button style={s.outlineBtn} onClick={printDocument}>Print or Save as PDF</button>
            </>
          )}
        </div>
        {generating === 'pm' && <div style={s.generatingNote}>Gemini is writing your project management plan. This takes about 15 seconds...</div>}
      </div>

      {/* BENEFITS DOCUMENT */}
      <div style={s.docCard}>
        <div style={s.docCardTop}>
          <div style={s.docCardLeft}>
            <span style={{ ...s.docAudience, background: '#F5F3FF', color: '#7C3AED' }}>External</span>
            <p style={s.docTitle}>Benefits Management Document</p>
            <p style={s.docDesc}>For investors, sponsors, board members and senior stakeholders who do not need to know how the project is being run but need to understand why it matters, what it delivers and what return to expect. Written in plain business language.</p>
            <div style={s.sectionTags}>
              {['Problem Statement', 'Expected Benefits', 'Business Case', 'Success Metrics', 'Risk to Benefits', 'Timeline to Value', 'Accountability'].map((tag, i) => (
                <span key={i} style={{ ...s.sectionTag, background: '#F5F3FF', color: '#7C3AED' }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <button style={s.textBtn} onClick={() => setShowBenefitsForm(p => !p)}>
          {showBenefitsForm ? '▲ Hide additional details' : '▼ Add details for investors and sponsors'}
        </button>

        {showBenefitsForm && (
          <div style={s.benefitsForm}>
            <p style={s.benefitsFormNote}>These details make the document more compelling for investors. Fill in as much as you can. PM Buddy will use your existing project data for the rest.</p>
            {[
              { key: 'problem', label: 'What problem does this solve?', hint: 'Describe the problem in business terms. Who is affected and what does it cost them?', placeholder: 'e.g. Small business owners in Nigeria lose an average of 3 hours per week managing manual payment reconciliation...' },
              { key: 'affectedPeople', label: 'Who is affected and how many?', hint: 'Give a sense of the scale of the problem.', placeholder: 'e.g. Over 2 million SMEs in Nigeria face this challenge...' },
              { key: 'expectedRevenue', label: 'What is the expected revenue or financial return?', hint: 'Be as specific as possible. Projections are fine.', placeholder: 'e.g. Projected revenue of 50 million NGN in year one based on 500 paying customers at 8,300 NGN per month...' },
              { key: 'socialImpact', label: 'What is the social or community impact?', hint: 'Optional but powerful for impact investors and grant bodies.', placeholder: 'e.g. This will create 20 direct jobs and support 500 small business owners...' },
              { key: 'strategicAlignment', label: 'How does this align with wider market trends or government priorities?', hint: 'e.g. aligns with CBN cashless policy, supports the digital economy agenda', placeholder: 'e.g. Directly supports the Nigerian government push toward a cashless economy...' },
              { key: 'successMetrics', label: 'How will you measure success?', hint: 'Specific numbers and timeframes.', placeholder: 'e.g. 500 active users, 95% payment success rate, 40% reduction in reconciliation time within 6 months...' },
              { key: 'timeToValue', label: 'When will stakeholders start seeing the benefits?', hint: 'Give a realistic timeline.', placeholder: 'e.g. First measurable benefits within 3 months of launch...' },
              { key: 'accountable', label: 'Who is accountable for delivering the benefits?', hint: 'Name and role of the person responsible.', placeholder: 'e.g. Deborah Akpokighe, Project Lead...' },
            ].map(({ key, label, hint, placeholder }) => (
              <div key={key} style={s.benefitsField}>
                <label style={s.label}>{label}</label>
                <p style={s.fieldHint}>{hint}</p>
                <textarea style={s.textarea} rows={3} placeholder={placeholder} value={benefits[key]} onChange={e => setBenefits(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}

        <div style={s.docBtns}>
          <button style={{ ...s.primaryBtn, background: '#7C3AED', opacity: generating === 'benefits' ? 0.7 : 1 }} onClick={() => generateDocument('benefits')} disabled={!!generating}>
            {generating === 'benefits' ? 'Writing document...' : 'Generate Document'}
          </button>
          {previewType === 'benefits' && preview && (
            <>
              <button style={s.outlineBtn} onClick={() => downloadHTML('benefits')}>Download HTML</button>
              <button style={s.outlineBtn} onClick={printDocument}>Print or Save as PDF</button>
            </>
          )}
        </div>
        {generating === 'benefits' && <div style={s.generatingNote}>Gemini is writing your benefits management document. This takes about 15 seconds...</div>}
      </div>

      {/* PREVIEW */}
      {preview && (
        <div style={s.previewCard}>
          <div style={s.previewHeader}>
            <p style={s.previewLabel}>Document Preview</p>
            <div style={s.previewBtns}>
              <button style={s.outlineBtn} onClick={() => downloadHTML(previewType)}>Download HTML</button>
              <button style={s.outlineBtn} onClick={printDocument}>Print or Save as PDF</button>
            </div>
          </div>
          <div style={s.previewContent} dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      )}

      <div style={s.noteCard}>
        <p style={s.noteText}>To save as PDF: click Print or Save as PDF, then choose Save as PDF from your printer options. To open in Word: download the HTML file and open it with Microsoft Word.</p>
      </div>
    </div>
  );
}

async function generatePMContent(data, methodology) {
  const API_KEY = process.env.REACT_APP_GEMINI_KEY;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
  const risks = (data.risks || []);
  const team = (data.team || []);
  const milestones = (data.milestones || []);
  const planning = data.planning || {};
  const scope = data.scope || {};
  const compliance = data.compliance || {};

  const prompt = `You are a professional project manager writing a formal Project Management Plan document. Write this in clear, professional English. No jargon. Use full sentences and proper paragraphs. Do not use bullet points in prose sections. Be specific and detailed.

Here is the project information:

Project Name: ${data.name}
Industry: ${data.industry}
Approach: ${methodology}
Description: ${data.description}
Goal: ${scope.goal}
Definition of Done: ${planning.definitionOfDone || 'Not specified'}
Quality Standards: ${planning.qualityStandards || 'Not specified'}
Start Date: ${formatDate(data.timeline?.start)}
End Date: ${formatDate(data.timeline?.end)}
Team Type: ${data.team_type}
Team Members: ${team.length > 0 ? team.map(m => `${m.name} (${m.role})`).join(', ') : 'Solo project'}
Resources: Tools: ${planning.tools || data.resources?.tools || 'Not specified'}, Budget: ${data.resources?.budget || 'Not specified'}
Communication Plan: ${planning.communications || 'Not specified'}
Update Frequency: ${planning.updateFrequency || 'Not specified'}
Risks: ${risks.map(r => `${r.title} (${r.level})`).join(', ') || 'None identified'}
Milestones: ${milestones.map(m => `${m.title} due ${formatDate(m.date)}`).join(', ')}
Compliance Requirements: ${[...(compliance.flags || []), ...(compliance.internal || []), ...(compliance.external || [])].join(', ') || 'None specified'}

Write the following sections in HTML format using h2 for section headings and p for paragraphs. Do not include html, head or body tags. Do not use markdown. Use proper HTML only.

Sections to write:
1. Executive Summary (2 paragraphs summarising the project, its purpose and expected outcome)
2. Project Overview (describe what is being built, why it matters and who it is for)
3. Scope and Deliverables (what will be delivered and what is out of scope)
4. Team and Responsibilities (who is involved and what each person is responsible for)
5. Timeline and Milestones (narrative description of the project timeline and key milestones)
6. Communication Plan (how the team will communicate and keep stakeholders informed)
7. Risk Management (describe each risk and how it will be managed)
8. Compliance and Regulatory Considerations (what rules and policies apply to this project)
9. Definition of Done (how the team will know the project is complete)

Write each section with substance. A reader should come away with a clear understanding of the project.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2000 }
      })
    }
  );

  if (!response.ok) throw new Error('Gemini API error');
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.replace(/```html|```/g, '').trim();
}

async function generateBenefitsContent(data, benefits) {
  const API_KEY = process.env.REACT_APP_GEMINI_KEY;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
  const scope = data.scope || {};

  const prompt = `You are a professional business analyst writing a Benefits Management Document for investors, sponsors and senior stakeholders. This is NOT a project management document. It is a business case document focused entirely on the value and benefits this project delivers.

Write in clear, compelling, professional English. Use full sentences. Be specific. Avoid technical project management language. Write as if presenting to a board or investor.

Project Information:
Project Name: ${data.name}
Industry: ${data.industry}
Project Goal: ${scope.goal}
Project Description: ${data.description}
Timeline: ${formatDate(data.timeline?.start)} to ${formatDate(data.timeline?.end)}
Problem Being Solved: ${benefits.problem || 'See project description'}
People Affected: ${benefits.affectedPeople || 'Not specified'}
Expected Revenue or Financial Return: ${benefits.expectedRevenue || 'Not specified'}
Social or Community Impact: ${benefits.socialImpact || 'Not specified'}
Strategic Alignment: ${benefits.strategicAlignment || 'Not specified'}
Success Metrics: ${benefits.successMetrics || 'Not specified'}
Time to Value: ${benefits.timeToValue || 'Not specified'}
Accountable Person: ${benefits.accountable || 'Not specified'}
Key Risks to Benefits: ${(data.risks || []).map(r => r.title).join(', ') || 'Not specified'}

Write the following sections in HTML using h2 for headings and p for paragraphs. No html, head or body tags. No markdown. Proper HTML only.

Sections to write:
1. Executive Summary (2 compelling paragraphs that capture why this project matters and what it delivers)
2. The Problem We Are Solving (describe the problem in human and business terms. Who suffers, what it costs, why it has not been solved)
3. The Solution and Its Value (what this project delivers and why it is the right solution)
4. Expected Benefits (financial returns, social impact, strategic value, operational improvements — be specific with numbers where provided)
5. How We Will Measure Success (specific metrics, targets and timeframes)
6. Timeline to Benefits Realisation (when will stakeholders start seeing value and what does the benefit journey look like)
7. Risks to Benefits Delivery (what could prevent the benefits from being achieved and how these are being managed)
8. Accountability and Governance (who is responsible for delivering and tracking the benefits)
9. Why This Investment Matters (a closing argument for why this project deserves support and what happens if it does not get it)

Write with conviction. This document should make a compelling case for the project.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2000 }
      })
    }
  );

  if (!response.ok) throw new Error('Gemini API error');
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.replace(/```html|```/g, '').trim();
}

function buildStyledHTML(content, type, data) {
  const isPM = type === 'pm';
  const accentColor = isPM ? '#0284C7' : '#7C3AED';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.name} — ${isPM ? 'Project Management Plan' : 'Benefits Management Document'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; line-height: 1.7; }
  .cover { padding: 80px 60px; min-height: 100vh; border-left: 8px solid ${accentColor}; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
  .cover-tag { font-size: 9pt; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20px; }
  .cover-title { font-size: 32pt; font-weight: 900; color: #0a0a0a; line-height: 1.1; margin-bottom: 12px; }
  .cover-doctype { font-size: 16pt; color: ${accentColor}; font-weight: 600; margin-bottom: 40px; }
  .cover-desc { font-size: 12pt; color: #4B5563; max-width: 500px; margin-bottom: 48px; line-height: 1.7; }
  .cover-meta { display: flex; gap: 40px; flex-wrap: wrap; padding-top: 32px; border-top: 1px solid #E5E7EB; }
  .meta-item label { display: block; font-size: 8pt; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .meta-item span { font-size: 10pt; font-weight: 600; color: #0a0a0a; }
  .content { padding: 60px 60px; max-width: 800px; margin: 0 auto; }
  h2 { font-size: 16pt; font-weight: 800; color: ${accentColor}; margin-top: 48px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid ${accentColor}25; }
  h3 { font-size: 12pt; font-weight: 700; color: #374151; margin-top: 20px; margin-bottom: 8px; }
  p { font-size: 11pt; line-height: 1.8; color: #374151; margin-bottom: 14px; }
  ul, ol { padding-left: 24px; margin-bottom: 14px; }
  li { font-size: 11pt; line-height: 1.7; color: #374151; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
  th { background: ${accentColor}; color: white; padding: 10px 14px; text-align: left; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 10px 14px; border-bottom: 1px solid #E5E7EB; }
  tr:nth-child(even) td { background: #F8FAFC; }
  strong { font-weight: 700; color: #0a0a0a; }
  .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 9pt; color: #9CA3AF; }
  @media print {
    .cover { min-height: 100vh; }
    h2 { page-break-before: auto; }
    body { font-size: 10pt; }
  }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-tag">PM Buddy — ${isPM ? 'Internal Document' : 'External Stakeholder Document'}</div>
    <div class="cover-title">${data.name}</div>
    <div class="cover-doctype">${isPM ? 'Project Management Plan' : 'Benefits Management Document'}</div>
    <div class="cover-desc">${data.description || ''}</div>
    <div class="cover-meta">
      <div class="meta-item"><label>Industry</label><span>${data.industry || 'Not set'}</span></div>
      <div class="meta-item"><label>Approach</label><span>${data.methodology || 'Not set'}</span></div>
      <div class="meta-item"><label>Status</label><span>${data.status === 'active' ? 'Active' : 'Completed'}</span></div>
      <div class="meta-item"><label>Generated</label><span>${today}</span></div>
    </div>
  </div>
  <div class="content">
    ${content}
    <div class="footer">
      <span>Generated by PM Buddy</span>
      <span>${data.name} — ${today}</span>
    </div>
  </div>
</body>
</html>`;
}

const s = {
  sectionHeadWrap: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionHeadTitle: { fontSize: 18, fontWeight: 800, color: BL, marginBottom: 4, letterSpacing: '-0.3px' },
  sectionHeadSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },
  docCard: { background: GREY, borderRadius: 16, padding: '24px', border: '1px solid #E5E7EB', marginBottom: 20 },
  docCardTop: { marginBottom: 16 },
  docCardLeft: {},
  docAudience: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100, display: 'inline-block', marginBottom: 10 },
  docTitle: { fontSize: 17, fontWeight: 800, color: BL, marginBottom: 8, letterSpacing: '-0.3px' },
  docDesc: { fontSize: 14, color: '#6B7280', lineHeight: 1.75, marginBottom: 14 },
  sectionTags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  sectionTag: { fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  docBtns: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  primaryBtn: { padding: '11px 24px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { padding: '11px 20px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  textBtn: { background: 'none', border: 'none', color: BLUE, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', marginBottom: 8, display: 'block' },
  generatingNote: { fontSize: 13, color: '#6B7280', marginTop: 12, fontStyle: 'italic' },
  benefitsForm: { background: WH, borderRadius: 12, padding: '20px', border: '1px solid #E5E7EB', marginBottom: 16 },
  benefitsFormNote: { fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 20 },
  benefitsField: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 },
  fieldHint: { fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 6 },
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 0, boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  previewCard: { background: WH, borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', marginTop: 20 },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB', background: GREY, flexWrap: 'wrap', gap: 10 },
  previewLabel: { fontSize: 13, fontWeight: 700, color: BL },
  previewBtns: { display: 'flex', gap: 8 },
  previewContent: { padding: '32px', maxHeight: 600, overflowY: 'auto', fontSize: 14, lineHeight: 1.75, color: '#374151' },
  noteCard: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginTop: 16 },
  noteText: { fontSize: 13, color: '#92400E', lineHeight: 1.7 },
};
