import React, { useState, useEffect } from 'react';
import LandingScreen from './components/LandingScreen';
import QuestionWizard from './components/QuestionWizard';
import ResultsDashboard from './components/ResultsDashboard';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectWizard from './components/ProjectWizard';
import ProjectWorkspace from './components/ProjectWorkspace';
import CampaignWizard from './components/CampaignWizard';
import QuickDoc from './components/QuickDoc';
import { supabase } from './lib/supabase';
import { Analytics } from './lib/analytics';
import { analyze } from './data/analysis';

const S = {
  LAND: 'land', QA: 'qa', RESULTS: 'results',
  AUTH: 'auth', DASHBOARD: 'dashboard',
  PROJECT_NEW: 'project_new', PROJECT_OPEN: 'project_open',
  CAMPAIGN_NEW: 'campaign_new', QUICK_DOC: 'quick_doc',
};

export default function App() {
  const [screen, setScreen] = useState(S.LAND);
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Clear all stale navigation state
    localStorage.removeItem('pmb_screen');
    localStorage.removeItem('pmb_project');

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      localStorage.setItem('pmb_invite_token', inviteToken);
      window.history.replaceState(null, '', window.location.pathname);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);

        // Handle pending invite
        const token = localStorage.getItem('pmb_invite_token');
        if (token) {
          localStorage.removeItem('pmb_invite_token');
          const { data: invite } = await supabase
            .from('project_members').select('*').eq('token', token).single();
          if (invite) {
            await supabase.from('project_members')
              .update({ user_id: session.user.id, status: 'active' })
              .eq('id', invite.id);
            const { data: proj } = await supabase
              .from('pm_projects').select('*').eq('id', invite.project_id).single();
            if (proj) {
              setActiveProject({ ...proj, _currentUser: session.user });
              setScreen(S.PROJECT_OPEN);
              setReady(true);
              return;
            }
          }
        }

        // Restore last project if available
        try {
          const saved = localStorage.getItem('pmb_project');
          if (saved) {
            const p = JSON.parse(saved);
            if (p && p.id) setActiveProject({ ...p, _currentUser: session.user });
          }
        } catch {}

        setScreen(S.DASHBOARD);
      } else {
        setScreen(S.LAND);
      }
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setScreen(S.DASHBOARD);
      }
      if (_event === 'SIGNED_OUT') {
        setUser(null);
        setActiveProject(null);
        localStorage.removeItem('pmb_project');
        setScreen(S.LAND);
      }
      if (window.location.hash || window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const openProject = (p) => {
    const proj = { ...p, _currentUser: user };
    setActiveProject(proj);
    try { localStorage.setItem('pmb_project', JSON.stringify(proj)); } catch {}
    setScreen(S.PROJECT_OPEN);
  };

  const selectMode = (m) => {
    setMode(m); setAnswers({}); setAnalysis(null); setProjectId(null);
    setScreen(S.QA);
  };

  const complete = (a) => {
    const r = analyze(mode, a);
    setAnswers(a); setAnalysis(r);
    Analytics.reportGenerated(mode, r.score);
    setScreen(S.RESULTS);
  };

  const reset = () => {
    setMode(null); setAnswers({}); setAnalysis(null); setProjectId(null);
    setActiveProject(null);
    localStorage.removeItem('pmb_project');
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

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveProject(null);
    localStorage.removeItem('pmb_project');
    setScreen(S.LAND);
  };

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <p style={{ color: '#9CA3AF', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <nav style={nav.bar}>
        <button style={nav.logo} onClick={reset}>
          <span style={nav.logoText}>PM Buddy</span>
        </button>
        <div style={nav.right}>
          {user ? (
            <button style={nav.dashBtn} onClick={() => setScreen(S.DASHBOARD)}>Dashboard</button>
          ) : (
            <>
              <button style={nav.loginBtn} onClick={() => setScreen(S.AUTH)}>Log In</button>
              <button style={nav.signupBtn} onClick={() => setScreen(S.AUTH)}>Get Started</button>
            </>
          )}
        </div>
      </nav>

      {screen === S.LAND && <LandingScreen onSelectMode={selectMode} onLogin={() => setScreen(S.AUTH)} onSignup={() => setScreen(S.AUTH)} onDashboard={() => setScreen(S.DASHBOARD)} user={user} />}
      {screen === S.QA && mode && <QuestionWizard mode={mode} onComplete={complete} onBack={() => setScreen(S.LAND)} />}
      {screen === S.RESULTS && analysis && <ResultsDashboard mode={mode} answers={answers} analysis={analysis} onReset={reset} onEdit={() => setScreen(S.QA)} onSave={saveValidation} user={user} projectId={projectId} />}
      {screen === S.AUTH && <AuthScreen onAuth={(u) => { setUser(u); setScreen(S.DASHBOARD); }} onBack={() => setScreen(S.LAND)} />}
      {screen === S.DASHBOARD && user && <Dashboard user={user} onOpenValidation={openValidation} onOpenProject={openProject} onNewValidation={reset} onNewProject={() => setScreen(S.PROJECT_NEW)} onNewCampaign={() => setScreen(S.CAMPAIGN_NEW)} onNewQuickDoc={() => setScreen(S.QUICK_DOC)} onLogout={logout} />}
      {screen === S.PROJECT_NEW && user && <ProjectWizard user={user} onComplete={(p) => { const proj = { ...p, _currentUser: user }; setActiveProject(proj); try { localStorage.setItem('pmb_project', JSON.stringify(proj)); } catch {} setScreen(S.PROJECT_OPEN); }} onBack={() => setScreen(S.DASHBOARD)} />}
      {screen === S.CAMPAIGN_NEW && user && <CampaignWizard user={user} onComplete={(p) => { const proj = { ...p, _currentUser: user }; setActiveProject(proj); try { localStorage.setItem('pmb_project', JSON.stringify(proj)); } catch {} setScreen(S.PROJECT_OPEN); }} onBack={() => setScreen(S.DASHBOARD)} />}
      {screen === S.QUICK_DOC && user && <QuickDoc user={user} onBack={() => setScreen(S.DASHBOARD)} onStartProject={() => setScreen(S.PROJECT_NEW)} onStartCampaign={() => setScreen(S.CAMPAIGN_NEW)} />}
      {screen === S.PROJECT_OPEN && activeProject && activeProject.id && <ProjectWorkspace project={activeProject} onBack={() => setScreen(S.DASHBOARD)} onUpdate={(p) => { const proj = { ...p, _currentUser: user }; setActiveProject(proj); try { localStorage.setItem('pmb_project', JSON.stringify(proj)); } catch {}; }} />}
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
