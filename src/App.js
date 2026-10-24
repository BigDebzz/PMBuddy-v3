import React, { useState, useEffect, useRef } from 'react';
import LandingScreen from './components/LandingScreen';
import QuestionWizard from './components/QuestionWizard';
import ResultsDashboard from './components/ResultsDashboard';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectWizard from './components/ProjectWizard';
import ProjectWorkspace from './components/ProjectWorkspace';
import { inviteApi, sameEmail, getPendingToken, setPendingToken, clearPendingToken } from './lib/inviteJoin';
import CampaignWizard from './components/CampaignWizard';
import QuickDoc from './components/QuickDoc';
import FeedbackButton from './components/FeedbackButton';
import CookieBanner from './components/CookieBanner';
import { initConsent } from './lib/consent';
import { useNarrow } from './lib/useNarrow';
import { supabase } from './lib/supabase';
import { Analytics } from './lib/analytics';
import { analyze } from './data/analysis';
import Icon from './components/Icon';

const S = {
  LAND: 'land', QA: 'qa', RESULTS: 'results',
  AUTH: 'auth', DASHBOARD: 'dashboard',
  PROJECT_NEW: 'project_new', PROJECT_OPEN: 'project_open',
  CAMPAIGN_NEW: 'campaign_new', QUICK_DOC: 'quick_doc',
  INVITE: 'invite',
};

