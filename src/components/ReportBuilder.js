import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import AiLoading from './AiLoading';
import DocView from './DocView';
import Icon from './Icon';
import { sanitizeHtml } from '../lib/docExport';
import { REPORT_TYPES, FUNDER_STYLES, buildFacts, buildPrompt, reportTitle } from '../lib/reportFacts';

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

function defaultName(user) {
  const m = user?.user_metadata || {};
  return m.first_name || m.full_name || m.name || user?.email || '';
}

// A short form, then a generated report that can be edited, saved and downloaded.
export default function ReportBuilder({ data, project, onClose, onSaved, initialType, funding, onSaveFunding }) {
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [form, setForm] = useState({
    type: initialType || 'team',
    start: toInputDate(monthAgo),
    end: toInputDate(today),
    preparedFor: (funding && funding.funder) || '',
    preparedBy: defaultName(project._currentUser),
    keyFigures: '',
    notes: '',
    funderStyle: 'standard',
    fFunder: (funding && funding.funder) || '',
    fPurpose: (funding && funding.purpose) || '',
    fAmount: (funding && funding.amount) || '',
    fObjectives: (funding && funding.objectives) || '',
    fTemplate: (funding && funding.template) || '',
  });
  const [phase, setPhase] = useState('form');
  const [html, setHtml] = useState('');
  const [title, setTitle] = useState('');
  const [docId, setDocId] = useState(null);
  const [error, setError] = useState('');

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const typeInfo = REPORT_TYPES.find(t => t.id === form.type);

  const generate = async () => {
    if (!form.start || !form.end) { setError('Choose the reporting period.'); return; }
    if (form.end < form.start) { setError('The end date must be after the start date.'); return; }
    setError('');
    setPhase('working');
    try {
      const facts = buildFacts(data, form.start, form.end);
      const fundingNow = { funder: form.fFunder, purpose: form.fPurpose, amount: form.fAmount, objectives: form.fObjectives, template: form.fTemplate };
      if (form.type === 'funder' && onSaveFunding) onSaveFunding(fundingNow);
      const prompt = buildPrompt(form.type, facts, { ...form, funding: fundingNow });
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ prompt, mode: 'document' }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not generate the report. Please try again.');
      const clean = sanitizeHtml((result.result || '').replace(/```html|```/g, '').trim());
      if (clean.length < 100) throw new Error('The report came back empty. Please try again.');

      const docTitle = reportTitle(form.type, data.name, form.start, form.end);
      setHtml(clean);
      setTitle(docTitle);
      setDocId(null);
      setPhase('result');

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const { data: row } = await supabase.from('documents')
          .insert({ user_id: user.id, project_id: project.id, project_name: data.name, type: 'report', title: docTitle, content: clean })
          .select('id')
          .single();
        if (row?.id) setDocId(row.id);
        if (onSaved) onSaved();
      }
    } catch (err) {
      setError(err.message || 'Could not generate the report. Please try again.');
      setPhase('form');
    }
  };

  const saveEdits = async (next) => {
    setHtml(next);
    if (docId) {
      const { error: updateError } = await supabase.from('documents').update({ content: next, updated_at: new Date().toISOString() }).eq('id', docId);
      if (updateError) throw updateError;
      if (onSaved) onSaved();
    }
  };

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="Create a report">
      <div style={s.panel}>
        <div style={s.head}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{phase === 'result' ? title : 'Create a report'}</h2>
          <button type="button" style={s.close} onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        <div style={s.body}>
          {phase === 'form' && (
            <div>
              <p style={s.label}>What kind of report?</p>
              <div style={s.types}>
                {REPORT_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => set('type', t.id)}
                    style={{ ...s.typeBtn, ...(form.type === t.id ? s.typeOn : null) }} aria-pressed={form.type === t.id}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: form.type === t.id ? 'var(--accent-text)' : 'var(--text)' }}>{t.label}</span>
                    <span style={{ fontSize: 14, color: 'var(--muted)' }}>{t.desc}</span>
                  </button>
                ))}
              </div>

              {form.type === 'funder' && (
                <div style={s.fund}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>About the funding</p>
                  <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                    A good funder report shows that the work is moving towards what the money was given for. Fill in what you know. PM Buddy saves it with the project, so next time you only update it.
                  </p>
                  <div style={s.row}>
                    <label style={s.field}><span style={s.label}>Funder or donor</span>
                      <input type="text" style={s.input} placeholder="e.g. Ford Foundation" value={form.fFunder} onChange={e => set('fFunder', e.target.value)} /></label>
                    <label style={s.field}><span style={s.label}>Amount and period</span>
                      <input type="text" style={s.input} placeholder="e.g. $20,000 for 12 months" value={form.fAmount} onChange={e => set('fAmount', e.target.value)} /></label>
                  </div>
                  <label style={{ ...s.field, marginBottom: 14 }}><span style={s.label}>What the funding is for</span>
                    <textarea style={{ ...s.input, minHeight: 72, resize: 'vertical' }} rows={3}
                      placeholder="e.g. To train 100 young people in digital skills and help 40 of them find work within 12 months."
                      value={form.fPurpose} onChange={e => set('fPurpose', e.target.value)} /></label>
                  <label style={{ ...s.field, marginBottom: 14 }}><span style={s.label}>Objectives and targets (one per line)</span>
                    <textarea style={{ ...s.input, minHeight: 90, resize: 'vertical' }} rows={4}
                      placeholder={'Train 100 young people, target 100 people\nSet up a learning platform, target 1 platform live\nPlace trainees in jobs, target 40 placements'}
                      value={form.fObjectives} onChange={e => set('fObjectives', e.target.value)} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Not sure? Copy them from your grant agreement or proposal. If you have none, PM Buddy uses your project goal and milestones.</span>
                  </label>
                  <p style={s.label}>Which style of report?</p>
                  <div style={{ ...s.types, marginBottom: 12 }}>
                    {FUNDER_STYLES.map(st => (
                      <button key={st.id} type="button" onClick={() => set('funderStyle', st.id)}
                        style={{ ...s.typeBtn, ...(form.funderStyle === st.id ? s.typeOn : null) }} aria-pressed={form.funderStyle === st.id}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: form.funderStyle === st.id ? 'var(--accent-text)' : 'var(--text)' }}>{st.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{st.desc}</span>
                      </button>
                    ))}
                  </div>
                  {form.funderStyle === 'own' && (
                    <label style={{ ...s.field, marginBottom: 14 }}><span style={s.label}>Paste your funder's template or headings</span>
                      <textarea style={{ ...s.input, minHeight: 110, resize: 'vertical' }} rows={5}
                        placeholder={'1. Summary of progress\n2. Activities against the work plan\n3. Results and indicators\n4. Financial summary\n5. Challenges\n6. Next steps'}
                        value={form.fTemplate} onChange={e => set('fTemplate', e.target.value)} /></label>
                  )}
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                    PM Buddy writes the report from your project's goal, milestones and tasks. Numbers only come from what you type here, and anything missing becomes a [placeholder]. Always check it against your funder's requirements before sending.
                  </p>
                </div>
              )}

              <div style={s.row}>
                <label style={s.field}><span style={s.label}>Period starts</span>
                  <input id="rb-start" type="date" style={s.input} value={form.start} onChange={e => set('start', e.target.value)} /></label>
                <label style={s.field}><span style={s.label}>Period ends</span>
                  <input id="rb-end" type="date" style={s.input} value={form.end} onChange={e => set('end', e.target.value)} /></label>
              </div>
              <div style={s.row}>
                <label style={s.field}><span style={s.label}>Prepared for (optional)</span>
                  <input id="rb-for" type="text" style={s.input} placeholder="e.g. funder name, investor list, line manager" value={form.preparedFor} onChange={e => set('preparedFor', e.target.value)} /></label>
                <label style={s.field}><span style={s.label}>Prepared by</span>
                  <input id="rb-by" type="text" style={s.input} value={form.preparedBy} onChange={e => set('preparedBy', e.target.value)} /></label>
              </div>
              <label style={{ ...s.field, marginBottom: 16 }}><span style={s.label}>Key figures (optional)</span>
                <textarea id="rb-figures" style={{ ...s.input, minHeight: 72, resize: 'vertical' }} rows={3}
                  placeholder="e.g. Budget spent: $4,200 of $10,000. People trained: 120."
                  value={form.keyFigures} onChange={e => set('keyFigures', e.target.value)} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Numbers only come from here. PM Buddy never makes them up. Anything missing becomes a [placeholder].</span>
              </label>
              <label style={{ ...s.field, marginBottom: 20 }}><span style={s.label}>Anything else to include (optional)</span>
                <textarea id="rb-notes" style={{ ...s.input, minHeight: 72, resize: 'vertical' }} rows={3}
                  placeholder="e.g. feedback from the community, a decision that was made, a request for the reader"
                  value={form.notes} onChange={e => set('notes', e.target.value)} /></label>

              {error && <div style={s.error}>{error}</div>}
              <button type="button" style={s.primary} onClick={generate}>
                <Icon name="spark" size={16} style={{ marginRight: 8 }} />Create {typeInfo ? typeInfo.label.toLowerCase() : 'report'}
              </button>
            </div>
          )}

          {phase === 'working' && <AiLoading kind="write" title="Writing your report" />}

          {phase === 'result' && (
            <div>
              <DocView html={html} title={title} onSave={saveEdits} />
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={s.secondary} onClick={() => { setPhase('form'); setError(''); }}>Create another</button>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{docId ? 'Saved to this project under Documents.' : 'Not saved. Sign in to keep reports.'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 10000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' },
  panel: { background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 820, boxShadow: 'var(--shadow-lg)', marginTop: 24, marginBottom: 24 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 24px', borderBottom: '1px solid var(--border)' },
  close: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex' },
  body: { padding: '22px 24px 26px' },
  label: { fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, display: 'block' },
  fund: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 },
  types: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 20 },
  typeBtn: { display: 'grid', gap: 4, textAlign: 'left', padding: '12px 14px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' },
  typeOn: { background: 'var(--accent-tint)', borderColor: 'var(--accent)' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 },
  field: { display: 'grid', gap: 4, minWidth: 0 },
  input: { width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, color: 'var(--text)', fontFamily: 'inherit' },
  error: { padding: '10px 14px', background: 'var(--bad-tint)', border: '1px solid var(--bad-border)', borderRadius: 10, color: 'var(--bad-text)', fontSize: 14, marginBottom: 14 },
  primary: { display: 'inline-flex', alignItems: 'center', padding: '12px 24px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  secondary: { padding: '9px 18px', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
