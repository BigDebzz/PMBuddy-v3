import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import DocumentImport from './DocumentImport';
import BroadcastEmail from './BroadcastEmail';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';
import DocView from './DocView';
import ProfileForm from './ProfileForm';
import { downloadWord, downloadPDF } from '../lib/docExport';

const BLUE = 'var(--accent)';
const BL = 'var(--text)';
const WH = 'var(--surface)';
const GREY = 'var(--surface-2)';
const RULE = 'var(--border)';
const SIDEBAR_W = 240;

const NAV = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'projects', icon: 'board', label: 'Projects' },
  { id: 'docs', icon: 'edit', label: 'Documents' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

const CHECKLIST = [
  { id: 'signup', label: 'Create your account', always: true },
  { id: 'project', label: 'Start your first project', action: 'project' },
  { id: 'milestone', label: 'Add a milestone to your project', action: 'project' },
  { id: 'assistant', label: 'Talk to PM Buddy assistant', hint: 'Open any project and click the chat bubble' },
  { id: 'invite', label: 'Invite a team member', hint: 'Open a project and go to the People tab' },
];

const ADMIN_EMAILS = ['akpodeborah@gmail.com', 'hello@pmbuddy.app'];

export default function Dashboard({ user, onOpenValidation, onOpenProject, onNewValidation, onNewProject, onNewCampaign, onNewQuickDoc, onLogout }) {
  const [validations, setValidations] = useState([]); // eslint-disable-line no-unused-vars
  const [projects, setProjects] = useState([]);
  const [campaigns, setCampaigns] = useState([]); // eslint-disable-line no-unused-vars
  const [invitedProjects, setInvitedProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState(() => {
    return sessionStorage.getItem('pmbuddy_active_nav') || localStorage.getItem('pmbuddy_active_nav') || 'home';
  });
  const [viewingDoc, setViewingDoc] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showImport, setShowImport] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [profile, setProfile] = useState(user?.user_metadata || {});
  const [profileSkipped, setProfileSkipped] = useState(() => { try { return localStorage.getItem('pmb-profile-skipped') === '1'; } catch (e) { return false; } });
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const firstName = profile.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      if (!isInstalled && !localStorage.getItem('pmbuddy_install_dismissed')) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setShowInstallBanner(false); setInstallPrompt(null); }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: v }, { data: p }, { data: d }, { data: members }] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('pm_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('documents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('project_members').select('*').eq('user_id', user.id).eq('status', 'accepted'),
    ]);
    setValidations(v || []);
    const allProjects = p || [];
    setProjects(allProjects.filter(proj => proj.industry !== 'Campaign'));
    setCampaigns(allProjects.filter(proj => proj.industry === 'Campaign'));
    setDocuments(d || []);
    if (members && members.length > 0) {
      const ownedIds = new Set(allProjects.map(proj => proj.id));
      const projectIds = members.filter(m => !ownedIds.has(m.project_id)).map(m => m.project_id);
      if (projectIds.length > 0) {
        const { data: invProjects } = await supabase.from('pm_projects').select('*').in('id', projectIds);
        const invited = (invProjects || []).map(proj => {
          const member = members.find(m => m.project_id === proj.id);
          return { ...proj, _inviteRole: member?.role };
        });
        setInvitedProjects(invited);
      }
    }
    setLoading(false);
  };

  const setNav = (id) => {
    setActiveNav(id);
    localStorage.setItem('pmbuddy_active_nav', id);
    sessionStorage.setItem('pmbuddy_active_nav', id);
    setSidebarOpen(false);
    setShowBroadcast(false);
    setShowImport(false);
  };

  const confirmAndDelete = (type, id, name) => setConfirmDelete({ type, id, name });

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    if (type === 'validation') { await supabase.from('projects').delete().eq('id', id); setValidations(v => v.filter(p => p.id !== id)); }
    if (type === 'project') { await supabase.from('pm_projects').delete().eq('id', id); setProjects(p => p.filter(p => p.id !== id)); }
    if (type === 'campaign') { await supabase.from('pm_projects').delete().eq('id', id); setCampaigns(c => c.filter(p => p.id !== id)); }
    setConfirmDelete(null);
  };

  const quickDocs = documents.filter(d => d.type === 'quick' || !d.project_id);
  const projectDocs = documents.filter(d => d.type !== 'quick' && d.project_id);

  const handleNewCampaign = () => onNewCampaign({ onSaved: () => { fetchAll(); setNav('campaigns'); } }); // eslint-disable-line no-unused-vars

  const checklistDone = {
    signup: true,
    project: projects.length > 0,
    milestone: projects.some(p => (p.milestones || []).length > 0),
    assistant: !!localStorage.getItem('pmbuddy_assistant_used'),
    invite: invitedProjects.length > 0 || (projects.some(p => (p.team || []).length > 1)),
  };
  const checklistTotal = CHECKLIST.length;
  const checklistDoneCount = CHECKLIST.filter(c => checklistDone[c.id]).length;
  const onboardingComplete = checklistDoneCount === checklistTotal;
  const isNewUser = projects.length === 0 && documents.length === 0;

  const handleChecklistAction = (action) => {
    if (action === 'project') onNewProject();
  };

  if (showImport) {
    return (
      <DocumentImport
        user={user}
        onComplete={(project) => { setShowImport(false); fetchAll(); onOpenProject(project); }}
        onBack={() => setShowImport(false)}
      />
    );
  }

  return (
    <div style={s.shell}>
      {sidebarOpen && <div style={s.overlay} onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside style={{ ...s.sidebar, transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)' }}>
        <div style={s.sidebarTop}>
          <div style={{ ...s.userCard, cursor: 'pointer' }} role="button" tabIndex={0} onClick={() => setNav('settings')} onKeyDown={e => { if (e.key === 'Enter') setNav('settings'); }}>
            <div style={s.avatar}>{(firstName[0] || '?').toUpperCase()}</div>
            <div style={{ overflow: 'hidden' }}>
              <p style={s.userName}>{firstName}</p>
              <p style={s.userEmail}>{user?.email}</p>
            </div>
          </div>
        </div>

        <nav style={s.nav}>
          {NAV.map(item => (
            <button key={item.id} style={{ ...s.navItem, background: activeNav === item.id ? 'var(--accent-tint)' : 'none', color: activeNav === item.id ? 'var(--accent-text)' : 'var(--text-2)', fontWeight: activeNav === item.id ? 700 : 500 }} onClick={() => setNav(item.id)}>
              <span style={{ ...s.navIcon, color: activeNav === item.id ? 'var(--accent-text)' : 'var(--muted)' }}><Icon name={item.icon} size={18} /></span>
              {item.label}
              {item.id === 'projects' && projects.length > 0 && <span style={s.navBadge}>{projects.length}</span>}
              {item.id === 'docs' && documents.length > 0 && <span style={s.navBadge}>{documents.length}</span>}
            </button>
          ))}
        </nav>

        <div style={s.sidebarBottom}>
          {!onboardingComplete && (
            <div style={s.progressMini}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Getting started</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)' }}>{checklistDoneCount}/{checklistTotal}</span>
              </div>
              <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: `${(checklistDoneCount / checklistTotal) * 100}%` }} /></div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><ThemeToggle showLabels={false} /></div>
          <button style={s.logoutBtn} onClick={onLogout}>Log out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ ...s.main, marginLeft: isMobile ? 0 : SIDEBAR_W }}>
        {/* Top bar */}
        <div style={s.topBar}>
          <button style={s.menuBtn} onClick={() => setSidebarOpen(p => !p)}><Icon name="menu" size={20} /></button>
          <div style={s.topActions}>
            {showInstallBanner && (
              <div style={s.installChip}>
                <button style={s.installChipBtn} onClick={handleInstall}><Icon name="download" size={15} style={{ marginRight: 6 }} />Install App</button>
                <button style={s.installDismiss} onClick={() => { setShowInstallBanner(false); localStorage.setItem('pmbuddy_install_dismissed', '1'); }}><Icon name="x" size={14} /></button>
              </div>
            )}
            <button style={{ ...s.newBtn, background: WH, color: BL, border: `1.5px solid ${RULE}`, marginRight: 8 }} onClick={() => setShowImport(true)}><Icon name="upload" size={15} style={{ marginRight: 6 }} />Import Doc</button>
            <button style={s.newBtn} onClick={onNewProject}>+ New Project</button>
          </div>
        </div>

        <div style={s.content}>
          {/* HOME */}
          {activeNav === 'home' && (
            <div>
              <div style={s.pageHead}>
                <h1 style={s.pageTitle}>{greeting}, {firstName}.</h1>
                <p style={s.pageSub}>Here is where your work lives.</p>
              </div>

              {isNewUser && (
                <div style={s.checklistCard}>
                  <div style={s.checklistHead}>
                    <div>
                      <p style={s.checklistTitle}>Get started with PM Buddy</p>
                      <p style={s.checklistSub}>Complete these steps to get the most out of the platform.</p>
                    </div>
                    <div style={s.checklistProgress}>
                      <span style={s.checklistCount}>{checklistDoneCount}<span style={{ fontSize: 15, color: 'var(--muted)' }}>/{checklistTotal}</span></span>
                    </div>
                  </div>
                  <div style={s.checklistBar}><div style={{ ...s.checklistBarFill, width: `${(checklistDoneCount / checklistTotal) * 100}%` }} /></div>
                  <div style={s.checklistItems}>
                    {CHECKLIST.map((item) => {
                      const done = checklistDone[item.id];
                      return (
                        <div key={item.id} style={{ ...s.checklistItem, opacity: done ? 0.6 : 1 }}>
                          <div style={{ ...s.checkBox, background: done ? BLUE : WH, borderColor: done ? BLUE : RULE }}>
                            {done && <Icon name="check" size={14} strokeWidth={3.4} style={{ color: '#FFFFFF' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ ...s.checkLabel, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : BL }}>{item.label}</p>
                            {item.hint && !done && <p style={s.checkHint}>{item.hint}</p>}
                          </div>
                          {item.action && !done && (
                            <button style={s.checkAction} onClick={() => handleChecklistAction(item.action)}>Start<Icon name="arrow-right" size={14} style={{ marginLeft: 6 }} /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!profile.use_case && !profileSkipped && (
                <div style={s.checklistCard}>
                  <p style={s.checklistTitle}>Tell us a little about you</p>
                  <p style={{ ...s.checklistSub, marginBottom: 16 }}>It helps PM Buddy suggest the right things. You can change it any time in Settings.</p>
                  <ProfileForm compact meta={profile} onSaved={(p) => setProfile(prev => ({ ...prev, ...p }))} onSkip={() => { setProfileSkipped(true); try { localStorage.setItem('pmb-profile-skipped', '1'); } catch (e) { /* ignore */ } }} />
                </div>
              )}

              <div style={s.statsRow}>
                {[
                  { label: 'Projects', value: projects.length, color: 'var(--accent-text)', action: () => setNav('projects') },
                  { label: 'Documents', value: documents.length, color: 'var(--warn-text)', action: () => setNav('docs') },
                ].map((stat, i) => (
                  <button key={i} style={s.statCard} onClick={stat.action}>
                    <p style={{ ...s.statNum, color: stat.color }}>{stat.value}</p>
                    <p style={s.statLabel}>{stat.label}</p>
                  </button>
                ))}
              </div>

              <p style={s.sectionLabel}>Quick actions</p>
              <div style={s.quickGrid}>
                {[
                  { icon: 'board', label: 'New Project', sub: 'Start a structured project', action: onNewProject, bg: 'var(--accent)', color: '#FFFFFF' },
                  { icon: 'upload', label: 'Import Document', sub: 'Paste or upload an existing plan', action: () => setShowImport(true), bg: 'var(--accent-tint)', color: 'var(--accent-text)' },
                ].map((item, i) => (
                  <button key={i} style={s.quickCard} onClick={item.action}>
                    <div style={{ ...s.quickIcon, background: item.bg, color: item.color }}><Icon name={item.icon} size={20} /></div>
                    <div>
                      <p style={s.quickLabel}>{item.label}</p>
                      <p style={s.quickSub}>{item.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {projects.length > 0 && (
                <>
                  <div style={s.sectionHead}>
                    <p style={s.sectionLabel}>Recent projects</p>
                    <button style={s.seeAll} onClick={() => setNav('projects')}>See all</button>
                  </div>
                  <div style={s.projectsGrid}>
                    {projects.slice(0, 3).map(p => <ProjectCard key={p.id} p={p} onOpen={() => onOpenProject(p)} onDelete={() => confirmAndDelete('project', p.id, p.name)} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PROJECTS */}
          {activeNav === 'projects' && (
            <div>
              <div style={s.pageHead}>
                <div>
                  <h1 style={s.pageTitle}>Projects</h1>
                  <p style={s.pageSub}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ ...s.primaryBtn, background: WH, color: BL, border: `1.5px solid ${RULE}` }} onClick={() => setShowImport(true)}><Icon name="upload" size={15} style={{ marginRight: 6 }} />Import Doc</button>
                  <button style={s.primaryBtn} onClick={onNewProject}>+ New project</button>
                </div>
              </div>

              {loading && <p style={s.emptyText}>Loading...</p>}

              {!loading && projects.length === 0 && (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}><Icon name="board" size={36} /></div>
                  <p style={s.emptyTitle}>No projects yet</p>
                  <p style={s.emptyBody}>Create your first project or import an existing document.</p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button style={s.primaryBtn} onClick={onNewProject}>Create your first project</button>
                    <button style={{ ...s.primaryBtn, background: WH, color: BL, border: `1.5px solid ${RULE}` }} onClick={() => setShowImport(true)}><Icon name="upload" size={15} style={{ marginRight: 6 }} />Import from document</button>
                  </div>
                </div>
              )}

              {!loading && projects.length > 0 && (
                <div style={s.projectsGrid}>
                  {projects.map(p => <ProjectCard key={p.id} p={p} onOpen={() => onOpenProject(p)} onDelete={() => confirmAndDelete('project', p.id, p.name)} />)}
                </div>
              )}

              {!loading && invitedProjects.length > 0 && (
                <>
                  <p style={{ ...s.sectionLabel, marginTop: 32, marginBottom: 16 }}>Projects I was invited to</p>
                  <div style={s.projectsGrid}>
                    {invitedProjects.map(p => (
                      <div key={p.id} style={{ ...s.projectCard, borderColor: 'var(--accent-border)' }}>
                        <div style={s.projectBadges}>
                          <span style={s.industryBadge}>{p.industry}</span>
                          <span style={{ ...s.methodBadge, background: 'var(--accent-tint)', color: 'var(--accent-text)' }}>{p._inviteRole}</span>
                        </div>
                        <p style={s.projectName}>{p.name}</p>
                        <p style={s.projectDesc}>{p.description}</p>
                        <button style={s.openBtn} onClick={() => onOpenProject(p)}>Open project</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* DOCS */}
          {activeNav === 'docs' && (
            <div>
              <div style={s.pageHead}>
                <div>
                  <h1 style={s.pageTitle}>Documents</h1>
                  <p style={s.pageSub}>{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                </div>
                <button style={s.primaryBtn} onClick={onNewQuickDoc}>+ New doc</button>
              </div>

              {loading && <p style={s.emptyText}>Loading...</p>}

              {!loading && documents.length === 0 && (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}><Icon name="edit" size={36} /></div>
                  <p style={s.emptyTitle}>No documents yet</p>
                  <p style={s.emptyBody}>Use Quick Doc to create concept notes, session plans, proposals and more in minutes.</p>
                  <button style={s.primaryBtn} onClick={onNewQuickDoc}>Create a document</button>
                </div>
              )}

              {!loading && quickDocs.length > 0 && (
                <>
                  <p style={{ ...s.sectionLabel, marginBottom: 12 }}>Quick Docs</p>
                  {quickDocs.map(doc => <DocRow key={doc.id} doc={doc} type="Quick Doc" typeBg="var(--warn-tint)" typeColor="var(--warn-text)" onOpen={() => setViewingDoc(doc)} />)}
                </>
              )}

              {!loading && projectDocs.length > 0 && (
                <>
                  <p style={{ ...s.sectionLabel, marginTop: 24, marginBottom: 12 }}>Project Documents</p>
                  {projectDocs.map(doc => (
                    <DocRow key={doc.id} doc={doc} type="Internal" typeBg="var(--accent-tint)" typeColor="var(--accent-text)"
                      onOpen={() => {
                        const project = projects.find(p => p.id === doc.project_id);
                        if (project) onOpenProject({ ...project, _openDoc: doc });
                        else setViewingDoc(doc);
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeNav === 'settings' && (
            <div>
              {showBroadcast ? (
                <BroadcastEmail user={user} onBack={() => setShowBroadcast(false)} />
              ) : (
                <>
                  <div style={s.pageHead}>
                    <h1 style={s.pageTitle}>Settings</h1>
                    <p style={s.pageSub}>Manage your account and preferences.</p>
                  </div>

                  <div style={{ ...s.settingsCard, padding: '20px', marginBottom: 20 }}>
                    <p style={{ ...s.settingsSection, padding: 0, marginBottom: 14 }}>Your profile</p>
                    <ProfileForm meta={profile} onSaved={(p) => setProfile(prev => ({ ...prev, ...p }))} />
                  </div>

                  <div style={s.settingsCard}>
                    <p style={s.settingsSection}>Account</p>
                    <div style={s.settingsRow}>
                      <div>
                        <p style={s.settingsLabel}>Email</p>
                        <p style={s.settingsValue}>{user?.email}</p>
                      </div>
                    </div>
                    <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
                      <div>
                        <p style={s.settingsLabel}>Member since</p>
                        <p style={s.settingsValue}>{new Date(user?.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div style={{ ...s.settingsCard, marginTop: 16 }}>
                      <p style={s.settingsSection}>Admin</p>
                      <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
                        <div>
                          <p style={s.settingsLabel}>Email newsletter</p>
                          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Send a feature update to all PM Buddy users.</p>
                        </div>
                        <button style={{ ...s.openBtn }} onClick={() => setShowBroadcast(true)}>Compose</button>
                      </div>
                    </div>
                  )}

                  <div style={{ ...s.settingsCard, marginTop: 16 }}>
                    <p style={s.settingsSection}>Email Users</p>
                    <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
                      <div>
                        <p style={s.settingsLabel}>Send newsletter</p>
                        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Send a feature update to all PM Buddy users.</p>
                      </div>
                      <button style={s.openBtn} onClick={() => setShowBroadcast(true)}>Compose</button>
                    </div>
                  </div>

                  <div style={{ ...s.settingsCard, marginTop: 16 }}>
                    <p style={s.settingsSection}>Danger zone</p>
                    <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
                      <div>
                        <p style={s.settingsLabel}>Sign out</p>
                        <p style={{ fontSize: 14, color: 'var(--muted)' }}>You will be signed out of this device.</p>
                      </div>
                      <button style={{ ...s.openBtn, background: 'none', color: 'var(--bad-text)', border: '1px solid var(--bad-border)' }} onClick={onLogout}>Log out</button>
                    </div>
                  </div>

                  <div style={{ ...s.settingsCard, marginTop: 16 }}>
                    <p style={s.settingsSection}>About PM Buddy</p>
                    <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
                      <div>
                        <p style={s.settingsLabel}>Version</p>
                        <p style={s.settingsValue}>3.0 — Early Access</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, padding: '0 20px 16px' }}>
                      <a href="/privacy.html" style={{ fontSize: 14, color: 'var(--accent-text)' }}>Privacy Policy</a>
                      <a href="/terms.html" style={{ fontSize: 14, color: 'var(--accent-text)' }}>Terms of Service</a>
                      <a href="/about.html" style={{ fontSize: 14, color: 'var(--accent-text)' }}>About</a>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: WH, borderRadius: 16, padding: '32px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div style={{ width: 44, height: 44, borderRadius: 16, background: 'var(--bad-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bad-text)', marginBottom: 16 }}><Icon name="trash" size={22} /></div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: BL, marginBottom: 8 }}>Delete this {confirmDelete.type}?</h3>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: BL }}>{confirmDelete.name}</strong> will be permanently deleted.
            </p>
            <p style={{ fontSize: 14, color: 'var(--bad-text)', fontWeight: 600, marginBottom: 24 }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: '11px', background: 'var(--bad)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={executeDelete}>Yes, delete it</button>
              <button style={{ flex: 1, padding: '11px', background: 'none', color: 'var(--muted)', border: `1px solid ${RULE}`, borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewingDoc && (
        <DocViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} onUpdate={(updated) => { setViewingDoc(updated); setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d)); }} />
      )}
    </div>
  );
}

function DocRow({ doc, type, typeBg, typeColor, onOpen }) {
  return (
    <div style={s.docRow}>
      <div style={s.docRowLeft}>
        <span style={{ ...s.docTypeBadge, background: typeBg, color: typeColor }}>{type}</span>
        <p style={s.docRowTitle}>{doc.title}</p>
        <p style={s.docRowDate}>{new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
      <div style={s.docRowActions}>
        <button style={s.openBtn} onClick={onOpen}>Open</button>
        <button style={{ ...s.openBtn, background: WH, color: 'var(--accent-text)', border: `1px solid ${BLUE}` }} onClick={() => downloadWord(doc.content, doc.title)}>Word</button>
        <button style={{ ...s.openBtn, background: WH, color: 'var(--accent-text)', border: `1px solid ${BLUE}` }} onClick={() => downloadPDF(doc.content, doc.title)}>PDF</button>
      </div>
    </div>
  );
}

function ProjectCard({ p, onOpen, onDelete, isCampaign }) {
  const end = p.timeline?.end ? new Date(p.timeline.end) : null;
  const today = new Date();
  const daysLeft = end ? Math.ceil((end - today) / 86400000) : null;
  const openRisks = (p.risks || []).filter(r => r.status === 'open').length;
  const doneMilestones = (p.milestones || []).filter(m => m.status === 'done').length;
  const totalMilestones = (p.milestones || []).length;
  const openTasks = (p.tasks || []).filter(t => t.status !== 'done').length;
  const blockers = (p.tasks || []).filter(t => t.isBlocker && t.status !== 'done').length;

  return (
    <div style={{ ...s.projectCard, borderColor: blockers > 0 ? 'var(--warn-border)' : RULE }}>
      <div style={s.projectBadges}>
        <span style={{ ...s.industryBadge, background: isCampaign ? 'var(--warn-tint)' : 'var(--accent-tint)', color: isCampaign ? 'var(--warn-text)' : 'var(--accent-text)' }}>
          {isCampaign ? 'Campaign' : p.industry}
        </span>
        {blockers > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--warn-tint)', color: 'var(--warn-text)', padding: '2px 8px', borderRadius: 100 }}><Icon name="blocked" size={12} style={{ marginRight: 4 }} />{blockers} blocker{blockers > 1 ? 's' : ''}</span>}
      </div>
      <p style={s.projectName}>{p.name}</p>
      <p style={s.projectDesc}>{p.description}</p>
      <div style={s.projectStats}>
        <div style={s.stat}><span style={s.statNum2}>{doneMilestones}/{totalMilestones}</span><span style={s.statLabel2}>Milestones</span></div>
        <div style={s.statDivider} />
        <div style={s.stat}><span style={{ ...s.statNum2, color: openTasks > 0 ? BL : 'var(--ok-text)' }}>{openTasks}</span><span style={s.statLabel2}>Open tasks</span></div>
        <div style={s.statDivider} />
        <div style={s.stat}><span style={{ ...s.statNum2, color: openRisks > 0 ? 'var(--bad-text)' : 'var(--ok-text)' }}>{openRisks}</span><span style={s.statLabel2}>Risks</span></div>
        <div style={s.statDivider} />
        <div style={s.stat}><span style={{ ...s.statNum2, color: daysLeft !== null && daysLeft < 7 ? 'var(--bad-text)' : BL }}>{daysLeft !== null ? `${daysLeft}d` : 'N/A'}</span><span style={s.statLabel2}>Left</span></div>
      </div>
      <div style={s.cardActions}>
        <button style={s.openBtn} onClick={onOpen}>Open</button>
        <button style={s.deleteBtn} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function DocViewerModal({ doc, onClose, onUpdate }) {
  const [content, setContent] = useState(doc.content);

  const save = async (next) => {
    const { error } = await supabase.from('documents').update({ content: next, updated_at: new Date().toISOString() }).eq('id', doc.id);
    if (error) throw error;
    setContent(next);
    onUpdate({ ...doc, content: next });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: WH, borderRadius: 16, width: '100%', maxWidth: 800, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '20px 28px', borderBottom: `1px solid ${RULE}` }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: BL }}>{doc.title}</p>
          <button style={{ padding: '7px 16px', background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={onClose}>Close</button>
        </div>
        <div style={{ padding: '20px 28px 28px' }}>
          <DocView key={doc.id} html={content} title={doc.title} onSave={save} />
        </div>
      </div>
    </div>
  );
}

const s = {
  shell: { display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: "'DM Sans', system-ui, sans-serif" },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 },
  sidebar: { width: SIDEBAR_W, flexShrink: 0, background: WH, borderRight: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 64, left: 0, height: 'calc(100vh - 64px)', zIndex: 50, transition: 'transform 0.25s ease' },
  sidebarTop: { padding: '20px 16px 16px' },
  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 },
  brandDot: { width: 8, height: 8, borderRadius: '50%', background: BLUE },
  brandName: { fontSize: 19, fontWeight: 800, color: BL, fontFamily: 'var(--font-head)', letterSpacing: '-0.04em' },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: GREY, borderRadius: 10, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: BLUE, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 },
  userName: { fontSize: 14, fontWeight: 700, color: BL, marginBottom: 1 },
  userEmail: { fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 },
  nav: { flex: 1, padding: '8px 8px', overflowY: 'auto' },
  navItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, textAlign: 'left', marginBottom: 2, transition: 'all 0.15s' },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
  navBadge: { marginLeft: 'auto', fontSize: 12, fontWeight: 700, background: 'var(--accent-tint)', color: 'var(--accent-text)', padding: '1px 7px', borderRadius: 100 },
  sidebarBottom: { padding: '12px 16px 20px' },
  progressMini: { background: GREY, borderRadius: 10, padding: '10px 12px', marginBottom: 10 },
  miniBar: { height: 4, background: RULE, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.4s' },
  logoutBtn: { width: '100%', padding: '9px', background: 'none', border: `1px solid ${RULE}`, borderRadius: 10, fontSize: 14, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' },
  main: { flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'margin-left 0.25s' },
  topBar: { position: 'sticky', top: 64, background: WH, borderBottom: `1px solid ${RULE}`, padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 30 },
  menuBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' },
  topActions: { display: 'flex', alignItems: 'center', gap: 10 },
  installChip: { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-primary)', borderRadius: 10, padding: '4px 4px 4px 12px' },
  installChipBtn: { background: 'none', border: 'none', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  installDismiss: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 15, cursor: 'pointer', padding: '0 6px', fontFamily: 'inherit' },
  newBtn: { padding: '8px 16px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  content: { padding: '32px 28px 80px', maxWidth: 1000, width: '100%' },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: BL, letterSpacing: '-0.5px', marginBottom: 4 },
  pageSub: { fontSize: 15, color: 'var(--muted)' },
  primaryBtn: { padding: '9px 18px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  checklistCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 16, padding: '24px', marginBottom: 28 },
  checklistHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  checklistTitle: { fontSize: 16, fontWeight: 700, color: BL, marginBottom: 4 },
  checklistSub: { fontSize: 14, color: 'var(--muted)' },
  checklistProgress: { flexShrink: 0 },
  checklistCount: { fontSize: 24, fontWeight: 800, color: 'var(--accent-text)', letterSpacing: '-0.5px' },
  checklistBar: { height: 4, background: RULE, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  checklistBarFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.4s' },
  checklistItems: { display: 'flex', flexDirection: 'column', gap: 0 },
  checklistItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${GREY}` },
  checkBox: { width: 20, height: 20, borderRadius: 8, border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  checkLabel: { fontSize: 15, fontWeight: 500 },
  checkHint: { fontSize: 13, color: 'var(--muted)', marginTop: 2 },
  checkAction: { padding: '5px 12px', background: 'var(--accent-tint)', color: 'var(--accent-text)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 },
  statCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 16, padding: '16px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' },
  statNum: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 },
  statLabel: { fontSize: 13, color: 'var(--muted)', fontWeight: 600, },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 28 },
  seeAll: { background: 'none', border: 'none', color: 'var(--accent-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 8 },
  quickCard: { display: 'flex', alignItems: 'center', gap: 12, background: WH, border: `1px solid ${RULE}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  quickIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  quickLabel: { fontSize: 14, fontWeight: 700, color: BL, marginBottom: 2 },
  quickSub: { fontSize: 13, color: 'var(--muted)' },
  projectsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  projectCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 16, padding: '20px' },
  projectBadges: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  industryBadge: { fontSize: 12, fontWeight: 700, background: 'var(--accent-tint)', color: 'var(--accent-text)', padding: '3px 9px', borderRadius: 100 },
  methodBadge: { fontSize: 12, fontWeight: 700, background: GREY, color: 'var(--muted)', padding: '3px 9px', borderRadius: 100 },
  projectName: { fontSize: 15, fontWeight: 700, color: BL, marginBottom: 4 },
  projectDesc: { fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  projectStats: { display: 'flex', marginBottom: 16, border: `1px solid ${RULE}`, borderRadius: 10, overflow: 'hidden' },
  stat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 8px', gap: 3 },
  statNum2: { fontSize: 16, fontWeight: 700, color: BL },
  statLabel2: { fontSize: 12, color: 'var(--muted)', },
  statDivider: { width: 1, background: RULE, flexShrink: 0 },
  cardActions: { display: 'flex', gap: 8 },
  openBtn: { padding: '7px 16px', background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { padding: '7px 14px', background: 'none', color: 'var(--muted)', border: `1px solid ${RULE}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  emptyState: { padding: '60px 0', textAlign: 'center', maxWidth: 400 },
  emptyIcon: { fontSize: 32, marginBottom: 16, color: 'var(--border-strong)' },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: BL, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 },
  emptyText: { color: 'var(--muted)', fontSize: 15, padding: '24px 0' },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap', gap: 16 },
  docRowLeft: { flex: 1 },
  docTypeBadge: { fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 100, display: 'inline-block', marginBottom: 4 },
  docRowTitle: { fontSize: 15, fontWeight: 600, color: BL, marginBottom: 2 },
  docRowDate: { fontSize: 13, color: 'var(--muted)' },
  docRowActions: { display: 'flex', gap: 8 },
  settingsCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 16, overflow: 'hidden' },
  settingsSection: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', padding: '14px 20px', borderBottom: `1px solid ${RULE}`, background: GREY },
  settingsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${RULE}` },
  settingsLabel: { fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 },
  settingsValue: { fontSize: 15, color: BL, fontWeight: 500 },
};
