import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

function injectAnimation() {
  if (document.getElementById('pmbuddy-anim')) return;
  const style = document.createElement('style');
  style.id = 'pmbuddy-anim';
  style.textContent = '@keyframes pmbuddy-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } } @keyframes pmbuddy-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

function useSpeech() {
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const onUpdateRef = useRef(null);
  const [listening, setListening] = useState(false);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback((currentValue, onUpdate) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input requires Chrome.'); return; }
    if (recognitionRef.current) { stop(); return; }
    onUpdateRef.current = onUpdate;
    const r = new SR();
    r.lang = 'en-NG';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    recognitionRef.current = r;
    baseTextRef.current = (currentValue || '').trim();
    r.onstart = () => setListening(true);
    r.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) baseTextRef.current = baseTextRef.current ? baseTextRef.current + ' ' + final.trim() : final.trim();
      const display = baseTextRef.current ? (interim ? baseTextRef.current + ' ' + interim : baseTextRef.current) : interim;
      if (onUpdateRef.current) onUpdateRef.current(display);
    };
    r.onend = () => { if (onUpdateRef.current) onUpdateRef.current(baseTextRef.current); setListening(false); recognitionRef.current = null; };
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.error('Voice:', e.error); setListening(false); recognitionRef.current = null; };
    r.start();
  }, [stop]);

  return { listening, start, stop, baseTextRef };
}

// ── Local storage helpers (fast cache) ──────────────────────────────────────
const STORAGE_KEY = (projectId) => 'pmbuddy_chat_' + projectId;

function loadLocal(projectId) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY(projectId));
    return saved ? JSON.parse(saved) : [];
  } catch (e) { return []; }
}

function saveLocal(projectId, messages) {
  try {
    localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(messages.slice(-50)));
  } catch (e) {}
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function loadFromSupabase(projectId, userId) {
  if (!userId || projectId === 'wizard') return null;
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, message, created_at')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) return null;
    return (data || []).map(function(row) {
      return { role: row.role, text: row.message, ts: new Date(row.created_at).getTime() };
    });
  } catch (e) { return null; }
}

async function saveToSupabase(projectId, userId, msg) {
  if (!userId || projectId === 'wizard') return;
  try {
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      user_id: userId,
      role: msg.role,
      message: msg.text,
    });
  } catch (e) { /* silent fail — localStorage is the backup */ }
}

async function clearFromSupabase(projectId, userId) {
  if (!userId || projectId === 'wizard') return;
  try {
    await supabase.from('chat_messages').delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
  } catch (e) {}
}

// ── Project context builder ──────────────────────────────────────────────────
function buildProjectContext(project) {
  if (!project) return '';
  const milestones = project.milestones || [];
  const doneMilestones = milestones.filter(function(m) { return m.status === 'done'; }).length;
  const pendingMilestones = milestones.filter(function(m) { return m.status === 'pending'; }).length;
  const overdueMilestones = milestones.filter(function(m) {
    if (m.status === 'done') return false;
    return m.date && new Date(m.date) < new Date();
  }).length;
  const openRisks = (project.risks || []).filter(function(r) { return r.status === 'open'; });
  const highRisks = openRisks.filter(function(r) { return r.level === 'high'; });
  const end = project.timeline && project.timeline.end;
  const daysLeft = end ? Math.ceil((new Date(end) - new Date()) / 86400000) : null;
  const isCampaign = project.industry === 'Campaign';

  return [
    'Project Name: ' + project.name,
    'Type: ' + (isCampaign ? 'Campaign' : 'Project'),
    'Goal: ' + ((project.scope && project.scope.goal) || project.description || 'Not stated'),
    'Status: ' + (project.status || 'active'),
    'Timeline: ' + ((project.timeline && project.timeline.start) || 'Not set') + ' to ' + (end || 'Not set'),
    'Days Remaining: ' + (daysLeft !== null ? daysLeft + ' days' : 'Unknown'),
    'Milestones: ' + doneMilestones + ' done, ' + pendingMilestones + ' pending, ' + overdueMilestones + ' overdue',
    'Open Risks: ' + openRisks.length + ' total, ' + highRisks.length + ' high priority',
    'Team Members: ' + (project.team || []).length,
    'Industry: ' + (project.industry || 'Not specified'),
  ].join('\n');
}

