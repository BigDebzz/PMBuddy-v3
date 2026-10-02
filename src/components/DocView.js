import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { sanitizeHtml, downloadWord, downloadPDF } from '../lib/docExport';

// Shows a generated document. People can edit it in place before downloading.
// onSave(html) is called when they press Save changes. If it is not given, editing is still possible but not stored.
export default function DocView({ html, title, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const editRef = useRef(null);

  // Downloads use what is on screen, so edits that are not saved yet are included.
  const current = () => (editing && editRef.current ? sanitizeHtml(editRef.current.innerHTML) : html);

  const save = async () => {
    if (!editRef.current) return;
    const next = sanitizeHtml(editRef.current.innerHTML);
    setSaving(true);
    setMessage('');
    try {
      if (onSave) await onSave(next);
      setEditing(false);
      setMessage('Changes saved.');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setMessage('Could not save your changes. Please try again.');
    }
    setSaving(false);
  };

  const popupBlocked = () => setMessage('Your browser blocked the PDF window. Allow pop-ups for this site and try again.');

  return (
    <div>
      <div style={s.toolbar}>
        <button type="button" style={s.btnLight} onClick={() => downloadWord(current(), title)}><Icon name="download" size={15} style={{ marginRight: 6 }} />Word</button>
        <button type="button" style={s.btnDark} onClick={() => { if (!downloadPDF(current(), title)) popupBlocked(); }}><Icon name="download" size={15} style={{ marginRight: 6 }} />PDF</button>
        {!editing && <button type="button" style={s.btnLight} onClick={() => { setMessage(''); setEditing(true); }}><Icon name="edit" size={15} style={{ marginRight: 6 }} />Edit</button>}
        {editing && <button type="button" style={s.btnDark} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>}
        {editing && <button type="button" style={s.btnLight} onClick={() => { setEditing(false); setMessage(''); }}>Cancel</button>}
        {message && <span style={{ fontSize: 14, color: message.startsWith('Could not') || message.startsWith('Your browser') ? 'var(--bad-text)' : 'var(--ok-text)', alignSelf: 'center' }}>{message}</span>}
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
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
      ) : (
        <div key="view" className="pmb-doc" style={s.doc} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  btnLight: { display: 'inline-flex', alignItems: 'center', padding: '8px 16px', background: 'var(--surface)', color: 'var(--accent-text)', border: '1.5px solid var(--accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnDark: { display: 'inline-flex', alignItems: 'center', padding: '8px 16px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  doc: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', maxHeight: '55vh', overflowY: 'auto' },
};
