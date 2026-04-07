import React, { useState } from 'react';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

export default function DocumentGenerator({ data, methodology }) {
  const [generating, setGenerating] = useState(null);

  const generatePDF = async (type) => {
    setGenerating(type);
    try {
      const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      buildPDF(doc, data, methodology, type);
      doc.save(`${data.name.replace(/\s+/g, '_')}_${type === 'full' ? 'Project_Plan' : 'Project_Summary'}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF generation failed. Please try again.');
    }
    setGenerating(null);
  };

  const generateDOCX = async (type) => {
    setGenerating(type + '_docx');
    try {
      const sections = buildDocxContent(data, methodology, type);
      const blob = new Blob([sections], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.name.replace(/\s+/g, '_')}_${type === 'full' ? 'Project_Plan' : 'Project_Summary'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setGenerating(null);
  };

  const downloadHTML = (type) => {
    setGenerating(type + '_html');
    const html = buildHTMLDocument(data, methodology, type);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '_')}_${type === 'full' ? 'Project_Plan' : 'Project_Summary'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerating(null);
  };

  const docs = [
    {
      id: 'full',
      title: 'Full Project Plan',
      desc: 'A complete document covering every section of your project. Goal, team, timeline, resources, risks, compliance and more. All in one professional document.',
      sections: getSectionList(methodology, 'full'),
    },
    {
      id: 'summary',
      title: 'Project Summary',
      desc: 'A shorter single page overview of the key project details. Good for sharing with stakeholders who need the big picture quickly.',
      sections: getSectionList(methodology, 'summary'),
    },
  ];

  return (
    <div>
      <div style={s.sectionHeadWrap}>
        <h3 style={s.sectionHeadTitle}>Documents</h3>
        <p style={s.sectionHeadSub}>Download your project documents in PDF or Word format. Both are generated from the information you have entered into PM Buddy.</p>
      </div>

      {docs.map(doc => (
        <div key={doc.id} style={s.docCard}>
          <div style={s.docTop}>
            <div style={s.docInfo}>
              <p style={s.docTitle}>{doc.title}</p>
              <p style={s.docDesc}>{doc.desc}</p>
              <div style={s.sectionTags}>
                {doc.sections.map((sec, i) => (
                  <span key={i} style={s.sectionTag}>{sec}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={s.docBtns}>
            <button
              style={{ ...s.downloadBtn, opacity: generating === doc.id + '_html' ? 0.7 : 1 }}
              onClick={() => downloadHTML(doc.id)}
              disabled={!!generating}
            >
              {generating === doc.id + '_html' ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              style={{ ...s.downloadBtnOutline, opacity: generating === doc.id + '_html_word' ? 0.7 : 1 }}
              onClick={() => downloadHTML(doc.id + '_word')}
              disabled={!!generating}
            >
              Download Word
            </button>
          </div>
        </div>
      ))}

      <div style={s.noteCard}>
        <p style={s.noteText}>Documents are generated from your project data. The more information you add to each section of your workspace the better your documents will be.</p>
      </div>
    </div>
  );
}

function getSectionList(methodology, type) {
  if (type === 'summary') return ['Project Overview', 'Goal', 'Team', 'Timeline', 'Top Risks'];
  if (methodology === 'Agile') return ['Project Overview', 'Goal and Definition of Done', 'Team', 'Timeline and Milestones', 'Backlog', 'Work Cycles', 'Risks', 'Compliance'];
  if (methodology === 'Predictive') return ['Project Charter', 'Stakeholders', 'Scope', 'Planning', 'Timeline and Milestones', 'Risks', 'Compliance'];
  return ['Project Overview', 'Stakeholders', 'Scope', 'Team', 'Timeline and Milestones', 'Backlog', 'Risks', 'Compliance'];
}

function buildHTMLDocument(data, methodology, type) {
  const isFull = type === 'full' || type === 'full_word';
  const isWord = type.includes('_word') || type.includes('summary_word');

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
  const today = formatDate(new Date().toISOString());
  const risks = data.risks || [];
  const team = data.team || [];
  const milestones = data.milestones || [];
  const planning = data.planning || {};
  const scope = data.scope || {};
  const compliance = data.compliance || {};

  const accentColor = '#0284C7';

  const fullContent = isFull ? `
    <div class="section">
      <h2>Project Goal</h2>
      <p>${scope.goal || 'Not defined'}</p>
      ${planning.definitionOfDone ? `<h3>Definition of Done</h3><p>${planning.definitionOfDone}</p>` : ''}
      ${planning.qualityStandards ? `<h3>Quality Standards</h3><p>${planning.qualityStandards}</p>` : ''}
    </div>

    <div class="section">
      <h2>Team</h2>
      <p><strong>Team Type:</strong> ${data.team_type === 'solo' ? 'Solo project' : `${team.length} member team`}</p>
      ${team.length > 0 ? `
        <table>
          <thead><tr><th>Name</th><th>Role</th></tr></thead>
          <tbody>${team.map(m => `<tr><td>${m.name}</td><td>${m.role || 'Not specified'}</td></tr>`).join('')}</tbody>
        </table>
      ` : ''}
    </div>

    <div class="section">
      <h2>Timeline and Milestones</h2>
      <p><strong>Start Date:</strong> ${formatDate(data.timeline?.start)}</p>
      <p><strong>End Date:</strong> ${formatDate(data.timeline?.end)}</p>
      <p><strong>Approach:</strong> ${data.methodology}</p>
      ${milestones.length > 0 ? `
        <table>
          <thead><tr><th>Milestone</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>${milestones.map(m => `<tr><td>${m.title}</td><td>${formatDate(m.date)}</td><td>${m.status === 'done' ? 'Complete' : 'Pending'}</td></tr>`).join('')}</tbody>
        </table>
      ` : ''}
    </div>

    ${scope.deliverables?.length > 0 ? `
    <div class="section">
      <h2>Scope and Deliverables</h2>
      <ul>${scope.deliverables.map(d => `<li>${typeof d === 'string' ? d : d.title}</li>`).join('')}</ul>
      ${scope.assumptions?.length > 0 ? `<h3>Assumptions</h3><ul>${scope.assumptions.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
      ${scope.constraints?.length > 0 ? `<h3>Constraints</h3><ul>${scope.constraints.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
      ${scope.exclusions?.length > 0 ? `<h3>What Is Not Included</h3><ul>${scope.exclusions.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
    </div>
    ` : ''}

    ${planning.communications ? `
    <div class="section">
      <h2>Communication Plan</h2>
      <p>${planning.communications}</p>
      ${planning.updateFrequency ? `<p><strong>Update Frequency:</strong> ${planning.updateFrequency}</p>` : ''}
      ${planning.stakeholderUpdates ? `<p><strong>Channel:</strong> ${planning.stakeholderUpdates}</p>` : ''}
    </div>
    ` : ''}

    <div class="section">
      <h2>Risk Register</h2>
      ${risks.length > 0 ? `
        <table>
          <thead><tr><th>Risk</th><th>Level</th><th>Status</th></tr></thead>
          <tbody>${risks.map(r => `<tr><td>${r.title}</td><td style="text-transform:capitalize">${r.level}</td><td style="text-transform:capitalize">${r.status}</td></tr>`).join('')}</tbody>
        </table>
      ` : '<p>No risks recorded.</p>'}
    </div>

    ${(compliance.flags?.length > 0 || compliance.internal?.length > 0 || compliance.external?.length > 0) ? `
    <div class="section">
      <h2>Compliance</h2>
      ${compliance.flags?.length > 0 ? `<h3>Industry Requirements</h3><ul>${compliance.flags.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
      ${compliance.internal?.length > 0 ? `<h3>Internal Policies</h3><ul>${compliance.internal.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
      ${compliance.external?.length > 0 ? `<h3>External Regulations</h3><ul>${compliance.external.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
    </div>
    ` : ''}
  ` : `
    <div class="section">
      <h2>Project Goal</h2>
      <p>${scope.goal || 'Not defined'}</p>
    </div>
    <div class="section">
      <h2>Team</h2>
      <p>${data.team_type === 'solo' ? 'Solo project' : `${team.length} team members`}</p>
    </div>
    <div class="section">
      <h2>Timeline</h2>
      <p><strong>Start:</strong> ${formatDate(data.timeline?.start)}</p>
      <p><strong>End:</strong> ${formatDate(data.timeline?.end)}</p>
    </div>
    <div class="section">
      <h2>Top Risks</h2>
      ${risks.length > 0 ? `<ul>${risks.slice(0, 3).map(r => `<li>${r.title} (${r.level})</li>`).join('')}</ul>` : '<p>None recorded.</p>'}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.name} — ${isFull ? 'Project Plan' : 'Project Summary'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #1a1a1a; background: white; }
  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; min-height: 100vh; padding: 80px 60px; border-left: 8px solid ${accentColor}; }
  .cover-label { font-size: 10pt; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 24px; }
  .cover-title { font-size: 36pt; font-weight: 900; color: #0a0a0a; line-height: 1.1; margin-bottom: 16px; }
  .cover-sub { font-size: 14pt; color: #4B5563; margin-bottom: 48px; line-height: 1.6; }
  .cover-meta { display: flex; gap: 40px; flex-wrap: wrap; }
  .cover-meta-item label { display: block; font-size: 9pt; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .cover-meta-item span { font-size: 11pt; font-weight: 600; color: #0a0a0a; }
  .content { padding: 40px 60px; }
  .section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid #E5E7EB; }
  .section:last-child { border-bottom: none; }
  h2 { font-size: 16pt; font-weight: 800; color: ${accentColor}; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid ${accentColor}20; }
  h3 { font-size: 12pt; font-weight: 700; color: #374151; margin-top: 16px; margin-bottom: 8px; }
  p { font-size: 11pt; line-height: 1.7; color: #374151; margin-bottom: 8px; }
  ul { padding-left: 20px; margin-bottom: 8px; }
  li { font-size: 11pt; line-height: 1.7; color: #374151; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
  th { background: ${accentColor}; color: white; padding: 10px 12px; text-align: left; font-weight: 700; }
  td { padding: 9px 12px; border-bottom: 1px solid #E5E7EB; }
  tr:nth-child(even) td { background: #F8FAFC; }
  strong { font-weight: 700; color: #0a0a0a; }
  @media print { .cover { min-height: 100vh; } }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-label">PM Buddy — ${isFull ? 'Full Project Plan' : 'Project Summary'}</div>
    <div class="cover-title">${data.name}</div>
    <div class="cover-sub">${data.description || ''}</div>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>Industry</label><span>${data.industry || 'Not set'}</span></div>
      <div class="cover-meta-item"><label>Approach</label><span>${data.methodology || 'Not set'}</span></div>
      <div class="cover-meta-item"><label>Status</label><span>${data.status === 'active' ? 'Active' : 'Completed'}</span></div>
      <div class="cover-meta-item"><label>Generated</label><span>${today}</span></div>
    </div>
  </div>
  <div class="content">
    ${fullContent}
  </div>
</body>
</html>`;
}

function buildDocxContent(data, methodology, type) {
  return buildHTMLDocument(data, methodology, type);
}

const s = {
  sectionHeadWrap: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionHeadTitle: { fontSize: 18, fontWeight: 800, color: BL, marginBottom: 4, letterSpacing: '-0.3px' },
  sectionHeadSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },
  docCard: { background: GREY, borderRadius: 16, padding: '24px', border: '1px solid #E5E7EB', marginBottom: 16 },
  docTop: { marginBottom: 20 },
  docInfo: {},
  docTitle: { fontSize: 16, fontWeight: 800, color: BL, marginBottom: 8, letterSpacing: '-0.3px' },
  docDesc: { fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 14 },
  sectionTags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  sectionTag: { fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  docBtns: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  downloadBtn: { padding: '10px 22px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  downloadBtnOutline: { padding: '10px 22px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  noteCard: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginTop: 8 },
  noteText: { fontSize: 13, color: '#92400E', lineHeight: 1.7 },
};
