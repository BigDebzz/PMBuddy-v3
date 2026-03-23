import React, { useState } from 'react';
import LandingScreen from './components/LandingScreen';
import QuestionWizard from './components/QuestionWizard';
import ResultsDashboard from './components/ResultsDashboard';
import { analyzeAnswers } from './data/analysis';

const SCREENS = { LANDING: 'landing', QUESTIONS: 'questions', RESULTS: 'results' };

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LANDING);
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode);
    setAnswers({});
    setAnalysis(null);
    setScreen(SCREENS.QUESTIONS);
  };

  const handleComplete = (completedAnswers) => {
    const result = analyzeAnswers(mode, completedAnswers);
    setAnswers(completedAnswers);
    setAnalysis(result);
    setScreen(SCREENS.RESULTS);
  };

  const handleReset = () => {
    if (window.confirm('Start a new project?')) {
      setMode(null);
      setAnswers({});
      setAnalysis(null);
      setScreen(SCREENS.LANDING);
    }
  };

  return (
    <div>
      {/* Nav bar */}
      <nav style={styles.nav}>
        <button style={styles.navLogo} onClick={() => setScreen(SCREENS.LANDING)}>
          <span style={styles.navIcon}>📋</span>
          <span style={styles.navTitle}>PM Buddy</span>
        </button>
        <div style={styles.navRight}>
          {screen !== SCREENS.LANDING && (
            <button style={styles.navBtn} onClick={handleReset}>+ New Project</button>
          )}
        </div>
      </nav>

      {/* Screens */}
      {screen === SCREENS.LANDING && (
        <LandingScreen onSelectMode={handleSelectMode} />
      )}
      {screen === SCREENS.QUESTIONS && mode && (
        <QuestionWizard
          mode={mode}
          onComplete={handleComplete}
          onBack={() => setScreen(SCREENS.LANDING)}
        />
      )}
      {screen === SCREENS.RESULTS && analysis && (
        <ResultsDashboard
          mode={mode}
          answers={answers}
          analysis={analysis}
          onReset={handleReset}
          onEditAnswers={() => setScreen(SCREENS.QUESTIONS)}
        />
      )}
    </div>
  );
}

const styles = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 clamp(16px, 4vw, 40px)', height: 56,
    background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--gray-5)',
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  navIcon: { fontSize: 20 },
  navTitle: { fontSize: 18, fontWeight: 800, color: 'var(--black)', letterSpacing: '-0.3px' },
  navRight: { display: 'flex', gap: 8 },
  navBtn: { padding: '7px 16px', borderRadius: 'var(--radius)', background: 'var(--gray-6)', border: '1px solid var(--gray-5)', fontSize: 13, fontWeight: 600, color: 'var(--black)', cursor: 'pointer' },
};