function buildOpeningNudge(project) {
  if (!project) return "Hey, I'm your PM Buddy. Think of me as your personal project manager. I'm here to guide you, catch what you might miss and make sure your project stays on track. Let's build this properly.";

  const milestones = project.milestones || [];
  const risks = project.risks || [];
  const team = project.team || [];
  const openRisks = risks.filter(function(r) { return r.status === 'open'; });
  const highRisks = openRisks.filter(function(r) { return r.level === 'high'; });
  const overdue = milestones.filter(function(m) {
    return m.status !== 'done' && m.date && new Date(m.date) < new Date();
  });
  const end = project.timeline && project.timeline.end;
  const daysLeft = end ? Math.ceil((new Date(end) - new Date()) / 86400000) : null;
  const isCampaign = project.industry === 'Campaign';

  if (overdue.length > 0) return "Hey, I'm your PM Buddy. You have " + overdue.length + " overdue milestone" + (overdue.length > 1 ? 's' : '') + " on " + project.name + ". That needs your attention first. Want me to help you figure out what to do next?";
  if (highRisks.length > 0) return "Hey, I'm your PM Buddy. I can see " + highRisks.length + " high priority risk" + (highRisks.length > 1 ? 's' : '') + " sitting open on " + project.name + ". Those should not be ignored. Do you have a plan to manage them?";
  if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) return "Hey, I'm your PM Buddy. " + project.name + " is due in " + daysLeft + " day" + (daysLeft > 1 ? 's' : '') + ". Are you confident everything is on track? Let's do a quick check.";
  if (team.length <= 1 && !isCampaign) return "Hey, I'm your PM Buddy. I notice " + project.name + " doesn't have any team members added yet. If other people are involved, now is a good time to invite them so everyone works from the same plan.";
  if (risks.length === 0) return "Hey, I'm your PM Buddy. I'm looking at " + project.name + " and I don't see any risks logged yet. Every project has risks. Let's make sure yours are documented so nothing catches you off guard.";
  return "Hey, I'm your PM Buddy. Think of me as your personal project manager for " + project.name + ". I'm here to guide you, catch what you might miss and make sure this stays on track. What do you need help with?";
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PMBuddyAssistant({ project, context }) {
  const projectId = (project && project.id) ? project.id : 'wizard';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPopped, setHasPopped] = useState(false);
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const openRef = useRef(open);
  const speech = useSpeech();

  useEffect(function() { openRef.current = open; }, [open]);

  // Get current user
  useEffect(function() {
    supabase.auth.getUser().then(function(res) {
      if (res.data && res.data.user) setUserId(res.data.user.id);
    });
  }, []);

  // Load conversation — Supabase first, localStorage as fallback
  useEffect(function() {
    injectAnimation();
    async function load() {
      // Try Supabase first for cross-device persistence
      if (userId) {
        const remote = await loadFromSupabase(projectId, userId);
        if (remote && remote.length > 0) {
          setMessages(remote);
          saveLocal(projectId, remote); // sync to local cache
          return;
        }
      }
      // Fall back to localStorage
      const local = loadLocal(projectId);
      if (local.length > 0) setMessages(local);
    }
    load();
  }, [projectId, userId]);

  // Auto-pop after 10 seconds
  useEffect(function() {
    if (hasPopped) return;
    var timer = setTimeout(async function() {
      const local = loadLocal(projectId);
      if (local.length === 0) {
        // Check Supabase too before showing opening nudge
        const remote = userId ? await loadFromSupabase(projectId, userId) : null;
        if (!remote || remote.length === 0) {
          const nudge = buildOpeningNudge(project);
          const opening = [{ role: 'assistant', text: nudge, ts: Date.now() }];
          setMessages(opening);
          saveLocal(projectId, opening);
          if (userId) saveToSupabase(projectId, userId, opening[0]);
        }
      }
      setOpen(true);
      setHasPopped(true);
    }, 10000);
    return function() { clearTimeout(timer); };
  }, [project, projectId, hasPopped, userId]);

  useEffect(function() {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  var handleOpen = function() { setOpen(true); setUnread(0); setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 100); };
  var handleClose = function() { setOpen(false); };

  var sendMessage = async function(text) {
    if (!text.trim() || loading) return;
    setInput('');
    speech.baseTextRef.current = '';

    var userMsg = { role: 'user', text: text.trim(), ts: Date.now() };
    var updated = messages.concat([userMsg]);
    setMessages(updated);
    saveLocal(projectId, updated);
    // Save to Supabase (non-blocking)
    saveToSupabase(projectId, userId, userMsg);
    setLoading(true);

    var projectContext = buildProjectContext(project);
    // Use last 20 messages for richer memory context
    var conversationHistory = updated.slice(-20).map(function(m) {
      return (m.role === 'user' ? 'User' : 'PM Buddy') + ': ' + m.text;
    }).join('\n');

    var prompt = 'You are PM Buddy, a friendly and direct personal project manager assistant. You are reading this specific project data and responding based on it.\n\nPROJECT CONTEXT:\n' + projectContext + '\n\n' + (context ? 'ADDITIONAL CONTEXT:\n' + context + '\n\n' : '') + 'CONVERSATION HISTORY (last 20 messages — use this to remember what has been discussed):\n' + conversationHistory + '\n\nYOUR RULES:\n- Speak in plain everyday language. No PM jargon unless you explain it.\n- Be direct and specific to THIS project. Never give generic advice.\n- You remember the full conversation above — refer back to earlier points when relevant.\n- You suggest things but never edit the user\'s work.\n- Keep responses to 2 to 4 sentences unless they ask for detail.\n- Never start with "Great question" or "Absolutely" or filler.\n- You are warm but honest. You are on their side.\n\nRespond only as PM Buddy. No preamble.';

    try {
      var controller = new AbortController();
      var timeout = setTimeout(function() { controller.abort(); }, 20000);
      var response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      var result = await response.json();
      var reply = (result.result || 'Sorry, I could not get a response. Try again.').trim();
      var assistantMsg = { role: 'assistant', text: reply, ts: Date.now() };
      var finalMessages = updated.concat([assistantMsg]);
      setMessages(finalMessages);
      saveLocal(projectId, finalMessages);
      // Save assistant reply to Supabase too
      saveToSupabase(projectId, userId, assistantMsg);
      if (!openRef.current) setUnread(function(u) { return u + 1; });
    } catch (err) {
      var errMsg = { role: 'assistant', text: 'I had trouble connecting. Check your internet and try again.', ts: Date.now() };
      var finalWithErr = updated.concat([errMsg]);
      setMessages(finalWithErr);
      saveLocal(projectId, finalWithErr);
    }
    setLoading(false);
  };

  var handleKeyDown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  var handleVoice = function() {
    if (speech.listening) { speech.stop(); } else { speech.start(input, function(val) { setInput(val); }); }
  };

  var handleClear = async function() {
    if (window.confirm('Clear this conversation?')) {
      setMessages([]);
      saveLocal(projectId, []);
      await clearFromSupabase(projectId, userId);
    }
  };

  if (!open) {
    return (
      React.createElement('button', {
        onClick: handleOpen,
        title: 'PM Buddy Assistant',
        style: {
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          width: 52, height: 52, borderRadius: '50%',
          background: BLUE, color: WH, border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(2,132,199,0.45)',
        }
      },
        React.createElement(BuddyIcon, null),
        unread > 0 && React.createElement('span', {
          style: {
            position: 'absolute', top: -2, right: -2,
            background: '#DC2626', color: WH, fontSize: 10, fontWeight: 700,
            borderRadius: '50%', width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }
        }, unread)
      )
    );
  }

  return (
    React.createElement('div', {
      style: {
        position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
        width: 360, maxHeight: 520,
        background: WH, borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        border: '1px solid #E5E7EB',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflow: 'hidden',
      }
    },
      React.createElement('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', background: BL, borderRadius: '20px 20px 0 0',
        }
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', {
            style: {
              width: 32, height: 32, borderRadius: '50%',
              background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: WH, flexShrink: 0,
            }
          }, React.createElement(BuddyIcon, { size: 16 })),
          React.createElement('div', null,
            React.createElement('p', { style: { fontSize: 13, fontWeight: 700, color: WH, margin: 0 } }, 'PM Buddy'),
            React.createElement('p', { style: { fontSize: 11, color: '#9CA3AF', margin: 0 } }, 'Your personal project manager')
          )
        ),
        React.createElement('div', { style: { display: 'flex', gap: 6 } },
          React.createElement('button', {
            onClick: handleClear,
            title: 'Clear conversation',
            style: { background: 'none', border: 'none', color: '#6B7280', fontSize: 16, cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit' }
          }, '↺'),
          React.createElement('button', {
            onClick: handleClose,
            style: { background: 'none', border: 'none', color: '#9CA3AF', fontSize: 14, cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit' }
          }, '✕')
        )
      ),

      React.createElement('div', {
        style: {
          flex: 1, overflowY: 'auto', padding: '16px',
          display: 'flex', flexDirection: 'column',
          maxHeight: 340,
        }
      },
        messages.length === 0 && React.createElement('p', {
          style: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6, margin: 'auto' }
        }, 'Ask me anything about your project. I\'m reading your data and will give you specific guidance.'),

        messages.map(function(msg, i) {
          var isUser = msg.role === 'user';
          return React.createElement('div', {
            key: i,
            style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10, alignItems: 'flex-start' }
          },
            !isUser && React.createElement('div', {
              style: {
                width: 24, height: 24, borderRadius: '50%',
                background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: WH, flexShrink: 0, marginTop: 2, marginRight: 6,
              }
            }, React.createElement(BuddyIcon, { size: 12 })),
            React.createElement('div', {
              style: {
                maxWidth: '78%', padding: '10px 13px',
                background: isUser ? BLUE : WH,
                color: isUser ? WH : BL,
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                border: isUser ? 'none' : '1px solid #E5E7EB',
                fontSize: 13, lineHeight: 1.65,
              }
            }, msg.text)
          );
        }),

        loading && React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }
        },
          React.createElement('div', {
            style: {
              width: 24, height: 24, borderRadius: '50%',
              background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: WH, flexShrink: 0, marginRight: 6,
            }
          }, React.createElement(BuddyIcon, { size: 12 })),
          React.createElement('div', {
            style: {
              padding: '10px 13px', background: WH, border: '1px solid #E5E7EB',
              borderRadius: '16px 16px 16px 4px',
              display: 'flex', gap: 4, alignItems: 'center',
            }
          },
            [0, 1, 2].map(function(i) {
              return React.createElement('span', {
                key: i,
                style: {
                  width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF',
                  display: 'inline-block',
                  animation: 'pmbuddy-bounce 1.2s infinite',
                  animationDelay: (i * 0.2) + 's',
                }
              });
            })
          )
        ),

        React.createElement('div', { ref: messagesEndRef })
      ),

      React.createElement('div', {
        style: { borderTop: '1px solid #F3F4F6', padding: '10px 12px', background: GREY }
      },
        speech.listening && React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 8, padding: '4px 8px',
            background: '#FEF2F2', borderRadius: 6,
          }
        },
          React.createElement('span', {
            style: { width: 7, height: 7, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }
          }),
          React.createElement('span', { style: { fontSize: 11, color: '#DC2626', fontWeight: 600 } }, 'Listening...')
        ),
        React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'flex-end' } },
          React.createElement('textarea', {
            ref: inputRef,
            style: {
              flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 10,
              padding: '9px 12px', fontSize: 13, fontFamily: 'inherit',
              color: BL, outline: 'none', resize: 'none', background: WH,
              lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
            },
            placeholder: 'Ask PM Buddy anything...',
            value: input,
            onChange: function(e) { speech.baseTextRef.current = e.target.value; setInput(e.target.value); },
            onKeyDown: handleKeyDown,
            rows: 1,
          }),
          React.createElement('button', {
            style: {
              width: 36, height: 36, border: 'none', borderRadius: 8,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: speech.listening ? '#DC2626' : '#F3F4F6', color: '#6B7280', flexShrink: 0,
            },
            onClick: handleVoice,
            title: speech.listening ? 'Stop' : 'Voice input',
          }, speech.listening ? React.createElement(StopIcon, null) : React.createElement(MicIcon, null)),
          React.createElement('button', {
            style: {
              width: 36, height: 36, background: BLUE, color: WH,
              border: 'none', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, opacity: (input.trim() && !loading) ? 1 : 0.4,
            },
            onClick: function() { sendMessage(input); },
            disabled: !input.trim() || loading,
          }, React.createElement(SendIcon, null))
        )
      )
    )
  );
}

function BuddyIcon({ size }) {
  var sz = size || 20;
  return React.createElement('svg', {
    width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
    React.createElement('path', { d: 'M8 14s1.5 2 4 2 4-2 4-2' }),
    React.createElement('line', { x1: '9', y1: '9', x2: '9.01', y2: '9' }),
    React.createElement('line', { x1: '15', y1: '9', x2: '15.01', y2: '9' })
  );
}

function MicIcon() {
  return React.createElement('svg', {
    width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }),
    React.createElement('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
    React.createElement('line', { x1: '12', y1: '19', x2: '12', y2: '23' }),
    React.createElement('line', { x1: '8', y1: '23', x2: '16', y2: '23' })
  );
}

function StopIcon() {
  return React.createElement('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'currentColor' },
    React.createElement('rect', { x: '4', y: '4', width: '16', height: '16', rx: '2' })
  );
}

function SendIcon() {
  return React.createElement('svg', {
    width: '15', height: '15', viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '22', y1: '2', x2: '11', y2: '13' }),
    React.createElement('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
  );
}
