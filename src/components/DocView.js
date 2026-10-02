import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { supabase } from '../lib/supabase';
import { sanitizeHtml, downloadWord, downloadPDF } from '../lib/docExport';
import { REFINE_CHIPS, buildRefinePrompt } from '../lib/docStyle';

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

// Shows a generated document. People can ask the AI to change it, edit it by hand and download it.
// onSave(html) stores the document. It runs when someone presses Save changes and after each AI change or undo.
export default function DocView({ html, title, onSave }) {
  const [text, setText] = useState(html);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [refining, setRefining] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [message, setMessage] = useState('');
  const editRef = useRef(null);

  const flash = (msg, ms = 2500) => {
    setMessage(msg);
    if (ms) setTimeout(() => setMessage(m => (m === msg ? '' : m)), ms);
  };

  // Downloads use what is on screen, so edits that are not saved yet are included.
  const current = () => (editing && editRef.current ? sanitizeHtml(editRef.current.innerHTML) : text);

  const persist = async (next) => {
    if (onSave) await onSave(next);
  };

  const save = async () => {
    if (!editRef.current) return;
    const next = sanitizeHtml(editRef.current.innerHTML);
    setSaving(true);
    setMessage('');
    try {
      if (next !== text) setHistory(h => [...h, text]);
      setText(next);
      await persist(next);
      setEditing(false);
      flash('Changes saved.');
    } catch (err) {
      flash('Could not save your changes. Please try again.', 0);
    }
    setSaving(false);
  };

  const refine = async (request) => {
    const wanted = (request || '').trim();
    if (!wanted || refining) return;
    const base = current();
    setRefining(true);
    setMessage('');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ prompt: buildRefinePrompt(base, wanted), mode: 'document' }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not update the document. Please try again.');
      const clean = sanitizeHtml((result.result || '').replace(/```html|```/g, '').trim());
      if (clean.length < 100) throw new Error('The update came back empty. Please try again.');
      setHistory(h => [...h, base]);
      setText(clean);
      setEditing(false);
      setInstruction('');
      try { await persist(clean); flash('Updated and saved. You can undo this.'); } catch { flash('Updated, but it could not be saved. Press Edit then Save changes.', 0); }
    } catch (err) {
      flash(`Could not update: ${err.message}`, 0);
    }
    setRefining(false);
  };

  const undo = async () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setText(previous);
    setEditing(false);
    try { await persist(previous); flash('Went back to the previous version.'); } catch { flash('Went back, but it could not be saved.', 0); }
  };

  const run = async (kind) => {
    setBusy(kind);
    setMessage('');
    const ok = kind === 'word' ? await downloadWord(current(), title) : await downloadPDF(current(), title);
    setBusy('');
    if (!ok) flash('Could not create the file. Please try again.', 0);
  };

  const isError = message.startsWith('Could not') || message.includes('could not be saved');

  return (
    <div>
      <div style={s.toolbar}>
        <button type="button" style={s.btnLight} onClick={() => run('word')} disabled={!!busy}><Icon name="download" size={15} style={{ marginRight: 6 }} />{busy === 'word' ? 'Preparing...' : 'Word'}</button>
        <button type="button" style={s.btnDark} onClick={() => run('pdf')} disabled={!!busy}><Icon name="download" size={15} style={{ marginRight: 6 }} />{busy === 'pdf' ? 'Preparing...' : 'PDF'}</button>
        {!editing && <button type="button" style={s.btnLight} onClick={() => { setMessage(''); setEditing(true); }}><Icon name="edit" size={15} style={{ marginRight: 6 }} />Edit</button>}
        {editing && <button type="button" style={s.btnDark} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>}
        {editing && <button type="button" style={s.btnLight} onClick={() => { setEditing(false); setMessage(''); }}>Cancel</button>}
        {history.length > 0 && !editing && <button type="button" style={s.btnLight} onClick={undo} disabled={refining}>Undo</button>}
        {message && <span style={{ fontSize: 14, color: isError ? 'var(--bad-text)' : 'var(--ok-text)', alignSelf: 'center' }}>{message}</span>}
      </div>

      <div style={s.refine}>
        <p style={s.refineTitle}><Icon name="spark" size={15} style={{ marginRight: 6 }} />Ask PM Buddy to change this</p>
        <div style={s.chips}>
          {REFINE_CHIPS.map(chip => (
            <button key={chip.label} type="button" style={s.chip} disabled={refining} onClick={() => refine(chip.instruction)}>{chip.label}</button>
          ))}
        </div>
        <div style={s.refineRow}>
          <input
            type="text"
            style={s.refineInput}
            placeholder="e.g. Expand the risks section, or remove the budget part"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') refine(instruction); }}
            disabled={refining}
            aria-label="Tell PM Buddy what to change"
          />
          <button type="button" style={{ ...s.btnDark, opacity: !instruction.trim() || refining ? 0.5 : 1 }} disabled={!instruction.trim() || refining} onClick={() => refine(instruction)}>{refining ? 'Updating...' : 'Update'}</button>
        </div>
        {refining && <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>Updating your document. This can take up to a minute.</p>}
      </div>

      {editing && <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>You are editing. Click into the text to change it, then Save changes. Placeholders in [square brackets] are for you to fill in.</p>}
      {editing ? (
        <div
          key="edit"
          ref={editRef}
          className="pmb-doc"
          contentEditable
          suppressContentEditableWarning
          style={{ ...s.doc, borderColor: 'var(--accent)', outline: 'none' }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
        />
      ) : (
        <div key={`view-${history.length}`} className="pmb-doc" style={{ ...s.doc, opacity: refining ? 0.55 : 1 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  btnLight: { display: 'inline-flex', alignItems: 'center', padding: '8px 16px', background: 'var(--surface)', color: 'var(--accent-text)', border: '1.5px solid var(--accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnDark: { display: 'inline-flex', alignItems: 'center', padding: '8px 16px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  refine: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 },
  refineTitle: { display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { padding: '6px 12px', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border-strong)', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  refineRow: { display: 'flex', gap: 8 },
  refineInput: { flex: 1, minWidth: 0, padding: '9px 12px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, color: 'var(--text)', fontFamily: 'inherit' },
  doc: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', maxHeight: '55vh', overflowY: 'auto' },
};
