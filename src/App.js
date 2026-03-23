import React, { useState } from 'react';
import LandingScreen from './components/LandingScreen';
import QuestionWizard from './components/QuestionWizard';
import ResultsDashboard from './components/ResultsDashboard';
import { analyze } from './data/analysis';
import { LogoIcon } from './lib/icons';
import { Analytics } from './lib/analytics';

const S = { LAND: 'land', QA: 'qa', RESULTS: 'results' };

export default function App() {
  const [screen, setScreen] = useState(S.LAND);
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);

  const selectMode = (m) => { setMode(m); setAnswers({}); setAnalysis(null); setScreen(S.QA); };
  const complete = (a) => { const r = analyze(mode, a); setAnswers(a); setAnalysis(r); Analytics.reportGenerated(mode, r.score); setScreen(S.RESULTS); };
  const reset = () => { setMode(null); setAnswers({}); setAnalysis(null); setScreen(S.LAND); };

  return (
    <div>
      <nav style={nav.bar}>
        <button style={nav.logo} onClick={reset}>
          <LogoIcon size={32} />
          <span style={nav.title}>PM Buddy</span>
        </button>
        {screen !== S.LAND && (
          <button style={nav.newBtn} onClick={reset}>New project</button>
        )}
      </nav>

      {screen === S.LAND && <LandingScreen onSelectMode={selectMode} />}
      {screen === S.QA && mode && <QuestionWizard mode={mode} onComplete={complete} onBack={() => setScreen(S.LAND)} />}
      {screen === S.RESULTS && analysis && <ResultsDashboard mode={mode} answers={answers} analysis={analysis} onReset={reset} onEdit={() => setScreen(S.QA)} />}
    </div>
  );
}

const nav = {
  bar: { position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', height: 56, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #F3F4F6' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  title: { fontSize: 17, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px' },
  newBtn: { padding: '7px 14px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
};
