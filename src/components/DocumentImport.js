import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const EXTRACTION_PROMPT = `You are PM Buddy, a project management assistant. Read the attached document and extract the following project information. Return ONLY a valid JSON object with this exact structure:

{
  "project_name": "string — the name of the project, or generate a concise one if not stated",
  "goal": "string — the main objective or purpose of the project",
  "industry": "string — the sector or field (e.g., Education, Health, Agriculture, Tech, Finance)",
  "team_type": "string — describe the team (e.g., Small startup team, Government agency, NGO, Corporate department)",
  "team_size": "number — approximate number of people involved, or null if unknown",
  "timeline": {
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "duration_description": "string — e.g., '3 months', '6 weeks', 'Ongoing'"
  },
  "milestones": [
    { "title": "string", "description": "string", "due_date": "YYYY-MM-DD or null" }
  ],
  "risks": [
    { "description": "string", "impact": "High|Medium|Low", "mitigation": "string or null" }
  ],
  "stakeholders": [
    { "name": "string", "role": "string", "interest": "High|Medium|Low" }
  ],
  "budget_description": "string — any budget info mentioned, or null",
  "communication_approach": "string — how the team plans to communicate (meetings, tools, frequency)",
  "methodology": "Agile|Predictive|Hybrid — infer from the document, default to Hybrid if unclear",
  "key_deliverables": ["string array of main outputs or deliverables"],
  "assumptions": ["string array"],
  "constraints": ["string array"]
}

Rules:
- If a field is not found in the document, use null or an empty array, never omit the key.
- Infer reasonable values where the document implies them but does not state explicitly.
- If the document contains no project-related content (e.g., it's a spreadsheet of random numbers, a poem, a blank file), return {"error": "This document does not appear to contain project information. Please upload a planning document, proposal, or project brief."}
- Return ONLY the JSON. No markdown code blocks, no explanations before or after.`;