function ValidationModeModal({ onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 20, padding: '36px 32px',
        maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>New Validation</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.4px' }}>What are you validating?</h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28 }}>Choose the type that best describes what you are building or pitching.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => onSelect('startup')}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '18px 20px', background: 'var(--surface-2)',
              border: '1.5px solid var(--border)', borderRadius: 16,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-tint)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: '#FFFFFF' }}><Icon name="spark" size={20} /></div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Startup Idea</p>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>Validate a business idea, product, or venture you are building or planning to build.</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('hackathon')}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '18px 20px', background: 'var(--surface-2)',
              border: '1.5px solid var(--border)', borderRadius: 16,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ok)'; e.currentTarget.style.background = 'var(--ok-tint)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: '#FFFFFF' }}><Icon name="bolt" size={20} /></div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Hackathon Project</p>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>Validate an idea you are pitching at a hackathon, competition, or accelerator programme.</p>
            </div>
          </button>
        </div>
        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: 16, padding: '10px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

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
  const [showValidationModal, setShowValidationModal] = useState(false);
  const narrow = useNarrow();

  const modeRef = useRef(mode);
  const answersRef = useRef(answers);
  const analysisRef = useRef(analysis);
  useEffect(() => { initConsent(); }, []);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { analysisRef.current = analysis; }, [analysis]);

  // ---- invitations: someone who comes from an invite link is taken straight into the project ----
  const openJoinedProject = (project, u) => {
    if (project && project.id) { setActiveProject({ ...project, _currentUser: u }); setScreen(S.PROJECT_OPEN); }
    else setScreen(S.DASHBOARD);
  };

  // Joins the project, tells the owner, and opens it. Returns true when it worked.
  const joinWithToken = async (tok, u, confirmDifferent, role) => {
    setInviteAccepting(true);
    setInviteError('');
    const res = await inviteApi('accept', { token: tok, confirmDifferentEmail: !!confirmDifferent });
    if (res.needsConfirm) {
      setInviteAccepting(false);
      setInviteData(d => ({ ...(d || {}), token: tok, email: res.invitedEmail || (d && d.email) || '' }));
      setScreen(S.INVITE);
      return false;
    }
    if (!res.ok) {
      setInviteAccepting(false);
      setInviteError(res.error || 'Could not join the project. Please try again.');
      setScreen(S.INVITE);
      return false;
    }
    clearPendingToken();
    if (res.project && !res.already) {
      try {
        const { data: sd } = await supabase.auth.getSession();
        const access = sd && sd.session && sd.session.access_token;
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
          body: JSON.stringify({
            type: 'member_joined',
            projectId: res.project.id,
            projectName: res.project.name || 'your project',
            ownerEmail: res.project.owner_email,
            data: { email: u.email, name: (u.user_metadata && u.user_metadata.first_name) || u.email, role: role || 'editor' },
          }),
        });
      } catch (err) { console.error('Notify error:', err); }
    }
    setInviteAccepting(false);
    setInviteData(null);
    openJoinedProject(res.project, u);
    return true;
  };

  // After someone logs in or signs up: finish the invitation they came for. Returns true when it took over the screen.
  const tryPendingInvite = async (u, lookupByEmail) => {
    const tok = getPendingToken();
    if (tok) {
      const info = await inviteApi('info', { token: tok });
      if (!info.ok) {
        if (info.status === 404) clearPendingToken();
        setInviteError(info.error || 'This invite link could not be opened. Please try again.');
        setScreen(S.INVITE);
        return true;
      }
      if (info.accepted) { clearPendingToken(); return false; }
      setInviteData({ token: tok, role: info.role, email: info.email, pm_projects: { name: info.projectName, description: info.description } });
      setScreen(S.INVITE);
      // the invitation was sent to this very email address, so there is nothing more to ask
      if (sameEmail(info.email, u.email)) await joinWithToken(tok, u, false, info.role);
      return true;
    }
    if (lookupByEmail) {
      const mine = await inviteApi('mine');
      const first = mine.ok && mine.invites && mine.invites[0];
      if (first) {
        setInviteData({ token: first.token, role: first.role, email: first.email, pm_projects: { name: first.projectName, description: first.description } });
        setScreen(S.INVITE);
        return true;
      }
    }
    return false;
  };

  const showInviteForGuest = async (tok) => {
    const info = await inviteApi('info', { token: tok });
    if (!info.ok) {
      if (info.status === 404) clearPendingToken();
      setInviteError(info.error || 'This invite link could not be opened. Please try again.');
      setScreen(S.INVITE);
      return;
    }
    if (info.accepted) { clearPendingToken(); setScreen(S.AUTH); return; }
    setInviteData({ token: tok, role: info.role, email: info.email, pm_projects: { name: info.projectName, description: info.description } });
    setScreen(S.INVITE);
  };

  // Remember which project is open in this tab, so a reload or a returning tab puts you back where you were.
  const prevScreen = useRef(screen);
  useEffect(() => {
    try {
      if (screen === S.PROJECT_OPEN && activeProject?.id) sessionStorage.setItem('pmb-open-project', String(activeProject.id));
      else if (prevScreen.current === S.PROJECT_OPEN) sessionStorage.removeItem('pmb-open-project');
    } catch (e) { /* storage can be unavailable */ }
    prevScreen.current = screen;
  }, [screen, activeProject]);

  // ---- the browser's Back button: every screen is a step in the browser history, so Back goes to the screen before ----
  const popping = useRef(false);
  const lastScreen = useRef(null);
  const screenRef = useRef(screen);
  const projectRef = useRef(activeProject);
  useEffect(() => { screenRef.current = screen; projectRef.current = activeProject; }, [screen, activeProject]);

  useEffect(() => {
    const was = lastScreen.current;
    lastScreen.current = screen;
    if (popping.current) { popping.current = false; return; }
    const pid = screen === S.PROJECT_OPEN && activeProject ? activeProject.id : null;
    const st = window.history.state && window.history.state.pmb;
    if (st && st.screen === screen && st.pid === pid) return;
    const next = { pmb: { screen, pid, depth: st ? st.depth + 1 : 0 } };
    // the first screen of a visit takes over the current entry; screens like log in, the invite and the wizards
    // are replaced by the screen that follows them, so Back never returns to a finished form
    const replaceIt = !st || ((was === S.AUTH || was === S.INVITE || was === S.PROJECT_NEW || was === S.CAMPAIGN_NEW) && (screen === S.DASHBOARD || screen === S.PROJECT_OPEN));
    if (replaceIt) window.history.replaceState({ pmb: { ...next.pmb, depth: st ? st.depth : 0 } }, '');
    else window.history.pushState(next, '');
  }, [screen, activeProject]);

  useEffect(() => {
    const onPop = async (e) => {
      const st = e.state && e.state.pmb;
      if (!st) return;
      let target = st.screen;
      if (target === S.INVITE) target = S.DASHBOARD;
      if (target === S.PROJECT_OPEN) {
        const open = projectRef.current;
        if (!open || String(open.id) !== String(st.pid)) {
          const { data: row } = await supabase.from('pm_projects').select('*').eq('id', st.pid).single();
          if (!row) target = S.DASHBOARD;
          else setActiveProject({ ...row, _currentUser: user });
        }
      }
      if (target !== screenRef.current) popping.current = true;
      setScreen(target);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // The in-app back buttons do what the browser's Back does, when there is a screen to go back to
  const goBack = (fallback) => {
    const st = window.history.state && window.history.state.pmb;
    if (st && st.depth > 0) window.history.back();
    else setScreen(fallback || S.DASHBOARD);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');

    // Keep the invite token so it survives sign-up, email confirmation and login
    if (token) {
      setPendingToken(token);
      window.history.replaceState(null, '', window.location.pathname);
    }

    const handleAuth = async () => {
      // Coming back from the confirmation email, or from Google
      if (window.location.hash && window.location.hash.includes('access_token')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          window.history.replaceState(null, '', window.location.pathname);
          const handled = await tryPendingInvite(session.user, true);
          if (!handled) setScreen(S.DASHBOARD);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const pendingToken = token || getPendingToken();

      if (session?.user) {
        setUser(session.user);
        if (pendingToken) {
          const handled = await tryPendingInvite(session.user, false);
          if (handled) return;
        }
        let savedId = null;
        try { savedId = sessionStorage.getItem('pmb-open-project'); } catch (e) { savedId = null; }
        if (savedId) {
          const { data: saved } = await supabase.from('pm_projects').select('*').eq('id', savedId).single();
          if (saved) {
            setActiveProject({ ...saved, _currentUser: session.user });
            setScreen(S.PROJECT_OPEN);
            return;
          }
        }
        setScreen(S.DASHBOARD);
      } else if (pendingToken) {
        // Not logged in but has an invite: show the invitation, with a way to sign up or log in
        showInviteForGuest(pendingToken);
      }
    };

    handleAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && _event === 'SIGNED_IN') {
        setUser(session.user);
        // someone is joining from an invitation: the invite step decides where they go next
        if (getPendingToken()) return;
        // Only move to the dashboard from the home or login screens. Coming back to the tab re-sends SIGNED_IN and must not reset where you were.
        setScreen(prev => (prev === S.LAND || prev === S.AUTH ? S.DASHBOARD : prev));
      }
      if (session?.user && _event === 'TOKEN_REFRESHED') {
        // Only update user token silently — do not change the screen
        setUser(session.user);
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
    // pressing the button is the person's own confirmation, even when the invitation went to another email address
    await joinWithToken(inviteData.token, user, !sameEmail(inviteData.email, user.email), inviteData.role);
  };

  const declineInvite = async () => {
    if (inviteData && inviteData.token) await inviteApi('decline', { token: inviteData.token });
    clearPendingToken();
    setInviteData(null);
    setScreen(S.DASHBOARD);
  };

  const autoSavePendingValidation = async (u) => {
    const currentAnalysis = analysisRef.current;
    const currentMode = modeRef.current;
    const currentAnswers = answersRef.current;
    if (!currentAnalysis || !currentMode || !u) return;
    try {
      const { data } = await supabase
        .from('projects')
        .insert({ user_id: u.id, mode: currentMode, title: 'My Validation', answers: currentAnswers, analysis: currentAnalysis })
        .select()
        .single();
      if (data) setProjectId(data.id);
    } catch (e) { console.error('Auto-save validation error:', e); }
  };

  const selectMode = (m) => { setMode(m); setAnswers({}); setAnalysis(null); setProjectId(null); setShowValidationModal(false); setScreen(S.QA); };
  const complete = (a) => { const r = analyze(mode, a); setAnswers(a); setAnalysis(r); Analytics.reportGenerated(mode, r.score); setScreen(S.RESULTS); };
  const reset = () => { setMode(null); setAnswers({}); setAnalysis(null); setProjectId(null); setActiveProject(null); setShowValidationModal(false); setScreen(S.LAND); };
  const saveValidation = async (title) => {
    if (!user) { setScreen(S.AUTH); return; }
    if (projectId) { await supabase.from('projects').update({ title, answers, analysis, updated_at: new Date().toISOString() }).eq('id', projectId); }
    else { const { data } = await supabase.from('projects').insert({ user_id: user.id, mode, title, answers, analysis }).select().single(); if (data) setProjectId(data.id); }
  };
  const openValidation = (p) => { setMode(p.mode); setAnswers(p.answers); setAnalysis(p.analysis); setProjectId(p.id); setScreen(S.RESULTS); };
  const openProject = (p) => { setActiveProject({ ...p, _currentUser: user }); setScreen(S.PROJECT_OPEN); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); reset(); };

  const handleAuthSuccess = async (u) => {
    setUser(u);
    await autoSavePendingValidation(u);
    // finish any invitation this person came for, then open the project
    const handled = await tryPendingInvite(u, true);
    if (handled) return;
    setScreen(S.DASHBOARD);
  };

  // Invite screen
  if (screen === S.INVITE) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(43,42,40,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 12 }}>PM Buddy</p>
          {inviteError ? (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Invalid Invite</h2>
              <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>{inviteError}</p>
              <button style={{ padding: '12px 24px', background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setScreen(S.DASHBOARD)}>Go to Dashboard</button>
            </>
          ) : inviteData ? (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>You have been invited</h2>
              <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8 }}>
                You have been invited to join <strong style={{ color: 'var(--text)' }}>{inviteData.pm_projects?.name}</strong> as {/^[aeiou]/i.test(inviteData.role || '') ? 'an' : 'a'} <strong style={{ color: 'var(--text)' }}>{inviteData.role}</strong>.
              </p>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>{inviteData.pm_projects?.description}</p>
              {!user && (
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
                  Create your free account or log in to join. It takes a minute, and you will land straight in the project.
                </p>
              )}
              {user && inviteData.email && !sameEmail(inviteData.email, user.email) && (
                <p style={{ fontSize: 14, color: 'var(--warn-text)', marginBottom: 16, lineHeight: 1.6 }}>
                  This invitation was sent to {inviteData.email}. You are signed in as {user.email}. You can still join with this account.
                </p>
              )}
              {!user && (
                <button
                  style={{ width: '100%', padding: '12px', background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}
                  onClick={() => setScreen(S.AUTH)}
                >
                  Sign up or log in to join
                </button>
              )}
              {user && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    style={{ flex: 1, padding: '12px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: inviteAccepting ? 0.6 : 1 }}
                    onClick={acceptInvite}
                    disabled={inviteAccepting}
                  >
                    {inviteAccepting ? 'Joining...' : 'Join the project'}
                  </button>
                  <button
                    style={{ padding: '12px 20px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    onClick={declineInvite}
                  >
                    Decline
                  </button>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--muted)' }}>Loading invite...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="app-nav" style={nav.bar}>
        <button style={nav.logo} onClick={reset} aria-label="PM Buddy home"><Icon name="logo" size={28} style={{ color: 'var(--accent)' }} /><span className="nav-logo-text" style={nav.logoText}>PM Buddy</span></button>
        <div style={nav.right}>
          {user ? (screen !== S.DASHBOARD && <button style={nav.dashBtn} onClick={() => setScreen(S.DASHBOARD)}>Dashboard</button>) : <>
            <button className="nav-text-btn" style={nav.loginBtn} onClick={() => setScreen(S.AUTH)}>Log in</button>
            <button className="nav-cta" style={nav.signupBtn} onClick={() => setScreen(S.AUTH)}>Get started free</button>
          </>}
        </div>
      </nav>
      {(screen === S.LAND || (screen === S.DASHBOARD && !user)) && <LandingScreen onSelectMode={selectMode} onLogin={() => setScreen(S.AUTH)} onSignup={() => setScreen(S.AUTH)} onDashboard={() => setScreen(S.DASHBOARD)} user={user} />}
      {screen === S.QA && mode && <QuestionWizard mode={mode} onComplete={complete} onBack={() => setScreen(S.LAND)} />}
      {screen === S.RESULTS && analysis && <ResultsDashboard mode={mode} answers={answers} analysis={analysis} onReset={reset} onEdit={() => setScreen(S.QA)} onSave={saveValidation} user={user} projectId={projectId} />}
      {screen === S.AUTH && <AuthScreen onAuth={handleAuthSuccess} onBack={() => setScreen(S.LAND)} prefillEmail={(inviteData && inviteData.email) || ''} inviteToken={(inviteData && inviteData.token) || ''} inviteProject={(inviteData && inviteData.pm_projects && inviteData.pm_projects.name) || ''} />}
      {screen === S.DASHBOARD && user && <Dashboard user={user} onOpenValidation={openValidation} onOpenProject={openProject} onNewValidation={() => setShowValidationModal(true)} onNewProject={() => setScreen(S.PROJECT_NEW)} onNewCampaign={() => setScreen(S.CAMPAIGN_NEW)} onNewQuickDoc={() => setScreen(S.QUICK_DOC)} onLogout={logout} />}
      {screen === S.CAMPAIGN_NEW && user && <CampaignWizard user={user} onComplete={(p) => { setActiveProject({ ...p, _currentUser: user }); setScreen(S.PROJECT_OPEN); }} onBack={() => goBack()} />}
      {screen === S.PROJECT_NEW && user && <ProjectWizard user={user} onComplete={(p) => { setActiveProject({ ...p, _currentUser: user }); setScreen(S.PROJECT_OPEN); }} onBack={() => goBack()} onImport={() => { try { sessionStorage.setItem('pmb-open-import', '1'); } catch (e) { /* ignore */ } setScreen(S.DASHBOARD); }} />}
      {screen === S.QUICK_DOC && user && <QuickDoc user={user} onBack={() => goBack()} onStartProject={() => setScreen(S.PROJECT_NEW)} onStartCampaign={() => setScreen(S.CAMPAIGN_NEW)} />}
      {screen === S.PROJECT_OPEN && activeProject && activeProject.id && <ProjectWorkspace project={activeProject} onBack={() => goBack()} onUpdate={(p) => setActiveProject({ ...p, _currentUser: user })} />}
      {user && !(narrow && screen === S.PROJECT_OPEN) && <FeedbackButton raised={screen === S.PROJECT_OPEN} />}
      <CookieBanner />
      {showValidationModal && <ValidationModeModal onSelect={selectMode} onClose={() => setShowValidationModal(false)} />}
    </div>
  );
}

const nav = {
  bar: { position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 28px', height: 64, background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  logoText: { fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em' },
  right: { display: 'flex', gap: 10, alignItems: 'center' },
  dashBtn: { padding: '9px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 15, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' },
  loginBtn: { padding: '9px 16px', background: 'none', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' },
  signupBtn: { padding: '9px 20px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
};
