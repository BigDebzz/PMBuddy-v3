import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import DocumentImport from './DocumentImport';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';
const RULE = '#E5E7EB';
const SIDEBAR_W = 240;

const NAV = [
  { id: 'home', icon: '⌂', label: 'Home' },
  { id: 'projects', icon: '◈', label: 'Projects' },
  { id: 'docs', icon: '✎', label: 'Documents' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

const CHECKLIST = [
  { id: 'signup', label: 'Create your account', always: true },
  { id: 'project', label: 'Start your first project', action: 'project' },
  { id: 'milestone', label: 'Add a milestone to your project', action: 'project' },
  { id: 'assistant', label: 'Talk to PM Buddy assistant', hint: 'Open any project and click the chat bubble' },
  { id: 'invite', label: 'Invite a team member', hint: 'Open a project and go to the Team tab' },
];

export default function Dashboard({ user, onOpenValidation, onOpenProject, onNewValidation, onNewProject, onNewCampaign, onNewQuickDoc, onLogout }) {
  const [validations, setValidations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [invitedProjects, setInvitedProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState(() => {
    // Use sessionStorage first (survives tab switches), fall back to localStorage
    return sessionStorage.getItem('pmbuddy_active_nav') || localStorage.getItem('pmbuddy_active_nav') || 'home';
  });
  const [viewingDoc, setViewingDoc] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';
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

  const handleNewCampaign = () => onNewCampaign({ onSaved: () => { fetchAll(); setActiveNav('campaigns'); localStorage.setItem('pmbuddy_active_nav', 'campaigns'); sessionStorage.setItem('pmbuddy_active_nav', 'campaigns'); } });

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
    if (action === 'doc') onNewQuickDoc();
    if (action === 'validation') onNewValidation();
  };

  // Show import screen full-page
  if (showImport) {
    return (
      <DocumentImport
        user={user}
        onComplete={(project) => {
          setShowImport(false);
          fetchAll();
          onOpenProject(project);
        }}
        onBack={() => setShowImport(false)}
      />
    );
  }

  return (
    <div style={s.shell}>
      {/* Mobile overlay */}
      {sidebarOpen && <div style={s.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside style={{ ...s.sidebar, transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)' }}>
        <div style={s.sidebarTop}>
          <div style={s.brand}>
            <div style={s.brandDot} />
            <span style={s.brandName}>PM Buddy</span>
          </div>
          <div style={s.userCard}>
            <div style={s.avatar}>{(firstName[0] || '?').toUpperCase()}</div>
            <div>
              <p style={s.userName}>{firstName}</p>
              <p style={s.userEmail}>{user?.email}</p>
            </div>
          </div>
        </div>

        <nav style={s.nav}>
          {NAV.map(item => (
            <button
              key={item.id}
              style={{ ...s.navItem, background: activeNav === item.id ? '#EFF6FF' : 'none', color: activeNav === item.id ? BLUE : '#374151', fontWeight: activeNav === item.id ? 700 : 500 }}
              onClick={() => { setActiveNav(item.id); localStorage.setItem('pmbuddy_active_nav', item.id); sessionStorage.setItem('pmbuddy_active_nav', item.id); setSidebarOpen(false); }}
            >
              <span style={{ ...s.navIcon, color: activeNav === item.id ? BLUE : '#9CA3AF' }}>{item.icon}</span>
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
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Getting started</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>{checklistDoneCount}/{checklistTotal}</span>
              </div>
              <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: `${(checklistDoneCount / checklistTotal) * 100}%` }} /></div>
            </div>
          )}
          <button style={s.logoutBtn} onClick={onLogout}>Log out</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ ...s.main, marginLeft: isMobile ? 0 : SIDEBAR_W }}>
        {/* Top bar */}
        <div style={s.topBar}>
          <button style={s.menuBtn} onClick={() => setSidebarOpen(p => !p)}>☰</button>
          <div style={s.topActions}>
            {showInstallBanner && (
              <div style={s.installChip}>
                <button style={s.installChipBtn} onClick={handleInstall}>⬇ Install App</button>
                <button style={s.installDismiss} onClick={() => { setShowInstallBanner(false); localStorage.setItem('pmbuddy_install_dismissed', '1'); }}>✕</button>
              </div>
            )}
            <button
              style={{ ...s.newBtn, background: WH, color: BL, border: `1.5px solid ${RULE}`, marginRight: 8 }}
              onClick={() => setShowImport(true)}
            >⬆ Import Doc</button>
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
                      <span style={s.checklistCount}>{checklistDoneCount}<span style={{ fontSize: 14, color: '#9CA3AF' }}>/{checklistTotal}</span></span>
                    </div>
                  </div>
                  <div style={s.checklistBar}><div style={{ ...s.checklistBarFill, width: `${(checklistDoneCount / checklistTotal) * 100}%` }} /></div>
                  <div style={s.checklistItems}>
                    {CHECKLIST.map((item) => {
                      const done = checklistDone[item.id];
                      return (
                        <div key={item.id} style={{ ...s.checklistItem, opacity: done ? 0.6 : 1 }}>
                          <div style={{ ...s.checkBox, background: done ? BLUE : WH, borderColor: done ? BLUE : RULE }}>
                            {done && <span style={{ color: WH, fontSize: 11, fontWeight: 900 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ ...s.checkLabel, textDecoration: done ? 'line-through' : 'none', color: done ? '#9CA3AF' : BL }}>{item.label}</p>
                            {item.hint && !done && <p style={s.checkHint}>{item.hint}</p>}
                          </div>
                          {item.action && !done && (
                            <button style={s.checkAction} onClick={() => handleChecklistAction(item.action)}>Start →</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div style={s.statsRow}>
                {[
                  { label: 'Projects', value: projects.length, color: BLUE, action: () => { setActiveNav('projects'); localStorage.setItem('pmbuddy_active_nav', 'projects'); sessionStorage.setItem('pmbuddy_active_nav', 'projects'); } },
                  { label: 'Documents', value: documents.length, color: '#C2410C', action: () => { setActiveNav('docs'); localStorage.setItem('pmbuddy_active_nav', 'docs'); sessionStorage.setItem('pmbuddy_active_nav', 'docs'); } },
                ].map((stat, i) => (
                  <button key={i} style={s.statCard} onClick={stat.action}>
                    <p style={{ ...s.statNum, color: stat.color }}>{stat.value}</p>
                    <p style={s.statLabel}>{stat.label}</p>
                  </button>
                ))}
              </div>

              {/* Quick actions */}
              <p style={s.sectionLabel}>Quick actions</p>
              <div style={s.quickGrid}>
                {[
                  { icon: '◈', label: 'New Project', sub: 'Start a structured project', action: onNewProject, bg: BL, color: WH },
                  { icon: '⬆', label: 'Import Document', sub: 'Paste an existing plan or brief', action: () => setShowImport(true), bg: '#EFF6FF', color: BLUE },
                ].map((item, i) => (
                  <button key={i} style={s.quickCard} onClick={item.action}>
                    <div style={{ ...s.quickIcon, background: item.bg, color: item.color }}>{item.icon}</div>
                    <div>
                      <p style={s.quickLabel}>{item.label}</p>
                      <p style={s.quickSub}>{item.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Recent projects */}
              {projects.length > 0 && (
                <>
                  <div style={s.sectionHead}>
                    <p style={s.sectionLabel}>Recent projects</p>
                    <button style={s.seeAll} onClick={() => { setActiveNav('projects'); localStorage.setItem('pmbuddy_active_nav', 'projects'); sessionStorage.setItem('pmbuddy_active_nav', 'projects'); }}>See all</button>
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
                  <button style={{ ...s.primaryBtn, background: WH, color: BL, border: `1.5px solid ${RULE}` }} onClick={() => setShowImport(true)}>⬆ Import Doc</button>
                  <button style={s.primaryBtn} onClick={onNewProject}>+ New project</button>
                </div>
              </div>
              {loading && <p style={s.emptyText}>Loading...</p>}
              {!loading && projects.length === 0 && (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>◈</div>
                  <p style={s.emptyTitle}>No projects yet</p>
                  <p style={s.emptyBody}>Create your first project and PM Buddy will set it up with risks, milestones, team roles and a communication plan.</p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button style={s.primaryBtn} onClick={onNewProject}>Create your first project</button>
                    <button style={{ ...s.primaryBtn, background: WH, color: BL, border: `1.5px solid ${RULE}` }} onClick={() => setShowImport(true)}>⬆ Import from document</button>
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
                      <div key={p.id} style={{ ...s.projectCard, borderColor: BLUE + '40' }}>
                        <div style={s.projectBadges}>
                          <span style={s.industryBadge}>{p.industry}</span>
                          <span style={{ ...s.methodBadge, background: '#EFF6FF', color: BLUE }}>{p._inviteRole}</span>
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

          {/* CAMPAIGNS */}
          {activeNav === 'campaigns' && (
            <div>
              <div style={s.pageHead}>
                <div>
                  <h1 style={s.pageTitle}>Campaigns</h1>
                  <p style={s.pageSub}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
                </div>
                <button style={s.primaryBtn} onClick={handleNewCampaign}>+ New campaign</button>
              </div>
              {loading && <p style={s.emptyText}>Loading...</p>}
              {!loading && campaigns.length === 0 && (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>◉</div>
                  <p style={s.emptyTitle}>No campaigns yet</p>
                  <p style={s.emptyBody}>Campaigns are short-term projects, initiatives, events or focused efforts. Create one to get a structured plan with milestones and an AI review.</p>
                  <button style={s.primaryBtn} onClick={handleNewCampaign}>Start a campaign</button>
                </div>
              )}
              {!loading && campaigns.length > 0 && (
                <div style={s.projectsGrid}>
                  {campaigns.map(p => <ProjectCard key={p.id} p={p} onOpen={() => onOpenProject(p)} onDelete={() => confirmAndDelete('campaign', p.id, p.name)} isCampaign />)}
                </div>
              )}
            </div>
          )}

          {/* VALIDATIONS */}
          {activeNav === 'validations' && (
            <div>
              <div style={s.pageHead}>
                <div>
                  <h1 style={s.pageTitle}>Validations</h1>
                  <p style={s.pageSub}>{validations.length} validation{validations.length !== 1 ? 's' : ''}</p>
                </div>
                <button style={s.primaryBtn} onClick={onNewValidation}>+ New validation</button>
              </div>
              {loading && <p style={s.emptyText}>Loading...</p>}
              {!loading && validations.length === 0 && (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>✦</div>
                  <p style={s.emptyTitle}>No validations yet</p>
                  <p style={s.emptyBody}>Answer honest questions about your idea and get a detailed report in 10 minutes.</p>
                  <button style={s.primaryBtn} onClick={onNewValidation}>Start a validation</button>
                </div>
              )}
              {!loading && validations.length > 0 && (
                <div style={s.validationsGrid}>
                  {validations.map(v => (
                    <div key={v.id} style={s.validationRow}>
                      <div style={s.validationLeft}>
                        <div style={s.validationMeta}>
                          <span style={s.modeBadge}>{v.mode === 'hackathon' ? 'Hackathon' : 'Startup'}</span>
                          <span style={s.validationDate}>{new Date(v.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <p style={s.validationTitle}>{v.title || 'Untitled Validation'}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: v.analysis?.color }}>{v.analysis?.verdict}</p>
                      </div>
                      <div style={s.validationRight}>
                        <div style={s.scoreRing}>
                          <span style={{ fontSize: 28, fontWeight: 600, color: v.analysis?.color }}>{v.analysis?.score}</span>
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>/100</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={s.openBtn} onClick={() => onOpenValidation(v)}>Open</button>
                          <button style={s.deleteBtn} onClick={() => confirmAndDelete('validation', v.id, v.title || 'Untitled Validation')}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <div style={s.emptyIcon}>✎</div>
                  <p style={s.emptyTitle}>No documents yet</p>
                  <p style={s.emptyBody}>Use Quick Doc to create concept notes, session plans, proposals and more in minutes.</p>
                  <button style={s.primaryBtn} onClick={onNewQuickDoc}>Create a document</button>
                </div>
              )}
              {!loading && quickDocs.length > 0 && (
                <>
                  <p style={{ ...s.sectionLabel, marginBottom: 12 }}>Quick Docs</p>
                  {quickDocs.map(doc => <DocRow key={doc.id} doc={doc} type="Quick Doc" typeBg="#FFF7ED" typeColor="#C2410C" onOpen={() => setViewingDoc(doc)} onDownload={() => downloadDoc(doc)} />)}
                </>
              )}
              {!loading && projectDocs.length > 0 && (
                <>
                  <p style={{ ...s.sectionLabel, marginTop: 24, marginBottom: 12 }}>Project Documents</p>
                  {projectDocs.map(doc => (
                    <DocRow key={doc.id} doc={doc} type="Internal" typeBg="#EFF6FF" typeColor={BLUE}
                      onOpen={() => {
                        const project = projects.find(p => p.id === doc.project_id);
                        if (project) onOpenProject({ ...project, _openDoc: doc });
                        else setViewingDoc(doc);
                      }}
                      onDownload={() => downloadDoc(doc)}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeNav === 'settings' && (
            <div>
              <div style={s.pageHead}>
                <h1 style={s.pageTitle}>Settings</h1>
                <p style={s.pageSub}>Manage your account and preferences.</p>
              </div>
              <div style={s.settingsCard}>
                <p style={s.settingsSection}>Account</p>
                <div style={s.settingsRow}>
                  <div>
                    <p style={s.settingsLabel}>Name</p>
                    <p style={s.settingsValue}>{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</p>
                  </div>
                </div>
                <div style={s.settingsRow}>
                  <div>
                    <p style={s.settingsLabel}>Email</p>
                    <p style={s.settingsValue}>{user?.email}</p>
                  </div>
                </div>
                <div style={s.settingsRow}>
                  <div>
                    <p style={s.settingsLabel}>Role</p>
                    <p style={s.settingsValue}>{user?.user_metadata?.role || 'Not set'}</p>
                  </div>
                </div>
                <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
                  <div>
                    <p style={s.settingsLabel}>Member since</p>
                    <p style={s.settingsValue}>{new Date(user?.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
              <div style={{ ...s.settingsCard, marginTop: 16 }}>
                <p style={s.settingsSection}>Danger zone</p>
                <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
                  <div>
                    <p style={s.settingsLabel}>Sign out</p>
                    <p style={{ fontSize: 13, color: '#9CA3AF' }}>You will be signed out of this device.</p>
                  </div>
                  <button style={{ ...s.openBtn, background: 'none', color: '#DC2626', border: '1px solid #FECACA' }} onClick={onLogout}>Log out</button>
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
                <div style={{ display: 'flex', gap: 16, padding: '0 0 4px' }}>
                  <a href="/privacy.html" style={{ fontSize: 13, color: BLUE }}>Privacy Policy</a>
                  <a href="/terms.html" style={{ fontSize: 13, color: BLUE }}>Terms of Service</a>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: WH, borderRadius: 16, padding: '32px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>🗑</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: BL, marginBottom: 8 }}>Delete this {confirmDelete.type}?</h3>
            <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: BL }}>{confirmDelete.name}</strong> will be permanently deleted.
            </p>
            <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 24 }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: '11px', background: '#DC2626', color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={executeDelete}>Yes, delete it</button>
              <button style={{ flex: 1, padding: '11px', background: 'none', color: '#6B7280', border: `1px solid ${RULE}`, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewingDoc && (
        <DocViewerModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onUpdate={(updated) => {
            setViewingDoc(updated);
            setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
          }}
        />
      )}
    </div>
  );
}

function DocRow({ doc, type, typeBg, typeColor, onOpen, onDownload }) {
  return (
    <div style={s.docRow}>
      <div style={s.docRowLeft}>
        <span style={{ ...s.docTypeBadge, background: typeBg, color: typeColor }}>{type}</span>
        <p style={s.docRowTitle}>{doc.title}</p>
        <p style={s.docRowDate}>{new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
      <div style={s.docRowActions}>
        <button style={s.openBtn} onClick={onOpen}>Open</button>
        <button style={{ ...s.openBtn, background: WH, color: BLUE, border: `1px solid ${BLUE}` }} onClick={onDownload}>Download</button>
      </div>
    </div>
  );
}

function downloadDoc(doc) {
  const blob = new Blob([doc.content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/\s+/g, '_')}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function ProjectCard({ p, onOpen, onDelete, isCampaign }) {
  const end = p.timeline?.end ? new Date(p.timeline.end) : null;
  const today = new Date();
  const daysLeft = end ? Math.ceil((end - today) / 86400000) : null;
  const openRisks = (p.risks || []).filter(r => r.status === 'open').length;
  const doneMilestones = (p.milestones || []).filter(m => m.status === 'done').length;
  const totalMilestones = (p.milestones || []).length;

  return (
    <div style={s.projectCard}>
      <div style={s.projectBadges}>
        <span style={{ ...s.industryBadge, background: isCampaign ? '#FFF7ED' : '#EFF6FF', color: isCampaign ? '#C2410C' : BLUE }}>
          {isCampaign ? 'Campaign' : p.industry}
        </span>
        <span style={s.methodBadge}>{
          p.methodology === 'Agile' ? 'Flexible approach' :
          p.methodology === 'Predictive' ? 'Structured approach' :
          p.methodology === 'Hybrid' ? 'Mixed approach' :
          p.methodology || 'Mixed approach'
        }</span>
      </div>
      <p style={s.projectName}>{p.name}</p>
      <p style={s.projectDesc}>{p.description}</p>
      <div style={s.projectStats}>
        <div style={s.stat}><span style={s.statNum2}>{doneMilestones}/{totalMilestones}</span><span style={s.statLabel2}>Milestones</span></div>
        <div style={s.statDivider} />
        <div style={s.stat}><span style={{ ...s.statNum2, color: openRisks > 0 ? '#DC2626' : '#15803D' }}>{openRisks}</span><span style={s.statLabel2}>Risks</span></div>
        <div style={s.statDivider} />
        <div style={s.stat}><span style={{ ...s.statNum2, color: daysLeft !== null && daysLeft < 7 ? '#DC2626' : BL }}>{daysLeft !== null ? `${daysLeft}d` : 'N/A'}</span><span style={s.statLabel2}>Left</span></div>
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
  const [updateInput, setUpdateInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const updateDoc = async () => {
    if (!updateInput.trim()) return;
    setUpdating(true);
    const prompt = `You are editing a professional document. The user has a specific change request.\n\nCURRENT DOCUMENT:\n${content}\n\nUSER'S REQUEST: "${updateInput}"\n\nReturn the COMPLETE document in HTML with your changes applied. No html/head/body tags. No markdown.`;
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, mode: 'document' }) });
      const result = await res.json();
      const updated = (result.result || '').replace(/```html|```/g, '').trim();
      if (updated && updated.length > 100) {
        setContent(updated);
        await supabase.from('documents').update({ content: updated, updated_at: new Date().toISOString() }).eq('id', doc.id);
        onUpdate({ ...doc, content: updated });
        setUpdateInput('');
        setUpdateMsg('Updated.');
      }
    } catch { setUpdateMsg('Something went wrong. Try again.'); }
    setUpdating(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: WH, borderRadius: 16, width: '100%', maxWidth: 800, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: `1px solid ${RULE}` }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Quick Doc</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: BL }}>{doc.title}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '7px 16px', background: WH, color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadDoc({ ...doc, content })}>Download</button>
            <button style={{ padding: '7px 16px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={onClose}>Close</button>
          </div>
        </div>
        <div style={{ padding: '14px 28px', borderBottom: `1px solid ${RULE}`, background: GREY }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input style={{ flex: 1, border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: WH }} placeholder="Want to change something? e.g. Add a budget section..." value={updateInput} onChange={e => setUpdateInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateDoc()} />
            <button style={{ padding: '10px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !updateInput.trim() || updating ? 0.5 : 1 }} onClick={updateDoc} disabled={!updateInput.trim() || updating}>{updating ? 'Updating...' : 'Update'}</button>
          </div>
          {updateMsg && <p style={{ fontSize: 12, color: '#15803D', marginTop: 6 }}>{updateMsg}</p>}
        </div>
        <div style={{ padding: '32px 40px', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', maxHeight: '65vh', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}

const s = {
  shell: { display: 'flex', minHeight: '100vh', background: GREY, fontFamily: "'DM Sans', system-ui, sans-serif" },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 },
  sidebar: { width: SIDEBAR_W, flexShrink: 0, background: WH, borderRight: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50, transition: 'transform 0.25s ease' },
  sidebarTop: { padding: '20px 16px 16px' },
  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 },
  brandDot: { width: 8, height: 8, borderRadius: '50%', background: BLUE },
  brandName: { fontSize: 15, fontWeight: 800, color: BL, letterSpacing: '-0.3px' },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: GREY, borderRadius: 10, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 700, color: BL, marginBottom: 1 },
  userEmail: { fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 },
  nav: { flex: 1, padding: '8px 8px', overflowY: 'auto' },
  navItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left', marginBottom: 2, transition: 'all 0.15s' },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
  navBadge: { marginLeft: 'auto', fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '1px 7px', borderRadius: 100 },
  sidebarBottom: { padding: '12px 16px 20px' },
  progressMini: { background: GREY, borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
  miniBar: { height: 4, background: RULE, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.4s' },
  logoutBtn: { width: '100%', padding: '9px', background: 'none', border: `1px solid ${RULE}`, borderRadius: 8, fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' },
  main: { flex: 1, marginLeft: SIDEBAR_W, minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'margin-left 0.25s' },
  topBar: { position: 'sticky', top: 0, background: WH, borderBottom: `1px solid ${RULE}`, padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 30 },
  menuBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', fontFamily: 'inherit' },
  topActions: { display: 'flex', alignItems: 'center', gap: 10 },
  installChip: { display: 'flex', alignItems: 'center', gap: 4, background: BL, borderRadius: 8, padding: '4px 4px 4px 12px' },
  installChipBtn: { background: 'none', border: 'none', color: WH, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  installDismiss: { background: 'none', border: 'none', color: '#6B7280', fontSize: 14, cursor: 'pointer', padding: '0 6px', fontFamily: 'inherit' },
  newBtn: { padding: '8px 16px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  content: { padding: '32px 28px 80px', maxWidth: 1000, width: '100%' },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: BL, letterSpacing: '-0.5px', marginBottom: 4 },
  pageSub: { fontSize: 14, color: '#9CA3AF' },
  primaryBtn: { padding: '9px 18px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  checklistCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 16, padding: '24px', marginBottom: 28 },
  checklistHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  checklistTitle: { fontSize: 16, fontWeight: 700, color: BL, marginBottom: 4 },
  checklistSub: { fontSize: 13, color: '#6B7280' },
  checklistProgress: { flexShrink: 0 },
  checklistCount: { fontSize: 24, fontWeight: 800, color: BLUE, letterSpacing: '-0.5px' },
  checklistBar: { height: 4, background: RULE, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  checklistBarFill: { height: '100%', background: BLUE, borderRadius: 2, transition: 'width 0.4s' },
  checklistItems: { display: 'flex', flexDirection: 'column', gap: 0 },
  checklistItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${GREY}` },
  checkBox: { width: 20, height: 20, borderRadius: 6, border: `2px solid`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  checkLabel: { fontSize: 14, fontWeight: 500 },
  checkHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  checkAction: { padding: '5px 12px', background: '#EFF6FF', color: BLUE, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 },
  statCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 12, padding: '16px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s' },
  statNum: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 28 },
  seeAll: { background: 'none', border: 'none', color: BLUE, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 8 },
  quickCard: { display: 'flex', alignItems: 'center', gap: 12, background: WH, border: `1px solid ${RULE}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s' },
  quickIcon: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  quickLabel: { fontSize: 13, fontWeight: 700, color: BL, marginBottom: 2 },
  quickSub: { fontSize: 12, color: '#9CA3AF' },
  projectsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  projectCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 12, padding: '20px' },
  projectBadges: { display: 'flex', gap: 6, marginBottom: 12 },
  industryBadge: { fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 9px', borderRadius: 100 },
  methodBadge: { fontSize: 10, fontWeight: 700, background: GREY, color: '#6B7280', padding: '3px 9px', borderRadius: 100 },
  projectName: { fontSize: 15, fontWeight: 700, color: BL, marginBottom: 4 },
  projectDesc: { fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  projectStats: { display: 'flex', marginBottom: 16, border: `1px solid ${RULE}`, borderRadius: 8, overflow: 'hidden' },
  stat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 8px', gap: 3 },
  statNum2: { fontSize: 16, fontWeight: 700, color: BL },
  statLabel2: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statDivider: { width: 1, background: RULE, flexShrink: 0 },
  cardActions: { display: 'flex', gap: 8 },
  openBtn: { padding: '7px 16px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { padding: '7px 14px', background: 'none', color: '#9CA3AF', border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  emptyState: { padding: '60px 0', textAlign: 'center', maxWidth: 400 },
  emptyIcon: { fontSize: 32, marginBottom: 16, color: '#D1D5DB' },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: BL, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 24 },
  emptyText: { color: '#9CA3AF', fontSize: 14, padding: '24px 0' },
  validationsGrid: { display: 'flex', flexDirection: 'column', gap: 0 },
  validationRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: `1px solid ${RULE}`, gap: 20, flexWrap: 'wrap' },
  validationLeft: { flex: 1, minWidth: 200 },
  validationMeta: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  modeBadge: { fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 9px', borderRadius: 100 },
  validationDate: { fontSize: 12, color: '#9CA3AF' },
  validationTitle: { fontSize: 15, fontWeight: 600, color: BL, marginBottom: 4 },
  validationRight: { display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  scoreRing: { display: 'flex', alignItems: 'baseline', gap: 3 },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${RULE}`, gap: 16, flexWrap: 'wrap' },
  docRowLeft: { flex: 1 },
  docTypeBadge: { fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, display: 'inline-block', marginBottom: 4 },
  docRowTitle: { fontSize: 14, fontWeight: 600, color: BL, marginBottom: 2 },
  docRowDate: { fontSize: 12, color: '#9CA3AF' },
  docRowActions: { display: 'flex', gap: 8 },
  settingsCard: { background: WH, border: `1px solid ${RULE}`, borderRadius: 12, overflow: 'hidden' },
  settingsSection: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 20px', borderBottom: `1px solid ${RULE}`, background: GREY },
  settingsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${RULE}` },
  settingsLabel: { fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 4 },
  settingsValue: { fontSize: 14, color: BL, fontWeight: 500 },
};