export default function DocumentImport({ user, onProjectCreated, onCancel }) {
  const [mode, setMode] = useState(null); // 'paste' | 'upload'
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [step, setStep] = useState('input'); // 'input' | 'review' | 'saving'
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setFileName(selected.name);
    setError('');
  }, []);

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const cleanPastedText = (text) => {
    return text
      .replace(/\*\*?/g, '')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const parseGeminiResponse = (text) => {
    // Strategy 1: direct JSON parse
    try {
      return JSON.parse(text.trim());
    } catch (_) {}

    // Strategy 2: extract from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (_) {}
    }

    // Strategy 3: find first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch (_) {}
    }

    throw new Error('Could not parse AI response as JSON');
  };

  const handleExtract = async () => {
    setLoading(true);
    setError('');

    try {
      // Get auth token for API calls
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      console.log('[PM Buddy] Auth token present:', !!authToken);

      let prompt = EXTRACTION_PROMPT;
      let body = { prompt };

      if (mode === 'paste') {
        if (!pastedText.trim()) {
          throw new Error('Please paste some text first');
        }
        const cleaned = cleanPastedText(pastedText);
        body.prompt = `${EXTRACTION_PROMPT}\n\nDocument content:\n\n${cleaned}`;
      } else if (mode === 'upload') {
        if (!file) {
          throw new Error('Please select a file first');
        }

        // Step 1: Upload file to Google File API via our serverless endpoint
        const base64 = await readFileAsBase64(file);
        console.log('[PM Buddy] Uploading file to /api/upload...');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileBase64: base64,
            mimeType: file.type || 'application/octet-stream',
            fileName: file.name,
          }),
        });

        console.log('[PM Buddy] Upload response status:', uploadRes.status);
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          console.error('[PM Buddy] Upload failed:', errData);
          throw new Error(errData.error || `Upload failed: ${uploadRes.status}`);
        }

        const uploadData = await uploadRes.json();
        console.log('[PM Buddy] Upload success, fileUri:', uploadData.fileUri, 'mimeType:', uploadData.mimeType);
        const { fileUri, mimeType } = uploadData;
        body = { prompt: EXTRACTION_PROMPT, fileUri, mimeType };
      }

      // Step 2: Call Gemini with text or file URI
      console.log('[PM Buddy] Calling /api/gemini with body:', JSON.stringify(body).substring(0, 200));
      const geminiRes = await fetch('/api/gemini', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      console.log('[PM Buddy] Gemini response status:', geminiRes.status);
      if (!geminiRes.ok) {
        const errData = await geminiRes.json().catch(() => ({}));
        console.error('[PM Buddy] Gemini failed:', errData);
        throw new Error(errData.error || `AI extraction failed: ${geminiRes.status}`);
      }

      const { result } = await geminiRes.json();
      console.log('[PM Buddy] Gemini result length:', result?.length || 0);
      const parsed = parseGeminiResponse(result);

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      setExtractedData(parsed);
      setStep('review');

    } catch (err) {
      console.error('[PM Buddy] Extraction error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async () => {
    setLoading(true);
    setError('');

    try {
      // Get auth token for API calls
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const projectPayload = {
        user_id: user.id,
        name: extractedData.project_name || 'Untitled Project',
        goal: extractedData.goal || '',
        industry: extractedData.industry || '',
        team_type: extractedData.team_type || '',
        team_size: extractedData.team_size || null,
        methodology: extractedData.methodology || 'Hybrid',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scope: {
          deliverables: extractedData.key_deliverables || [],
          assumptions: extractedData.assumptions || [],
          constraints: extractedData.constraints || [],
          exclusions: [],
        },
        timeline: {
          start_date: extractedData.timeline?.start_date || null,
          end_date: extractedData.timeline?.end_date || null,
          duration_description: extractedData.timeline?.duration_description || '',
        },
        milestones: (extractedData.milestones || []).map((m, i) => ({
          id: `m-${Date.now()}-${i}`,
          title: m.title || 'Untitled Milestone',
          description: m.description || '',
          due_date: m.due_date || null,
          status: 'pending',
          tasks: [],
        })),
        risks: (extractedData.risks || []).map((r, i) => ({
          id: `r-${Date.now()}-${i}`,
          description: r.description || '',
          impact: r.impact || 'Medium',
          mitigation: r.mitigation || '',
          status: 'open',
        })),
        stakeholders: (extractedData.stakeholders || []).map((s, i) => ({
          id: `s-${Date.now()}-${i}`,
          name: s.name || '',
          role: s.role || '',
          interest: s.interest || 'Medium',
        })),
        planning: {
          budget_description: extractedData.budget_description || '',
          communication_approach: extractedData.communication_approach || '',
          resources: [],
          quality_criteria: [],
        },
        team: [],
        backlog: [],
        sprints: [],
        retrospectives: [],
        compliance: { internal: [], external: [] },
        requirements: [],
        history: [{
          id: `h-${Date.now()}`,
          action: 'Project created via document import',
          timestamp: new Date().toISOString(),
          actor: 'PM Buddy',
        }],
        insights: '',
        ai_health_check: null,
      };

      const { data, error: dbError } = await supabase
        .from('pm_projects')
        .insert([projectPayload])
        .select()
        .single();

      if (dbError) throw dbError;

      // Generate project brief via AI
      try {
        const briefPrompt = `Write a concise project brief (2-3 paragraphs) for this project:\nName: ${projectPayload.name}\nGoal: ${projectPayload.goal}\nIndustry: ${projectPayload.industry}\nMethodology: ${projectPayload.methodology}`;
        const { data: briefSession } = await supabase.auth.getSession();
        const briefToken = briefSession?.session?.access_token;
        const briefHeaders = { 'Content-Type': 'application/json' };
        if (briefToken) briefHeaders['Authorization'] = `Bearer ${briefToken}`;
        const briefRes = await fetch('/api/gemini', {
          method: 'POST',
          headers: briefHeaders,
          body: JSON.stringify({ prompt: briefPrompt }),
        });
        if (briefRes.ok) {
          const { result: briefText } = await briefRes.json();
          await supabase
            .from('pm_projects')
            .update({ project_brief: briefText })
            .eq('id', data.id);
        }
      } catch (briefErr) {
        console.error('Brief generation failed (non-blocking):', briefErr);
      }

      onProjectCreated?.(data);

    } catch (err) {
      console.error('Save project error:', err);
      setError(err.message || 'Failed to save project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (path, value) => {
    setExtractedData(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let current = next;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  // ─── RENDER ─────────────────────────────────────────────

  if (step === 'review' && extractedData) {
    return (
      <div className="document-import" style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Review Extracted Information</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          PM Buddy read your document. Review and edit before saving.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          <Field label="Project Name" value={extractedData.project_name || ''} onChange={v => updateField('project_name', v)} />
          <Field label="Goal" value={extractedData.goal || ''} onChange={v => updateField('goal', v)} textarea />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Industry" value={extractedData.industry || ''} onChange={v => updateField('industry', v)} />
            <Field label="Methodology" value={extractedData.methodology || 'Hybrid'} onChange={v => updateField('methodology', v)} />
          </div>
          <Field label="Team Type" value={extractedData.team_type || ''} onChange={v => updateField('team_type', v)} />
          <Field label="Budget / Funding" value={extractedData.budget_description || ''} onChange={v => updateField('budget_description', v)} />
          <Field label="Communication Approach" value={extractedData.communication_approach || ''} onChange={v => updateField('communication_approach', v)} textarea />

          <ArrayEditor
            label="Milestones"
            items={extractedData.milestones || []}
            onChange={v => updateField('milestones', v)}
            fields={[
              { key: 'title', label: 'Title', width: '40%' },
              { key: 'due_date', label: 'Due Date', width: '25%', type: 'date' },
              { key: 'description', label: 'Description', width: '35%', textarea: true },
            ]}
          />

          <ArrayEditor
            label="Risks"
            items={extractedData.risks || []}
            onChange={v => updateField('risks', v)}
            fields={[
              { key: 'description', label: 'Description', width: '50%' },
              { key: 'impact', label: 'Impact', width: '20%', type: 'select', options: ['High', 'Medium', 'Low'] },
              { key: 'mitigation', label: 'Mitigation', width: '30%' },
            ]}
          />

          <ArrayEditor
            label="Stakeholders"
            items={extractedData.stakeholders || []}
            onChange={v => updateField('stakeholders', v)}
            fields={[
              { key: 'name', label: 'Name', width: '35%' },
              { key: 'role', label: 'Role', width: '40%' },
              { key: 'interest', label: 'Interest', width: '25%', type: 'select', options: ['High', 'Medium', 'Low'] },
            ]}
          />

          <ArrayEditor
            label="Key Deliverables"
            items={extractedData.key_deliverables || []}
            onChange={v => updateField('key_deliverables', v)}
            simple
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setStep('input'); setExtractedData(null); }}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
          <button
            onClick={handleSaveProject}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-import" style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Import Project from Document</h2>
      </div>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Already have a project plan, proposal, or brief? Upload it and PM Buddy will structure it for you.
      </p>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!mode && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <button
            onClick={() => setMode('paste')}
            style={{
              padding: 32,
              borderRadius: 12,
              border: '2px dashed #d1d5db',
              background: '#f9fafb',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600 }}>Paste Text</div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Copy and paste your document content</div>
          </button>
          <button
            onClick={() => setMode('upload')}
            style={{
              padding: 32,
              borderRadius: 12,
              border: '2px dashed #d1d5db',
              background: '#f9fafb',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontWeight: 600 }}>Upload File</div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>PDF, Word, text — any format</div>
          </button>
        </div>
      )}

      {mode === 'paste' && (
        <div>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Paste your project document here..."
            rows={12}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => { setMode(null); setPastedText(''); setError(''); }} style={btnSecondary}>Cancel</button>
            <button onClick={handleExtract} disabled={loading || !pastedText.trim()} style={btnPrimary(loading || !pastedText.trim())}>
              {loading ? 'Reading...' : 'Extract Project'}
            </button>
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <div>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? '#ecfdf5' : '#f9fafb',
              borderColor: file ? '#10b981' : '#d1d5db',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="*/*"
            />
            {file ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600, color: '#065f46' }}>{fileName}</div>
                <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Click to change file</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontWeight: 600 }}>Click to upload a file</div>
                <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>PDF, Word, TXT, or any document</div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => { setMode(null); setFile(null); setFileName(''); setError(''); }} style={btnSecondary}>Cancel</button>
            <button onClick={handleExtract} disabled={loading || !file} style={btnPrimary(loading || !file)}>
              {loading ? 'Reading...' : 'Extract Project'}
            </button>
          </div>
        </div>
      )}

      {onCancel && (
        <button onClick={onCancel} style={{ ...btnSecondary, marginTop: 16 }}>
          ← Back to Dashboard
        </button>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────

function Field({ label, value, onChange, textarea = false }) {
  const Input = textarea ? 'textarea' : 'input';
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={textarea ? 3 : undefined}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 14,
          fontFamily: 'inherit',
          resize: textarea ? 'vertical' : undefined,
        }}
      />
    </div>
  );
}

