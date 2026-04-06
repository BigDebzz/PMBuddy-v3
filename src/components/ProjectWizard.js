import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const INDUSTRIES = [
  'Fintech', 'Health', 'Education', 'Agriculture', 'Logistics',
  'E-commerce', 'Real Estate', 'Media', 'Government', 'Other'
];

const STEPS = [
  { num: 1, label: 'Basics' },
  { num: 2, label: 'Team' },
  { num: 3, label: 'Timeline' },
  { num: 4, label: 'Risks' },
  { num: 5, label: 'Review' },
];

export default function ProjectWizard({ user, onComplete, onBack }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    name: '',
    description: '',
    goal: '',
    industry: '',
    teamType: 'solo',
    teamMembers: [{ name: '', role: '' }],
    startDate: '',
    endDate: '',
    topRisks: ['', '', ''],
  });

  const update = (key, val) => setData(p => ({ ...p, [key]: val }));

  const next = () => setStep(s => Math.min(s + 1, 5));
  const back = () => { if (step === 1) { onBack(); return; } setStep(s => s - 1); };

  const addMember = () => setData(p => ({ ...p, teamMembers: [...p.teamMembers, { name: '', role: '' }] }));
  const updateMember = (i, field, val) => {
    const members = [...data.teamMembers];
    members[i][field] = val;
    setData(p => ({ ...p, teamMembers: members }));
  };
  const removeMember = (i) => setData(p => ({ ...p, teamMembers: p.teamMembers.filter((_, idx) => idx !== i) }));

  const updateRisk = (i, val) => {
    const risks = [...data.topRisks];
    risks[i] = val;
    setData(p => ({ ...p, topRisks: risks }));
  };

  const canProceed = () => {
    if (step === 1) return data.name.trim() && data.description.trim() && data.goal.trim() && data.industry;
    if (step === 2) return data.teamType;
    if (step === 3) return data.startDate && data.endDate;
    return true;
  };

  const save = async () => {
    setSaving(true);
    const milestones = generateMilestones(data);
    const { data: project, error } = await supabase.from('pm_projects').insert({
      user_id: user.id,
      name: data.name,
      description: data.description,
      industry: data.industry,
      team_type: data.teamType,
      methodology: deriveMethodology(data),
      status: 'active',
      scope: { goal: data.goal, deliverables: [] },
      timeline: { start: data.startDate, end: data.endDate },
      resources: { tools: [], budget: '' },
      risks: data.topRisks.filter(r => r.trim()).map(r => ({ title: r, level: 'medium', status: 'open' })),
      team: data.teamMembers.filter(m => m.name.trim()),
      milestones,
      compliance: { industry: data.industry, flags: getComplianceFlags(data.industry) },
    }).select().single();
    setSaving(false);
    if (!error && project) onComplete(project);
  };

  const progress = ((step - 1) / 4) * 100;

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        <button style={s.backBtn} onClick={back}>← Back</button>

        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width: `${progress}%` }} />
        </div>

        <div style={s.steps}>
          {STEPS.map(st => (
            <div key={st.num} style={{ ...s.stepDot, background: step >= st.num ? BLUE : '#E5E7EB' }}>
              <span style={{ ...s.stepDotLabel, color: step >= st.num ? WH : '#9CA3AF' }}>{st.num}</span>
            </div>
          ))}
        </div>

        <div style={s.card}>

          {step === 1 && (
            <div>
              <p style={s.stepTag}>Step 1 of 5</p>
              <h2 style={s.stepTitle}>Tell Us About Your Project</h2>
              <p style={s.stepSub}>Start with the basics. The clearer you are here the better PM Buddy can support you.</p>

              <label style={s.label}>Project Name</label>
              <input style={s.input} placeholder="e.g. Fintech Savings App" value={data.name} onChange={e => update('name', e.target.value)} />

              <label style={s.label}>What Are You Building?</label>
              <textarea style={s.textarea} placeholder="Describe what this project is about in 2 to 3 sentences." value={data.description} onChange={e => update('description', e.target.value)} rows={3} />

              <label style={s.label}>What Does Success Look Like?</label>
              <textarea style={s.textarea} placeholder="What outcome are you trying to achieve? Be specific." value={data.goal} onChange={e => update('goal', e.target.value)} rows={3} />

              <label style={s.label}>Industry</label>
              <div style={s.industryGrid}>
                {INDUSTRIES.map(ind => (
                  <button key={ind} style={{ ...s.industryBtn, background: data.industry === ind ? BLUE : WH, color: data.industry === ind ? WH : BL, borderColor: data.industry === ind ? BLUE : '#E5E7EB' }} onClick={() => update('industry', ind)}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={s.stepTag}>Step 2 of 5</p>
              <h2 style={s.stepTitle}>Who Is Working on This?</h2>
              <p style={s.stepSub}>Even if it is just you, defining roles prevents confusion later.</p>

              <label style={s.label}>Team Setup</label>
              <div style={s.teamTypeGrid}>
                {[
                  { val: 'solo', label: 'Just Me', desc: 'I am building this alone' },
                  { val: 'small', label: 'Small Team', desc: '2 to 5 people' },
                  { val: 'large', label: 'Larger Team', desc: '6 or more people' },
                ].map(t => (
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
                      <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Name" value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                      <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Role e.g. Developer" value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} />
                      {i > 0 && <button style={s.removeBtn} onClick={() => removeMember(i)}>✕</button>}
                    </div>
                  ))}
                  <button style={s.addBtn} onClick={addMember}>+ Add Member</button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={s.stepTag}>Step 3 of 5</p>
              <h2 style={s.stepTitle}>When Does This Need to Happen?</h2>
              <p style={s.stepSub}>Set realistic dates. PM Buddy will check if your timeline makes sense and flag if it looks too tight.</p>

              <label style={s.label}>Start Date</label>
              <input style={s.input} type="date" value={data.startDate} onChange={e => update('startDate', e.target.value)} />

              <label style={s.label}>Target End Date</label>
              <input style={s.input} type="date" value={data.endDate} onChange={e => update('endDate', e.target.value)} />

              {data.startDate && data.endDate && (
                <div style={s.timelineCheck}>
                  <TimelineCheck start={data.startDate} end={data.endDate} />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <p style={s.stepTag}>Step 4 of 5</p>
              <h2 style={s.stepTitle}>What Could Go Wrong?</h2>
              <p style={s.stepSub}>Good project managers think about risks before they happen. Name your top three concerns right now.</p>

              {data.topRisks.map((r, i) => (
                <div key={i}>
                  <label style={s.label}>Risk {i + 1}</label>
                  <input style={s.input} placeholder={getRiskPlaceholder(i, data.industry)} value={r} onChange={e => updateRisk(i, e.target.value)} />
                </div>
              ))}

              <div style={s.riskHint}>
                <p style={s.riskHintText}>Not sure? Common risks for {data.industry || 'your industry'} include: {getCommonRisks(data.industry)}</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p style={s.stepTag}>Step 5 of 5</p>
              <h2 style={s.stepTitle}>Review Your Project</h2>
              <p style={s.stepSub}>Here is a summary of what PM Buddy will set up for you. Everything can be updated later.</p>

              <div style={s.reviewGrid}>
                <ReviewItem label="Project Name" value={data.name} />
                <ReviewItem label="Industry" value={data.industry} />
                <ReviewItem label="Goal" value={data.goal} />
                <ReviewItem label="Team" value={data.teamType === 'solo' ? 'Solo project' : `${data.teamMembers.filter(m => m.name).length} team members`} />
                <ReviewItem label="Timeline" value={data.startDate && data.endDate ? `${formatDate(data.startDate)} to ${formatDate(data.endDate)}` : 'Not set'} />
                <ReviewItem label="Risks Identified" value={`${data.topRisks.filter(r => r.trim()).length} risks`} />
                <ReviewItem label="Approach" value={deriveMethodology(data)} />
              </div>

              <div style={s.methodologyCard}>
                <p style={s.methodologyLabel}>Why This Approach</p>
                <p style={s.methodologyText}>{getMethodologyReason(data)}</p>
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
            {step < 5 ? (
              <button style={{ ...s.nextBtn, opacity: canProceed() ? 1 : 0.5 }} onClick={next} disabled={!canProceed()}>
                Continue
              </button>
            ) : (
              <button style={s.nextBtn} onClick={save} disabled={saving}>
                {saving ? 'Setting Up Your Project...' : 'Launch My Project'}
              </button>
            )}
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
      <p style={s.reviewValue}>{value}</p>
    </div>
  );
}

function TimelineCheck({ start, end }) {
  const startD = new Date(start);
  const endD = new Date(end);
  const days = Math.ceil((endD - startD) / (1000 * 60 * 60 * 24));
  if (days < 0) return <div style={s.timelineWarn}>Your end date is before your start date. Please fix this.</div>;
  if (days < 14) return <div style={s.timelineWarn}>This is a very tight timeline of {days} days. Make sure your scope matches the time available.</div>;
  if (days < 30) return <div style={s.timelineOk}>This is an ambitious timeline of {days} days. Stay focused on your core deliverables.</div>;
  return <div style={s.timelineOk}>You have {days} days. This is a workable timeline if your scope is well defined.</div>;
}

function deriveMethodology(data) {
  if (data.teamType === 'solo') return 'Agile';
  if (data.industry === 'Government' || data.industry === 'Health') return 'Predictive';
  return 'Hybrid';
}

function getMethodologyReason(data) {
  const m = deriveMethodology(data);
  if (m === 'Agile') return 'Because you are working solo, a flexible approach works best. You can adjust your plan as you learn without waiting for team approvals.';
  if (m === 'Predictive') return 'Your industry typically requires structured planning with clear approvals at each stage. A predictive approach keeps you compliant and in control.';
  return 'Your project benefits from a mix of structure and flexibility. Plan the key phases clearly but leave room to adapt as you build and learn.';
}

function generateMilestones(data) {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const total = end - start;
  const q1 = new Date(start.getTime() + total * 0.25).toISOString().split('T')[0];
  const q2 = new Date(start.getTime() + total * 0.5).toISOString().split('T')[0];
  const q3 = new Date(start.getTime() + total * 0.75).toISOString().split('T')[0];
  return [
    { title: 'Project Kickoff', date: data.startDate, status: 'pending' },
    { title: 'First Deliverable Ready', date: q1, status: 'pending' },
    { title: 'Midpoint Review', date: q2, status: 'pending' },
    { title: 'Final Testing', date: q3, status: 'pending' },
    { title: 'Project Complete', date: data.endDate, status: 'pending' },
  ];
}

function getComplianceFlags(industry) {
  const flags = {
    Fintech: ['CBN regulatory compliance', 'Data protection (NDPR)', 'KYC requirements'],
    Health: ['Patient data privacy', 'HIPAA equivalent standards', 'Medical device regulations'],
    Education: ['Student data protection', 'Content licensing'],
    Government: ['Procurement regulations', 'Public data policies'],
  };
  return flags[industry] || [];
}

function getComplianceText(industry) {
  const texts = {
    Fintech: 'As a fintech project you need to be aware of CBN regulations, NDPR data protection requirements and KYC obligations. These should be planned for early, not added later.',
    Health: 'Health projects must handle patient data with strict privacy controls. Plan for data protection compliance before you build any data collection features.',
    Education: 'Ensure any student data you collect is protected and that educational content you use is properly licensed.',
    Government: 'Government projects typically require formal procurement processes and adherence to public data policies.',
  };
  return texts[industry] || `Make sure to research any regulatory requirements specific to the ${industry} industry in your target market before you launch.`;
}

function getRiskPlaceholder(i, industry) {
  const defaults = {
    Fintech: ['Regulatory approval taking longer than expected', 'Payment integration delays', 'Team bandwidth running out'],
    Health: ['Data privacy compliance gaps', 'User adoption resistance', 'Regulatory approvals'],
    default: ['Timeline slipping due to unclear scope', 'Key team member becoming unavailable', 'Budget running out before completion'],
  };
  const list = defaults[industry] || defaults.default;
  return list[i] || 'Describe a risk...';
}

function getCommonRisks(industry) {
  const risks = {
    Fintech: 'regulatory delays, integration issues, security vulnerabilities',
    Health: 'compliance gaps, adoption resistance, data privacy issues',
    Education: 'content licensing, user engagement, platform reliability',
    default: 'timeline slippage, scope creep, resource constraints',
  };
  return risks[industry] || risks.default;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '40px 24px 80px' },
  wrap: { maxWidth: 640, margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24, padding: 0 },
  progressTrack: { height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.4s ease' },
  steps: { display: 'flex', gap: 8, marginBottom: 28 },
  stepDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s ease' },
  stepDotLabel: { fontSize: 12, fontWeight: 800 },
  card: { background: WH, borderRadius: 20, padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' },
  stepTag: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 },
  stepTitle: { fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 900, color: BL, marginBottom: 8, letterSpacing: '-0.5px' },
  stepSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 28 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: '0.02em' },
  input: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 20, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 20, boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  industryGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  industryBtn: { padding: '9px 16px', border: '1.5px solid', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease' },
  teamTypeGrid: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  teamTypeBtn: { flex: 1, minWidth: 140, padding: '16px', border: '1.5px solid', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s ease' },
  teamTypeName: { fontSize: 15, fontWeight: 800, marginBottom: 4 },
  teamTypeDesc: { fontSize: 12, color: '#6B7280' },
  memberRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 },
  removeBtn: { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit', flexShrink: 0 },
  addBtn: { background: 'none', border: 'none', color: BLUE, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginTop: 4 },
  timelineCheck: { marginTop: 4 },
  timelineWarn: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#DC2626', lineHeight: 1.6 },
  timelineOk: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: BLUE, lineHeight: 1.6 },
  riskHint: { background: GREY, borderRadius: 10, padding: '12px 16px', marginTop: 4 },
  riskHintText: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },
  reviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  reviewItem: { background: GREY, borderRadius: 10, padding: '14px 16px' },
  reviewLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  reviewValue: { fontSize: 14, fontWeight: 700, color: BL },
  methodologyCard: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '16px', marginBottom: 12 },
  methodologyLabel: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
  methodologyText: { fontSize: 14, color: '#1E40AF', lineHeight: 1.7 },
  complianceCard: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px' },
  complianceLabel: { fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
  complianceText: { fontSize: 14, color: '#92400E', lineHeight: 1.7 },
  footer: { marginTop: 32, paddingTop: 24, borderTop: '1px solid #F3F4F6' },
  nextBtn: { width: '100%', padding: '14px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s ease' },
};
