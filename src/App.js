import React, { useState, useEffect } from 'react';
import LandingScreen from './components/LandingScreen';
import QuestionWizard from './components/QuestionWizard';
import ResultsDashboard from './components/ResultsDashboard';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectWizard from './components/ProjectWizard';
import ProjectWorkspace from './components/ProjectWorkspace';
import CampaignWizard from './components/CampaignWizard';
import { supabase } from './lib/supabase';
import { Analytics } from './lib/analytics';
import { analyze } from './data/analysis';

const S = {
  LAND: 'land', QA: 'qa', RESULTS: 'results',
  AUTH: 'auth', DASHBOARD: 'dashboard',
  PROJECT_NEW: 'project_new', PROJECT_OPEN: 'project_open', CAMPAIGN_NEW: 'campaign_new',
};

export default function App() {
  const [screen, setScreen] = useState(S.LAND);
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);

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
    setMode(m); setAnswers({}); setAnalysis(null); setProjectId(null); setScreen(S.QA);
  };

  const complete = (a) => {
    const r = analyze(mode, a);
    setAnswers(a); setAnalysis(r);
    Analytics.reportGenerated(mode, r.score);
    setScreen(S.RESULTS);
  };

  const reset = () => {
    setMode(null); setAnswers({}); setAnalysis(null); setProjectId(null); setActiveProject(null);
    setScreen(S.LAND);
  };

  const saveValidation = async (title) => {
    if (!user) { setScreen(S.AUTH); return; }
    if (projectId) {
      await supabase.from('projects').update({ title, answers, analysis, updated_at: new Date().toISOString() }).eq('id', projectId);
    } else {
      const { data } = await supabase.from('projects').insert({ user_id: user.id, mode, title, answers, analysis }).select().single();
      if (data) setProjectId(data.id);
    }
  };

  const openValidation = (p) => {
    setMode(p.mode); setAnswers(p.answers); setAnalysis(p.analysis); setProjectId(p.id);
    setScreen(S.RESULTS);
  };

  const openProject = (p) => {
    setActiveProject(p);
    setScreen(S.PROJECT_OPEN);
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
          <span style={nav.logoText}>PM Buddy</span>
        </button>
        <div style={nav.right}>
          {user ? (
            <button style={nav.dashBtn} onClick={() => setScreen(S.DASHBOARD)}>My Projects</button>
          ) : (
            <>
              <button style={nav.loginBtn} onClick={() => setScreen(S.AUTH)}>Log In</button>
              <button style={nav.signupBtn} onClick={() => setScreen(S.AUTH)}>Get Started</button>
            </>
          )}
          {screen !== S.LAND && user && (
            <button style={nav.loginBtn} onClick={reset}>Home</button>
          )}
        </div>
      </nav>

      {screen === S.LAND && (
        <LandingScreen onSelectMode={selectMode} onLogin={() => setScreen(S.AUTH)} onSignup={() => setScreen(S.AUTH)} onDashboard={() => setScreen(S.DASHBOARD)} user={user} />
      )}
      {screen === S.QA && mode && (
        <QuestionWizard mode={mode} onComplete={complete} onBack={() => setScreen(S.LAND)} />
      )}
      {screen === S.RESULTS && analysis && (
        <ResultsDashboard mode={mode} answers={answers} analysis={analysis} onReset={reset} onEdit={() => setScreen(S.QA)} onSave={saveValidation} user={user} projectId={projectId} />
      )}
      {screen === S.AUTH && (
        <AuthScreen onAuth={(u) => { setUser(u); setScreen(S.DASHBOARD); }} onBack={() => setScreen(S.LAND)} />
      )}
      {screen === S.DASHBOARD && user && (
        <Dashboard user={user} onOpenValidation={openValidation} onOpenProject={openProject} onNewValidation={reset} onNewProject={() => setScreen(S.PROJECT_NEW)} onNewCampaign={() => setScreen(S.CAMPAIGN_NEW)} onLogout={logout} />
      )}
      {screen === S.CAMPAIGN_NEW && user && (
        <CampaignWizard user={user} onComplete={(p) => { setActiveProject(p); setScreen(S.PROJECT_OPEN); }} onBack={() => setScreen(S.DASHBOARD)} />
      )}
      {screen === S.PROJECT_NEW && user && (
        <ProjectWizard user={user} onComplete={(p) => { setActiveProject(p); setScreen(S.PROJECT_OPEN); }} onBack={() => setScreen(S.DASHBOARD)} />
      )}
      {screen === S.PROJECT_OPEN && activeProject && (
        <ProjectWorkspace project={activeProject} onBack={() => setScreen(S.DASHBOARD)} onUpdate={setActiveProject} />
      )}
    </div>
  );
}

const nav = {
  bar: { position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', height: 52, background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' },
  logo: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  logoText: { fontSize: 15, fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.2px' },
  right: { display: 'flex', gap: 8, alignItems: 'center' },
  dashBtn: { padding: '6px 14px', background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'inherit' },
  loginBtn: { padding: '6px 14px', background: 'none', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' },
  signupBtn: { padding: '6px 14px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
};