function ArrayEditor({ label, items, onChange, fields, simple = false }) {
  const addItem = () => {
    if (simple) {
      onChange([...items, '']);
    } else {
      const newItem = {};
      fields.forEach(f => { newItem[f.key] = f.type === 'select' ? f.options[1] : ''; });
      onChange([...items, newItem]);
    }
  };

  const updateItem = (index, key, value) => {
    const next = [...items];
    if (simple) {
      next[index] = value;
    } else {
      next[index] = { ...next[index], [key]: value };
    }
    onChange(next);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
        <button onClick={addItem} style={{ fontSize: 20, lineHeight: 1, padding: '2px 8px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>+</button>
      </div>
      {items.length === 0 && (
        <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>None extracted. Click + to add.</div>
      )}
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {simple ? (
            <input
              value={item}
              onChange={e => updateItem(i, null, e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              placeholder={`Add ${label.toLowerCase().slice(0, -1)}...`}
            />
          ) : (
            fields.map(f => (
              f.type === 'select' ? (
                <select
                  key={f.key}
                  value={item[f.key] || ''}
                  onChange={e => updateItem(i, f.key, e.target.value)}
                  style={{ width: f.width, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.textarea ? (
                <textarea
                  key={f.key}
                  value={item[f.key] || ''}
                  onChange={e => updateItem(i, f.key, e.target.value)}
                  placeholder={f.label}
                  rows={2}
                  style={{ width: f.width, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical' }}
                />
              ) : (
                <input
                  key={f.key}
                  type={f.type || 'text'}
                  value={item[f.key] || ''}
                  onChange={e => updateItem(i, f.key, e.target.value)}
                  placeholder={f.label}
                  style={{ width: f.width, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                />
              )
            ))
          )}
          <button onClick={() => removeItem(i)} style={{ color: '#ef4444', fontSize: 18, lineHeight: 1, padding: '2px 6px', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
        </div>
      ))}
    </div>
  );
}

const btnPrimary = (disabled) => ({
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  background: disabled ? '#93c5fd' : '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const btnSecondary = {
  padding: '10px 20px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
};
