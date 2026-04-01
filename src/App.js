import React, { useState, useEffect } from 'react';
import LandingScreen from './components/LandingScreen';
import QuestionWizard from './components/QuestionWizard';
import ResultsDashboard from './components/ResultsDashboard';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import { analyze } from './data/analysis';
import { supabase } from './lib/supabase';
import { LogoIcon } from './lib/icons';
import { Analytics } from './lib/analytics';

const S = { LAND: 'land', QA: 'qa', RESULTS: 'results', AUTH: 'auth', DASHBOARD: 'dashboard' };

export default function App() {
  const [screen, setScreen] = useState(S.LAND);
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const selectMode = (m) => {
    setMode(m);
    setAnswers({});
    setAnalysis(null);
    setProjectId(null);
    setScreen(S.QA);
  };

  const complete = (a) => {
    const r = analyze(mode, a);
    setAnswers(a);
    setAnalysis(r);
    Analytics.reportGenerated(mode, r.score);
    setScreen(S.RESULTS);
  };

  const reset = () => {
    setMode(null);
    setAnswers({});
    setAnalysis(null);
    setProjectId(null);
    setScreen(S.LAND);
  };

  const saveProject = async (title) => {
    if (!user) { setScreen(S.AUTH); return; }
    if (projectId) {
      await supabase.from('projects').update({
        title,
        answers,
        analysis,
        updated_at: new Date().toISOString()
      }).eq('id', projectId);
    } else {
      const { data } = await supabase.from('projects').insert({
        user_id: user.id,
        mode,
        title,
        answers,
        analysis
      }).select().single();
      if (data) setProjectId(data.id);
    }
  };

  const openProject = (p) => {
    setMode(p.mode);
    setAnswers(p.answers);
    setAnalysis(p.analysis);
    setProjectId(p.id);
    setScreen(S.RESULTS);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    reset();
  };

  return (
    <div>
      <nav style={nav.bar}>
        <button style={nav.logo} onClick={reset}>
          <LogoIcon size={32} />
          <span style={nav.title}>PM Buddy</span>
        </button>
        <div style={nav.right}>
          {user ? (
            <button style={nav.dashBtn} onClick={() => setScreen(S.DASHBOARD)}>My Projects</button>
          ) : (
            <button style={nav.loginBtn} onClick={() => setScreen(S.AUTH)}>Log in</button>
          )}
          {screen !== S.LAND && (
            <button style={nav.newBtn} onClick={reset}>New project</button>
          )}
        </div>
      </nav>

      {screen === S.LAND && (
        <LandingScreen
          onSelectMode={selectMode}
          onLogin={() => setScreen(S.AUTH)}
          onSignup={() => setScreen(S.AUTH)}
        />
      )}
      {screen === S.QA && mode && (
        <QuestionWizard
          mode={mode}
          onComplete={complete}
          onBack={() => setScreen(S.LAND)}
        />
      )}
      {screen === S.RESULTS && analysis && (
        <ResultsDashboard
          mode={mode}
          answers={answers}
          analysis={analysis}
          onReset={reset}
          onEdit={() => setScreen(S.QA)}
          onSave={saveProject}
          user={user}
          projectId={projectId}
        />
      )}
      {screen === S.AUTH && (
        <AuthScreen
          onAuth={(u) => { setUser(u); setScreen(S.DASHBOARD); }}
          onBack={() => setScreen(S.LAND)}
        />
      )}
      {screen === S.DASHBOARD && user && (
        <Dashboard
          user={user}
          onOpen={openProject}
          onNew={reset}
          onLogout={logout}
        />
      )}
    </div>
  );
}

const nav = {
  bar: { position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', height: 56, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #F3F4F6' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  title: { fontSize: 17, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px' },
  right: { display: 'flex', gap: 8, alignItems: 'center' },
  dashBtn: { padding: '7px 14px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
  loginBtn: { padding: '7px 14px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
  newBtn: { padding: '7px 14px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
