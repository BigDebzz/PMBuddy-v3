import React, { useState, useRef, useEffect } from 'react';
import { getQuestions, modeConfig } from '../data/questions';
import { ChevronLeftIcon, HelpIcon, CheckIcon, AlertIcon } from '../lib/icons';
import { Analytics } from '../lib/analytics';

export default function QuestionWizard({ mode, onComplete, onBack }) {
  const questions = getQuestions(mode);
  const config = modeConfig[mode];
  const accent = config.accent;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState(false);
  const [fading, setFading] = useState(false);
  const inputRef = useRef(null);

  const q = questions[idx];
  const progress = ((idx + 1) / questions.length) * 100;
  const isLast = idx === questions.length - 1;

  useEffect(() => {
    setTooltip(false);
    setError('');
    setTimeout(() => inputRef.current && inputRef.current.focus(), 80);
  }, [idx]);

  const change = (val) => { setAnswers(p => ({ ...p, [q.id]: val })); setError(''); };

  const selectAndAdvance = (val) => {
    const updated = { ...answers, [q.id]: val };
    setAnswers(updated);
    Analytics.questionAnswered(q.id, mode);
    setTimeout(() => {
      if (idx === questions.length - 1) { onComplete(updated); return; }
      setFading(true);
      setTimeout(() => { setIdx(i => i + 1); setFading(false); }, 160);
    }, 280);
  };

  const next = () => {
    if (q.required && !answers[q.id]) { setError('Please answer this question to continue.'); return; }
    Analytics.questionAnswered(q.id, mode);
    if (isLast) { onComplete(answers); return; }
    setFading(true);
    setTimeout(() => { setIdx(i => i + 1); setFading(false); }, 160);
  };

  const back = () => {
    if (idx === 0) { onBack(); return; }
    setFading(true);
    setTimeout(() => { setIdx(i => i - 1); setError(''); setFading(false); }, 160);
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        {/* Top nav */}
        <div style={s.nav}>
          <button style={s.backBtn} onClick={back}>
            <ChevronLeftIcon size={16} />
            <span>Back</span>
          </button>
          <div style={s.modePill}>
            <div style={{ ...s.modeDot, background: accent }} />
            <span>{config.label}</span>
          </div>
          <span style={s.counter}>{idx + 1} / {questions.length}</span>
        </div>

        {/* Progress */}
        <div style={s.progressTrack}>
          <div style={{ ...s.progressBar, width: `${progress}%`, background: accent }} />
        </div>

        {/* Card */}
        <div style={{
          ...s.card,
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.16s ease, transform 0.16s ease',
        }}>

          {/* Header */}
          <div style={s.cardTop}>
            <span style={{ ...s.stagePill, background: accent + '10', color: accent }}>
              {config.label}
            </span>
            <button style={s.helpBtn} onClick={() => setTooltip(p => !p)}>
              <HelpIcon size={14} />
              <span>Why we ask this</span>
            </button>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div style={{ ...s.tooltipBox, borderColor: accent + '25', background: accent + '06' }}>
              <p style={{ ...s.tooltipText, color: accent === '#2563EB' ? '#1D4ED8' : accent }}>{q.tooltip}</p>
            </div>
          )}

          {/* Question */}
          <h2 style={s.question}>{q.question}</h2>
          <p style={s.subtext}>{q.subtext}</p>

          {/* Best practice */}
          {q.bestPractice && (
            <div style={s.bpBox}>
              <span style={s.bpLabel}>Real world example</span>
              <p style={s.bpText}>{q.bestPractice}</p>
            </div>
          )}

          {/* Hint */}
          {q.hint && (
            <div style={s.hintBox}>
              <AlertIcon size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={s.hintText}>{q.hint}</span>
            </div>
          )}

          {/* Inputs */}
          <div style={s.inputWrap}>

            {q.type === 'text' && (
              <input
                ref={inputRef}
                style={s.textInput}
                type="text"
                placeholder={q.placeholder}
                value={answers[q.id] || ''}
                onChange={e => change(e.target.value)}
                onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}14`; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                onKeyDown={e => e.key === 'Enter' && next()}
              />
            )}

            {q.type === 'textarea' && (
              <textarea
                ref={inputRef}
                style={{ ...s.textInput, minHeight: 128, resize: 'vertical', lineHeight: 1.65 }}
                placeholder={q.placeholder}
                value={answers[q.id] || ''}
                onChange={e => change(e.target.value)}
                onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}14`; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
              />
            )}

            {q.type === 'select' && (
              <div style={s.options}>
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      style={{
                        ...s.option,
                        borderColor: selected ? accent : '#E5E7EB',
                        background: selected ? accent + '05' : '#FFFFFF',
                        boxShadow: selected ? `0 0 0 1.5px ${accent}` : 'none',
                      }}
                      onClick={() => selectAndAdvance(opt.value)}
                      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = accent + '60'; e.currentTarget.style.background = '#F9FAFB'; }}}
                      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#FFFFFF'; }}}
                    >
                      <div style={s.optLeft}>
                        <span style={{ ...s.optLabel, color: selected ? accent : '#111827', fontWeight: selected ? 700 : 500 }}>
                          {opt.label}
                        </span>
                        {opt.desc && <span style={s.optDesc}>{opt.desc}</span>}
                      </div>
                      <div style={{
                        ...s.radio,
                        borderColor: selected ? accent : '#D1D5DB',
                        background: selected ? accent : 'transparent',
                      }}>
                        {selected && <CheckIcon size={10} color="#fff" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

          </div>

          {/* Error */}
          {error && (
            <div style={s.errorRow}>
              <AlertIcon size={14} color="#DC2626" />
              <span style={s.errorText}>{error}</span>
            </div>
          )}

          {/* Continue button for text/textarea */}
          {q.type !== 'select' && (
            <button
              style={{ ...s.continueBtn, background: accent }}
              onClick={next}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {isLast ? 'Generate my report' : 'Continue'}
            </button>
          )}

          {!q.required && (
            <button style={s.skipBtn} onClick={next}>Skip this question</button>
          )}
        </div>

        {/* Dots */}
        <div style={s.dots}>
          {questions.map((_, i) => (
            <div key={i} style={{
              height: 5, borderRadius: 3,
              width: i === idx ? 18 : 5,
              background: i < idx ? accent + '60' : i === idx ? accent : '#E5E7EB',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>

      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#FAFAFA', padding: '28px 20px 48px' },
  wrap: { maxWidth: 580, margin: '0 auto' },

  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' },
  modePill: { display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 100, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  modeDot: { width: 6, height: 6, borderRadius: '50%' },
  counter: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },

  progressTrack: { height: 3, background: '#F3F4F6', borderRadius: 2, marginBottom: 24, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)' },

  card: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 18, padding: 'clamp(22px, 5vw, 32px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
  },

  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  stagePill: { fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase' },
  helpBtn: { display: 'flex', alignItems: 'center', gap: 5, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 100, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' },

  tooltipBox: { border: '1px solid', borderRadius: 10, padding: '12px 14px', marginBottom: 16 },
  tooltipText: { fontSize: 14, lineHeight: 1.65, fontWeight: 500 },

  question: { fontSize: 'clamp(18px, 3.5vw, 22px)', fontWeight: 800, color: '#0A0A0A', lineHeight: 1.25, marginBottom: 8, letterSpacing: '-0.3px' },
  subtext: { fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 20 },

  bpBox: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', marginBottom: 16 },
  bpLabel: { display: 'block', fontSize: 10, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  bpText: { fontSize: 13, color: '#92400E', lineHeight: 1.65 },

  hintBox: { display: 'flex', gap: 8, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 12px', marginBottom: 16, alignItems: 'flex-start' },
  hintText: { fontSize: 13, color: '#92400E', lineHeight: 1.6 },

  inputWrap: { marginBottom: 6 },
  textInput: {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #E5E7EB', borderRadius: 10,
    fontSize: 15, color: '#111827', background: '#FFFFFF',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    fontFamily: 'inherit',
  },

  options: { display: 'flex', flexDirection: 'column', gap: 8 },
  option: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 14px', border: '1.5px solid',
    borderRadius: 11, cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.14s ease', width: '100%', fontFamily: 'inherit',
  },
  optLeft: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  optLabel: { fontSize: 14, lineHeight: 1.4, transition: 'color 0.14s' },
  optDesc: { fontSize: 12, color: '#9CA3AF', fontWeight: 400 },
  radio: {
    width: 20, height: 20, borderRadius: '50%',
    border: '2px solid', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.14s ease',
  },

  errorRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 },
  errorText: { fontSize: 13, color: '#DC2626', fontWeight: 500 },

  continueBtn: {
    width: '100%', padding: '13px 20px', border: 'none',
    borderRadius: 10, color: '#FFFFFF', fontSize: 15,
    fontWeight: 700, cursor: 'pointer', marginTop: 20,
    transition: 'opacity 0.15s ease', fontFamily: 'inherit',
    letterSpacing: '-0.1px',
  },
  skipBtn: {
    display: 'block', width: '100%', textAlign: 'center',
    marginTop: 10, background: 'none', border: 'none',
    fontSize: 13, color: '#9CA3AF', cursor: 'pointer', fontFamily: 'inherit',
  },

  dots: { display: 'flex', gap: 5, justifyContent: 'center', marginTop: 20, alignItems: 'center' },
};
