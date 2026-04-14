import React, { useState, useEffect, useCallback } from 'react';
import LandingScreen from './components/LandingScreen';
import QuestionWizard from './components/QuestionWizard';
import ResultsDashboard from './components/ResultsDashboard';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectWizard from './components/ProjectWizard';
import ProjectWorkspace from './components/ProjectWorkspace';
import CampaignWizard from './components/CampaignWizard';
import { supabase } from './lib/supabase';
import QuickDoc from './components/QuickDoc';
import { Analytics } from './lib/analytics';
import { analyze } from './data/analysis';

const S = {
  LAND: 'land', QA: 'qa', RESULTS: 'results',
  AUTH: 'auth', DASHBOARD: 'dashboard',
  PROJECT_NEW: 'project_new', PROJECT_OPEN: 'project_open',
  CAMPAIGN_NEW: 'campaign_new', QUICK_DOC: 'quick_doc',
};

export default function App() {
  const [screen, setScreen] = useState(() => {
    const saved = localStorage.getItem('pmb_screen');
    const safeScreens = [S.DASHBOARD, S.PROJECT_OPEN, S.CAMPAIGN_NEW, S.PROJECT_NEW];
    if (!saved || !safeScreens.includes(saved)) return S.LAND;
    if (saved === S.PROJECT_OPEN) {
      try {
        const p = JSON.parse(localStorage.getItem('pmb_project'));
        if (!p || !p.id) return S.DASHBOARD;
      } catch { return S.DASHBOARD; }
    }
    return saved;
  });
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [activeProject, setActiveProject] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pmb_project')) || null; } catch { return null; }
  });

  const goTo = useCallback((s) => {
    setScreen(s);
    localStorage.setItem('pmb_screen', s);
    if (s === S.LAND || s === S.DASHBOARD || s === S.AUTH) {
      localStorage.removeItem('pmb_project');
    }
  }, []);

  const saveProject = useCallback((p) => {
    setActiveProject(p);
    if (p) localStorage.setItem('pmb_project', JSON.stringify(p));
    else localStorage.removeItem('pmb_project');
  }, []);

  useEffect(() => {
    // Handle invite token from URL
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      localStorage.setItem('pmb_invite_token', inviteToken);
      window.history.replaceState(null, '', window.location.pathname);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Handle pending invite
        const token = localStorage.getItem('pmb_invite_token');
        if (token) {
          localStorage.removeItem('pmb_invite_token');
          const { data: invite } = await supabase
            .from('project_members')
            .select('*')
            .eq('token', token)
            .single();
          if (invite) {
            await supabase.from('project_members').update({
              user_id: session.user.id,
              status: 'active',
            }).eq('id', invite.id);
            const { data: proj } = await supabase
              .from('pm_projects')
              .select('*')
              .eq('id', invite.project_id)
              .single();
            if (proj) {
              saveProject({ ...proj, _currentUser: session.user });
              goTo(S.PROJECT_OPEN);
              return;
            }
          }
        }
        // Only navigate to dashboard on actual sign in, not session refresh
        if (_event === 'SIGNED_IN') {
          goTo(S.DASHBOARD);
        }
      }
      if (_event === 'SIGNED_OUT') {
        goTo(S.LAND);
        localStorage.removeItem('pmb_project');
      }
      if (window.location.hash || window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const savedScreen = localStorage.getItem('pmb_screen');
        const safeScreens = [S.DASHBOARD, S.PROJECT_OPEN, S.CAMPAIGN_NEW, S.PROJECT_NEW];
        if (savedScreen && safeScreens.includes(savedScreen)) {
          setScreen(savedScreen);
        } else {
          goTo(S.DASHBOARD);
        }
        // Attach current user to active project
        const savedProject = localStorage.getItem('pmb_project');
        if (savedProject) {
          try {
            const p = JSON.parse(savedProject);
            setActiveProject({ ...p, _currentUser: session.user });
          } catch {}
        }
      } else {
        goTo(S.LAND);
        localStorage.removeItem('pmb_project');
      }
    });

    return () => subscription.unsubscribe();
  }, [goTo, saveProject]);

  const selectMode = (m) => {
    setMode(m); setAnswers({}); setAnalysis(null); setProjectId(null); goTo(S.QA);
  };

  const complete = (a) => {
    const r = analyze(mode, a);
    setAnswers(a); setAnalysis(r);
    Analytics.reportGenerated(mode, r.score);
    goTo(S.RESULTS);
  };

  const reset = () => {
    setMode(null); setAnswers({}); setAnalysis(null); setProjectId(null);
    saveProject(null);
    goTo(S.LAND);
  };

  const saveValidation = async (title) => {
    if (!user) { goTo(S.AUTH); return; }
    if (projectId) {
      await supabase.from('projects').update({ title, answers, analysis, updated_at: new Date().toISOString() }).eq('id', projectId);
    } else {
      const { data } = await supabase.from('projects').insert({ user_id: user.id, mode, title, answers, analysis }).select().single();
      if (data) setProjectId(data.id);
    }
  };

  const openValidation = (p) => {
    setMode(p.mode); setAnswers(p.answers); setAnalysis(p.analysis); setProjectId(p.id);
    goTo(S.RESULTS);
  };

  const openProject = (p) => {
    saveProject({ ...p, _currentUser: user });
    goTo(S.PROJECT_OPEN);
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
            <button style={nav.dashBtn} onClick={() => goTo(S.DASHBOARD)}>Dashboard</button>
          ) : (
            <>
              <button style={nav.loginBtn} onClick={() => goTo(S.AUTH)}>Log In</button>
              <button style={nav.signupBtn} onClick={() => goTo(S.AUTH)}>Get Started</button>
            </>
          )}
          {screen !== S.LAND && user && (
            <button style={nav.loginBtn} onClick={reset}>Home</button>
          )}
        </div>
      </nav>

      {screen === S.LAND && (
        <LandingScreen onSelectMode={selectMode} onLogin={() => goTo(S.AUTH)} onSignup={() => goTo(S.AUTH)} onDashboard={() => goTo(S.DASHBOARD)} user={user} />
      )}
      {screen === S.QA && mode && (
        <QuestionWizard mode={mode} onComplete={complete} onBack={() => goTo(S.LAND)} />
      )}
      {screen === S.RESULTS && analysis && (
        <ResultsDashboard mode={mode} answers={answers} analysis={analysis} onReset={reset} onEdit={() => goTo(S.QA)} onSave={saveValidation} user={user} projectId={projectId} />
      )}
      {screen === S.AUTH && (
        <AuthScreen onAuth={(u) => { setUser(u); goTo(S.DASHBOARD); }} onBack={() => goTo(S.LAND)} />
      )}
      {screen === S.DASHBOARD && (
        user
          ? <Dashboard user={user} onOpenValidation={openValidation} onOpenProject={openProject} onNewValidation={reset} onNewProject={() => goTo(S.PROJECT_NEW)} onNewCampaign={() => goTo(S.CAMPAIGN_NEW)} onNewQuickDoc={() => goTo(S.QUICK_DOC)} onLogout={logout} />
          : <div style={{ padding: '80px 48px', color: '#9CA3AF', fontSize: 14 }}>Loading...</div>
      )}
      {screen === S.CAMPAIGN_NEW && user && (
        <CampaignWizard user={user} onComplete={(p) => { saveProject({ ...p, _currentUser: user }); goTo(S.PROJECT_OPEN); }} onBack={() => goTo(S.DASHBOARD)} />
      )}
      {screen === S.PROJECT_NEW && user && (
        <ProjectWizard user={user} onComplete={(p) => { saveProject({ ...p, _currentUser: user }); goTo(S.PROJECT_OPEN); }} onBack={() => goTo(S.DASHBOARD)} />
      )}
      {screen === S.QUICK_DOC && user && (
        <QuickDoc user={user} onBack={() => goTo(S.DASHBOARD)} onStartProject={() => goTo(S.PROJECT_NEW)} onStartCampaign={() => goTo(S.CAMPAIGN_NEW)} />
      )}
      {screen === S.PROJECT_OPEN && activeProject && activeProject.id && (
        <ProjectWorkspace project={activeProject} onBack={() => goTo(S.DASHBOARD)} onUpdate={(p) => saveProject({ ...p, _currentUser: user })} />
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
