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
  INVITE: 'invite',
};

export default function App() {
  const [screen, setScreen] = useState(S.LAND);
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [inviteData, setInviteData] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteAccepting, setInviteAccepting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const loadInvite = async (tok) => {
      const { data: member } = await supabase
        .from('project_members')
        .select('*')
        .eq('token', tok)
        .single();
      if (!member) {
        setInviteError('This invite link is invalid or has expired.');
        setScreen(S.INVITE);
        return;
      }
      if (member.status === 'accepted') {
        setScreen(S.DASHBOARD);
        return;
      }
      const { data: project } = await supabase
        .from('pm_projects')
        .select('*')
        .eq('id', member.project_id)
        .single();
      setInviteData({ ...member, pm_projects: project });
      setScreen(S.INVITE);
    };

    // Handle Google OAuth redirect — session is in the URL hash
    const handleAuth = async () => {
      // First try to get session from URL hash (Google OAuth redirect)
      if (window.location.hash && window.location.hash.includes('access_token')) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          window.history.replaceState(null, '', window.location.pathname);
          setScreen(S.DASHBOARD);
          return;
        }
      }

      // Normal session check
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        if (token) {
          loadInvite(token);
        } else {
          setScreen(S.DASHBOARD);
        }
      }
    };

    handleAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION')) {
        setUser(session.user);
        setScreen(prev => prev === S.INVITE ? S.INVITE : S.DASHBOARD);
      }
      if (_event === 'SIGNED_OUT') {
        setUser(null);
        setScreen(S.LAND);
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptInvite = async () => {
    if (!inviteData || !user) return;
    setInviteAccepting(true);
    await supabase.from('project_members').update({
      status: 'accepted',
      user_id: user.id,
    }).eq('id', inviteData.id);

    // Notify project team
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'member_joined',
          projectId: inviteData.project_id,
          projectName: inviteData.pm_projects?.name || 'your project',
          ownerEmail: inviteData.pm_projects?.owner_email,
          data: { email: user.email, name: user.user_metadata?.first_name || user.email, role: inviteData.role },
        }),
      });
    } catch (err) { console.error('Notify error:', err); }

    setInviteAccepting(false);
    setScreen(S.DASHBOARD);
  };

  const declineInvite = async () => {
    if (inviteData) {
      await supabase.from('project_members').delete().eq('id', inviteData.id);
    }
    setScreen(S.DASHBOARD);
  };

  const selectMode = (m) => { setMode(m); setAnswers({}); setAnalysis(null); setProjectId(null); setScreen(S.QA); };
  const complete = (a) => { const r = analyze(mode, a); setAnswers(a); setAnalysis(r); Analytics.reportGenerated(mode, r.score); setScreen(S.RESULTS); };
  const reset = () => { setMode(null); setAnswers({}); setAnalysis(null); setProjectId(null); setActiveProject(null); setScreen(S.LAND); };
  const saveValidation = async (title) => {
    if (!user) { setScreen(S.AUTH); return; }
    if (projectId) { await supabase.from('projects').update({ title, answers, analysis, updated_at: new Date().toISOString() }).eq('id', projectId); }
    else { const { data } = await supabase.from('projects').insert({ user_id: user.id, mode, title, answers, analysis }).select().single(); if (data) setProjectId(data.id); }
  };
  const openValidation = (p) => { setMode(p.mode); setAnswers(p.answers); setAnalysis(p.analysis); setProjectId(p.id); setScreen(S.RESULTS); };
  const openProject = (p) => { setActiveProject({ ...p, _currentUser: user }); setScreen(S.PROJECT_OPEN); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); reset(); };

  // Invite screen
  if (screen === S.INVITE) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>PM Buddy</p>

          {inviteError ? (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 }}>Invalid Invite</h2>
              <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, marginBottom: 24 }}>{inviteError}</p>
              <button style={{ padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setScreen(S.DASHBOARD)}>Go to Dashboard</button>
            </>
          ) : inviteData ? (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 }}>You have been invited</h2>
              <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, marginBottom: 8 }}>
                You have been invited to join <strong style={{ color: '#0A0A0A' }}>{inviteData.pm_projects?.name}</strong> as a <strong style={{ color: '#0A0A0A' }}>{inviteData.role}</strong>.
              </p>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 28 }}>
                {inviteData.pm_projects?.description}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  style={{ flex: 1, padding: '12px', background: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: inviteAccepting ? 0.6 : 1 }}
                  onClick={acceptInvite}
                  disabled={inviteAccepting}
                >
                  {inviteAccepting ? 'Accepting...' : 'Accept Invitation'}
                </button>
                <button
                  style={{ padding: '12px 20px', background: 'none', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={declineInvite}
                >
                  Decline
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#9CA3AF' }}>Loading invite...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav style={nav.bar}>
        <button style={nav.logo} onClick={reset}><span style={nav.logoText}>PM Buddy</span></button>
        <div style={nav.right}>
          {user ? <button style={nav.dashBtn} onClick={() => setScreen(S.DASHBOARD)}>Dashboard</button> : <>
            <button style={nav.loginBtn} onClick={() => setScreen(S.AUTH)}>Log In</button>
            <button style={nav.signupBtn} onClick={() => setScreen(S.AUTH)}>Get Started</button>
          </>}
          {screen !== S.LAND && user && <button style={nav.loginBtn} onClick={reset}>Home</button>}
        </div>
      </nav>
      {(screen === S.LAND || (screen === S.DASHBOARD && !user)) && <LandingScreen onSelectMode={selectMode} onLogin={() => setScreen(S.AUTH)} onSignup={() => setScreen(S.AUTH)} onDashboard={() => setScreen(S.DASHBOARD)} user={user} />}
      {screen === S.QA && mode && <QuestionWizard mode={mode} onComplete={complete} onBack={() => setScreen(S.LAND)} />}
      {screen === S.RESULTS && analysis && <ResultsDashboard mode={mode} answers={answers} analysis={analysis} onReset={reset} onEdit={() => setScreen(S.QA)} onSave={saveValidation} user={user} projectId={projectId} />}
      {screen === S.AUTH && <AuthScreen onAuth={(u) => { setUser(u); setScreen(S.DASHBOARD); }} onBack={() => setScreen(S.LAND)} />}
      {screen === S.DASHBOARD && user && <Dashboard user={user} onOpenValidation={openValidation} onOpenProject={openProject} onNewValidation={reset} onNewProject={() => setScreen(S.PROJECT_NEW)} onNewCampaign={() => setScreen(S.CAMPAIGN_NEW)} onNewQuickDoc={() => setScreen(S.QUICK_DOC)} onLogout={logout} />}
      {screen === S.CAMPAIGN_NEW && user && <CampaignWizard user={user} onComplete={(p) => { setActiveProject({ ...p, _currentUser: user }); setScreen(S.PROJECT_OPEN); }} onBack={() => setScreen(S.DASHBOARD)} />}
      {screen === S.PROJECT_NEW && user && <ProjectWizard user={user} onComplete={(p) => { setActiveProject({ ...p, _currentUser: user }); setScreen(S.PROJECT_OPEN); }} onBack={() => setScreen(S.DASHBOARD)} />}
      {screen === S.QUICK_DOC && user && <QuickDoc user={user} onBack={() => setScreen(S.DASHBOARD)} onStartProject={() => setScreen(S.PROJECT_NEW)} onStartCampaign={() => setScreen(S.CAMPAIGN_NEW)} />}
      {screen === S.PROJECT_OPEN && activeProject && activeProject.id && <ProjectWorkspace project={activeProject} onBack={() => setScreen(S.DASHBOARD)} onUpdate={(p) => setActiveProject({ ...p, _currentUser: user })} />}
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

