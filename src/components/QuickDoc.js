import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const STAGES = { CHAT: 'chat', GENERATING: 'generating', DOCUMENT: 'document', NEXT: 'next' };

function useVoice(onResult) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const lastResultIndexRef = useRef(0);

  const toggle = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported on this browser. Try Chrome on desktop or Android.'); return; }
    const recognition = new SR();
    recognitionRef.current = recognition;
    lastResultIndexRef.current = 0;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = lastResultIndexRef.current; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcript += e.results[i][0].transcript + ' ';
          lastResultIndexRef.current = i + 1;
        }
      }
      if (transcript.trim()) onResult(transcript.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    try { recognition.start(); } catch { setListening(false); }
  };
  return { listening, toggle };
}

export default function QuickDoc({ user, onBack, onStartProject, onStartCampaign }) {
  const [stage, setStage] = useState(STAGES.CHAT);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: `${user?.user_metadata?.first_name ? `Hi ${user.user_metadata.first_name}.` : 'Hi there.'} What do you need to create today? It could be a concept note, a session plan, a proposal, a workshop agenda or anything else. Just describe it in your own words and we will take it from there.`,
  }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [probeCount, setProbeCount] = useState(0);
  const [docContent, setDocContent] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docId, setDocId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [updateInput, setUpdateInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [genError, setGenError] = useState(null);
  const { listening: isListening, toggle: toggleVoice } = useVoice((transcript) => {
    setInput(prev => (prev + ' ' + transcript).trim());
  });
  const bottomRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, stage]);

  const addMessage = (role, text) => {
    const msg = { role, text };
    setMessages(prev => [...prev, msg]);
    conversationRef.current = [...conversationRef.current, msg];
  };

  const buildContext = () => conversationRef.current
    .map(m => `${m.role === 'assistant' ? 'PM Buddy' : 'User'}: ${m.text}`)
    .join('\n');

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;
    const userText = input.trim();
    setInput('');
    addMessage('user', userText);
    setThinking(true);

    const context = buildContext() + `\nUser: ${userText}`;
    const newProbeCount = probeCount + 1;
    setProbeCount(newProbeCount);

    if (newProbeCount >= 3) {
      setStage(STAGES.GENERATING);
      addMessage('assistant', 'I have enough to work with. Writing your document now. This may take up to a minute.');
      await generateDocument(context);
    } else {
      const probePrompt = `You are PM Buddy helping someone create a professional document. 

Conversation so far:
${context}

This is follow-up question ${newProbeCount} of 2. Based on what they described, ask 1 to 2 specific questions to get details you need to write a thorough document. Be specific to their situation. Ask about timeline, audience, objectives, or key content areas that are missing. Do not ask generic questions. Keep response under 60 words. No bullet points.`;

      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: probePrompt }),
        });
        const result = await res.json();
        addMessage('assistant', result.result || 'Tell me more about who this is for and what outcome you are hoping for.');
      } catch {
        addMessage('assistant', 'Tell me more about the audience and timeline for this.');
      }
      setThinking(false);
    }
  };

  const generateDocument = async (context) => {
    setGenError(null);
    const genPrompt = `You are a professional document writer with expertise in project management, business writing and organisational communication.

Based on this conversation, write a complete, detailed, professional document:

${context}

Requirements:
- Determine the exact document type from the conversation (concept note, session plan, training agenda, proposal, workshop plan, project brief etc)
- Write a FULL document with ALL sections properly filled in. Minimum 600 words.
- Be specific and detailed. Use the actual information provided. Do not be vague.
- Where exact details were not provided, write realistic professional placeholder content in [brackets] that shows what should go there
- Structure: use <h1> for document title, <h2> for section headings, <p> for paragraphs, <ul><li> for lists where appropriate
- No html, head, body or style tags. Pure content HTML only.
- Sections must include at minimum: Introduction/Background, Objectives, Scope/Content, Timeline/Schedule, Roles and Responsibilities, Expected Outcomes, Next Steps
- For session/training plans also include: Session Agenda with times, Learning Objectives, Materials Needed, Facilitation Notes
- Write as a seasoned professional would. Full sentences. No bullet point summaries masquerading as content.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: genPrompt, mode: 'document' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        setGenError('AI is busy right now. Please try again in a moment.');
        setStage(STAGES.CHAT);
        setThinking(false);
        return;
      }

      const result = await res.json();
      const raw = (result.result || '').replace(/```html|```/g, '').trim();

      if (!raw || raw.length < 200) {
        setGenError('The document came back too short. Please try again.');
        setStage(STAGES.CHAT);
        setThinking(false);
        return;
      }

      const titleMatch = raw.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'Quick Document';

      setDocContent(raw);
      setDocTitle(title);

      const userId = typeof user === 'string' ? user : user?.id;
      const { data: saved } = await supabase.from('documents').insert({
        user_id: userId,
        project_id: null,
        project_name: 'Quick Docs',
        type: 'quick',
        title,
        content: raw,
      }).select().single();
      if (saved) setDocId(saved.id);

      setStage(STAGES.DOCUMENT);
      setThinking(false);
    } catch (err) {
      if (err.name === 'AbortError') {
        setGenError('This is taking longer than expected. Please check your connection and try again.');
      } else {
        setGenError('Something went wrong. Please try again.');
      }
      setStage(STAGES.CHAT);
      setThinking(false);
    }
  };

  const saveEdits = async (newContent) => {
    if (docId) await supabase.from('documents').update({ content: newContent, updated_at: new Date().toISOString() }).eq('id', docId);
    setDocContent(newContent);
    setEditing(false);
  };

  const updateDocument = async () => {
    if (!updateInput.trim()) return;
    setUpdating(true);
    const updatePrompt = `You previously wrote this document:

${docContent}

The user wants to update it:
"${updateInput}"

Rewrite the complete updated document in HTML (h1 for title, h2 for sections, p for paragraphs, ul/li for lists). No html/head/body tags. No markdown. Incorporate the new information naturally. Keep the same level of detail and professionalism. Minimum 600 words.`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: updatePrompt, mode: 'document' }),
      });
      const result = await res.json();
      const updated = (result.result || '').replace(/```html|```/g, '').trim();
      setDocContent(updated);
      if (docId) await supabase.from('documents').update({ content: updated, updated_at: new Date().toISOString() }).eq('id', docId);
    } catch (err) { console.error(err); }
    setUpdateInput('');
    setUpdating(false);
  };

  const downloadDoc = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${docTitle}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:60px auto;padding:0 40px;color:#1a1a1a;line-height:1.8}h1{font-size:28px;font-weight:800;margin-bottom:8px;color:#0A0A0A}h2{font-size:18px;font-weight:700;color:#0284C7;margin-top:40px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #EFF6FF}p{margin-bottom:14px}ul,ol{padding-left:24px;margin-bottom:14px}li{margin-bottom:6px}.footer{margin-top:60px;padding-top:16px;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF}</style></head><body>${docContent}<div class="footer">Generated by PM Buddy on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}>← Dashboard</button>
          <h1 style={s.title}>Quick Doc</h1>
          <p style={s.sub}>Describe what you need. PM Buddy will write it for you.</p>
        </div>

        {genError && (
          <div style={s.errorBar}>
            <p style={s.errorText}>{genError}</p>
            <button style={s.errorBtn} onClick={() => setGenError(null)}>Dismiss</button>
          </div>
        )}

        {(stage === STAGES.CHAT || stage === STAGES.GENERATING) && (
          <div style={s.chatWrap}>
            <div style={s.chatMessages}>
              {messages.map((msg, i) => (
                <div key={i} style={{ ...s.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && <div style={s.avatar}>PM</div>}
                  <div style={{ ...s.bubble, background: msg.role === 'user' ? BLUE : WH, color: msg.role === 'user' ? WH : BL, border: msg.role === 'user' ? 'none' : '1px solid #E5E7EB' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {thinking && (
                <div style={{ ...s.msgRow, justifyContent: 'flex-start' }}>
                  <div style={s.avatar}>PM</div>
                  <div style={{ ...s.bubble, background: WH, border: '1px solid #E5E7EB', color: '#9CA3AF', fontSize: 13 }}>
                    {stage === STAGES.GENERATING ? 'Writing your document. This can take up to 1 minute. Nothing good comes easily.' : 'Thinking...'}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {stage === STAGES.CHAT && (
              <div style={s.inputRow}>
                <div style={s.inputWrap}>
                  <textarea style={s.input} placeholder="Describe what you need to create..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={3} />
                  <div style={s.inputActions}>
                    <button style={{ ...s.voiceBtn, background: isListening ? '#FEF2F2' : GREY, color: isListening ? '#DC2626' : '#6B7280' }} onClick={toggleVoice}>
                      {isListening ? 'Stop' : 'Voice'}
                    </button>
                    <button style={{ ...s.sendBtn, opacity: !input.trim() || thinking ? 0.5 : 1 }} onClick={sendMessage} disabled={!input.trim() || thinking}>Send</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {stage === STAGES.DOCUMENT && (
          <div style={s.docWrap}>
            <div style={s.docActions}>
              <p style={s.docTitleLabel}>{docTitle}</p>
              <div style={s.docBtns}>
                <button style={s.smBtn} onClick={() => setEditing(e => !e)}>{editing ? 'Done editing' : 'Edit'}</button>
                <button style={s.smBtn} onClick={downloadDoc}>Download</button>
                <button style={{ ...s.smBtn, background: BL, color: WH, borderColor: BL }} onClick={() => setStage(STAGES.NEXT)}>What next?</button>
              </div>
            </div>
            <div style={s.updateBar}>
              <input style={s.updateInput} placeholder="Want to add or change something? e.g. Add a budget section or include the AI training topics" value={updateInput} onChange={e => setUpdateInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateDocument()} />
              <button style={{ ...s.sendBtn, opacity: !updateInput.trim() || updating ? 0.5 : 1 }} onClick={updateDocument} disabled={!updateInput.trim() || updating}>
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
            <div style={s.docCard}>
              {editing ? (
                <div style={s.docEditor} contentEditable suppressContentEditableWarning onBlur={e => saveEdits(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: docContent }} />
              ) : (
                <div style={s.docViewer} dangerouslySetInnerHTML={{ __html: docContent }} />
              )}
            </div>
          </div>
        )}

        {stage === STAGES.NEXT && (
          <div style={s.nextWrap}>
            <div style={s.nextCard}>
              <p style={s.nextTitle}>Your document is saved. What do you want to do next?</p>
              <p style={s.nextSub}>PM Buddy can help you turn this into a full execution plan.</p>
              <div style={s.nextOptions}>
                <button style={s.nextOptionBtn} onClick={onStartProject}>
                  <p style={s.nextOptTitle}>Start a full project</p>
                  <p style={s.nextOptDesc}>Set up risks, milestones, team roles and a full PM plan for long term execution.</p>
                </button>
                <button style={s.nextOptionBtn} onClick={onStartCampaign}>
                  <p style={s.nextOptTitle}>Start a campaign</p>
                  <p style={s.nextOptDesc}>Short term drive or partnership. Set it up as a focused campaign.</p>
                </button>
                <button style={{ ...s.nextOptionBtn, borderColor: '#E5E7EB' }} onClick={onBack}>
                  <p style={s.nextOptTitle}>Just save the document</p>
                  <p style={s.nextOptDesc}>The document is saved in My Documents on your dashboard.</p>
                </button>
              </div>
              <button style={s.backToDocBtn} onClick={() => setStage(STAGES.DOCUMENT)}>Back to document</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '32px 24px 80px', fontFamily: "'DM Sans', system-ui, sans-serif" },
  wrap: { maxWidth: 800, margin: '0 auto' },
  header: { marginBottom: 24 },
  backBtn: { background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 8, display: 'block' },
  title: { fontSize: 26, fontWeight: 600, color: BL, letterSpacing: '-0.6px', marginBottom: 4 },
  sub: { fontSize: 14, color: '#9CA3AF' },
  errorBar: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  errorText: { fontSize: 13, color: '#DC2626' },
  errorBtn: { fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  chatWrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  chatMessages: { background: WH, borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px', minHeight: 400, maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  msgRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  bubble: { maxWidth: '75%', padding: '12px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.65 },
  inputRow: { background: WH, borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' },
  inputWrap: { padding: '12px' },
  input: { width: '100%', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: BL, resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', background: 'transparent' },
  inputActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F3F4F6', marginTop: 8 },
  voiceBtn: { padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  sendBtn: { padding: '8px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  docWrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  docActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  docTitleLabel: { fontSize: 16, fontWeight: 600, color: BL },
  docBtns: { display: 'flex', gap: 8 },
  smBtn: { padding: '7px 14px', background: WH, color: BL, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  updateBar: { display: 'flex', gap: 10, alignItems: 'center', background: WH, border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px' },
  updateInput: { flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: BL, background: 'transparent' },
  docCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' },
  docViewer: { padding: '40px 48px', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', maxHeight: 600, overflowY: 'auto' },
  docEditor: { padding: '40px 48px', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', minHeight: 400, outline: 'none' },
  nextWrap: { display: 'flex', justifyContent: 'center', paddingTop: 40 },
  nextCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: '32px', maxWidth: 560, width: '100%' },
  nextTitle: { fontSize: 18, fontWeight: 600, color: BL, marginBottom: 8 },
  nextSub: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  nextOptions: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  nextOptionBtn: { padding: '16px 18px', background: WH, border: `1.5px solid ${BLUE}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  nextOptTitle: { fontSize: 14, fontWeight: 600, color: BL, marginBottom: 4 },
  nextOptDesc: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },
  backToDocBtn: { background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 },
};
