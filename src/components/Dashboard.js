import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';
const RULE = '#E5E7EB';

const TABS = ['Projects', 'Campaigns', 'Quick Docs', 'Validations'];

export default function Dashboard({ user, onOpenValidation, onOpenProject, onNewValidation, onNewProject, onNewCampaign, onNewQuickDoc, onLogout }) {
  const [validations, setValidations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [invitedProjects, setInvitedProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Projects');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Capture the PWA install prompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Only show banner if not already installed
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      if (!isInstalled) {
        const dismissed = localStorage.getItem('pmbuddy_install_dismissed');
        if (!dismissed) setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pmbuddy_install_dismissed', '1');
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

  const deleteValidation = async (id) => { await supabase.from('projects').delete().eq('id', id); setValidations(validations.filter(p => p.id !== id)); };
  const deleteProject = async (id) => { await supabase.from('pm_projects').delete().eq('id', id); setProjects(projects.filter(p => p.id !== id)); };
  const deleteCampaign = async (id) => { await supabase.from('pm_projects').delete().eq('id', id); setCampaigns(campaigns.filter(p => p.id !== id)); };

  const quickDocs = documents.filter(d => d.type === 'quick' || !d.project_id);
  const projectDocs = documents.filter(d => d.type !== 'quick' && d.project_id);

  const handleNewCampaign = () => {
    onNewCampaign({ onSaved: () => { fetchAll(); setActiveTab('Campaigns'); } });
  };

  return (
    <>
    <div style={s.page}>
      <div style={s.wrap}>

        {/* INSTALL BANNER */}
        {showInstallBanner && (
          <div style={s.installBanner}>
            <div style={s.installLeft}>
              <div style={s.installIcon}>⬇</div>
              <div>
                <p style={s.installTitle}>Install PM Buddy</p>
                <p style={s.installSub}>Add to your home screen for faster access</p>
              </div>
            </div>
            <div style={s.installActions}>
              <button style={s.installBtn} onClick={handleInstall}>Install</button>
              <button style={s.installDismiss} onClick={handleDismissInstall}>✕</button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={s.header}>
          <div>
            <p style={s.greeting}>{greeting}, {firstName}.</p>
            <h1 style={s.title}>Your Dashboard</h1>
          </div>
          <button style={s.logoutBtn} onClick={onLogout}>Log out</button>
        </div>

        {/* QUICK ACTIONS */}
        <div style={s.quickSection}>
          <div style={s.quickGrid}>
            {[
              { icon: '◈', label: 'New Project', action: onNewProject, bg: BL, color: WH },
              { icon: '◈', label: 'New Campaign', action: handleNewCampaign, bg: '#EFF6FF', color: BLUE },
              { icon: '✦', label: 'New Validation', action: onNewValidation, bg: '#F0FDF4', color: '#15803D' },
              { icon: '✎', label: 'Quick Doc', action: onNewQuickDoc, bg: '#FFF7ED', color: '#C2410C' },
              { icon: '◎', label: 'Book a Consultant', action: null, bg: '#F3F4F6', color: '#9CA3AF', soon: true },
            ].map((item, i) => (
              <button key={i} style={{ ...s.quickCard, cursor: item.action ? 'pointer' : 'default', opacity: item.action ? 1 : 0.5 }} onClick={item.action || undefined} disabled={!item.action}>
                <div style={{ ...s.quickIcon, background: item.bg, color: item.color }}>{item.icon}</div>
                <div style={s.quickLabel}>
                  {item.label}
                  {item.soon && <span style={s.comingSoon}>Soon</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* TABS */}
        <div style={s.tabBar}>
          {TABS.map(tab => (
            <button
              key={tab}
              style={{
                ...s.tabBtn,
                color: activeTab === tab ? BLUE : '#6B7280',
                borderBottomColor: activeTab === tab ? BLUE : 'transparent',
                fontWeight: activeTab === tab ? 700 : 500,
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'Projects' && projects.length > 0 && <span style={s.tabCount}>{projects.length}</span>}
              {tab === 'Campaigns' && campaigns.length > 0 && <span style={s.tabCount}>{campaigns.length}</span>}
              {tab === 'Quick Docs' && quickDocs.length > 0 && <span style={s.tabCount}>{quickDocs.length}</span>}
              {tab === 'Validations' && validations.length > 0 && <span style={s.tabCount}>{validations.length}</span>}
            </button>
          ))}
        </div>

        {/* PROJECTS TAB */}
        {activeTab === 'Projects' && (
          <div style={s.section}>
            <div style={s.sectionHead}>
              <p style={s.sectionLabel}>My Projects</p>
              <button style={s.newBtn} onClick={onNewProject}>New project</button>
            </div>
            {loading && <p style={s.emptyText}>Loading...</p>}
            {!loading && projects.length === 0 && (
              <div style={s.emptyState}>
                <p style={s.emptyTitle}>No projects yet.</p>
                <p style={s.emptyBody}>Create your first project and PM Buddy will set it up with risks, milestones, team roles and a communication plan.</p>
                <button style={s.primaryBtn} onClick={onNewProject}>Create your first project</button>
              </div>
            )}
            {!loading && projects.length > 0 && (
              <div style={s.projectsGrid}>
                {projects.map(p => <ProjectCard key={p.id} p={p} onOpen={() => onOpenProject(p)} onDelete={() => deleteProject(p.id)} />)}
              </div>
            )}
            {!loading && invitedProjects.length > 0 && (
              <>
                <div style={{ ...s.sectionHead, marginTop: 32 }}>
                  <p style={s.sectionLabel}>Projects I Was Invited To</p>
                </div>
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

        {/* CAMPAIGNS TAB */}
        {activeTab === 'Campaigns' && (
          <div style={s.section}>
            <div style={s.sectionHead}>
              <p style={s.sectionLabel}>My Campaigns</p>
              <button style={s.newBtn} onClick={handleNewCampaign}>New campaign</button>
            </div>
            {loading && <p style={s.emptyText}>Loading...</p>}
            {!loading && campaigns.length === 0 && (
              <div style={s.emptyState}>
                <p style={s.emptyTitle}>No campaigns yet.</p>
                <p style={s.emptyBody}>Campaigns are short-term projects, initiatives, events or focused efforts — solo or with others. Create one to get a structured plan with milestones and an AI review.</p>
                <button style={s.primaryBtn} onClick={handleNewCampaign}>Start a campaign</button>
              </div>
            )}
            {!loading && campaigns.length > 0 && (
              <div style={s.projectsGrid}>
                {campaigns.map(p => (
                  <ProjectCard key={p.id} p={p} onOpen={() => onOpenProject(p)} onDelete={() => deleteCampaign(p.id)} isCampaign />
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUICK DOCS TAB */}
        {activeTab === 'Quick Docs' && (
          <div style={s.section}>
            <div style={s.sectionHead}>
              <p style={s.sectionLabel}>My Documents</p>
              <button style={s.newBtn} onClick={onNewQuickDoc}>New doc</button>
            </div>
            {loading && <p style={s.emptyText}>Loading...</p>}
            {!loading && documents.length === 0 && (
              <div style={s.emptyState}>
                <p style={s.emptyTitle}>No documents yet.</p>
                <p style={s.emptyBody}>Use Quick Doc to create concept notes, session plans, proposals and more in minutes.</p>
                <button style={s.primaryBtn} onClick={onNewQuickDoc}>Create a document</button>
              </div>
            )}
            {!loading && quickDocs.length > 0 && (
              <>
                <p style={{ ...s.sectionLabel, marginBottom: 12 }}>Quick Docs</p>
                {quickDocs.map(doc => (
                  <div key={doc.id} style={s.docRow}>
                    <div style={s.docRowLeft}>
                      <span style={{ ...s.docTypeBadge, background: '#FFF7ED', color: '#C2410C' }}>Quick Doc</span>
                      <p style={s.docRowTitle}>{doc.title}</p>
                      <p style={s.docRowDate}>{new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div style={s.docRowActions}>
                      <button style={s.openBtn} onClick={() => setViewingDoc(doc)}>Open</button>
                      <button style={{ ...s.openBtn, background: WH, color: BLUE, border: `1px solid ${BLUE}` }} onClick={() => downloadDoc(doc)}>Download</button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {!loading && projectDocs.length > 0 && (
              <>
                <p style={{ ...s.sectionLabel, marginTop: 24, marginBottom: 12 }}>Project Documents</p>
                {projectDocs.map(doc => (
                  <div key={doc.id} style={s.docRow}>
                    <div style={s.docRowLeft}>
                      <span style={{ ...s.docTypeBadge, background: '#EFF6FF', color: BLUE }}>Internal</span>
                      <p style={s.docRowTitle}>{doc.title}</p>
                      <p style={s.docRowDate}>{new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div style={s.docRowActions}>
                      <button style={s.openBtn} onClick={() => {
                        const project = [...projects, ...campaigns].find(p => p.id === doc.project_id);
                        if (project) onOpenProject({ ...project, _openDoc: doc });
                        else setViewingDoc(doc);
                      }}>Open</button>
                      <button style={{ ...s.openBtn, background: WH, color: BLUE, border: `1px solid ${BLUE}` }} onClick={() => downloadDoc(doc)}>Download</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* VALIDATIONS TAB */}
        {activeTab === 'Validations' && (
          <div style={s.section}>
            <div style={s.sectionHead}>
              <p style={s.sectionLabel}>My Validations</p>
              <button style={s.newBtn} onClick={onNewValidation}>New validation</button>
            </div>
            {loading && <p style={s.emptyText}>Loading...</p>}
            {!loading && validations.length === 0 && (
              <div style={s.emptyState}>
                <p style={s.emptyTitle}>No validations yet.</p>
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
                      <p style={{ ...s.validationVerdict, color: v.analysis?.color }}>{v.analysis?.verdict}</p>
                    </div>
                    <div style={s.validationRight}>
                      <div style={s.scoreRing}>
                        <span style={{ ...s.scoreNum, color: v.analysis?.color }}>{v.analysis?.score}</span>
                        <span style={s.scoreLabel}>/ 100</span>
                      </div>
                      <div style={s.validationActions}>
                        <button style={s.openBtn} onClick={() => onOpenValidation(v)}>Open</button>
                        <button style={s.deleteBtn} onClick={() => deleteValidation(v.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>

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
    </>
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
        <span style={s.methodBadge}>{p.methodology}</span>
      </div>
      <p style={s.projectName}>{p.name}</p>
      <p style={s.projectDesc}>{p.description}</p>
      <div style={s.projectStats}>
        <div style={s.stat}>
          <span style={s.statNum}>{doneMilestones}/{totalMilestones}</span>
          <span style={s.statLabel}>Milestones</span>
        </div>
        <div style={s.statDivider} />
        <div style={s.stat}>
          <span style={{ ...s.statNum, color: openRisks > 0 ? '#DC2626' : '#15803D' }}>{openRisks}</span>
          <span style={s.statLabel}>Risks</span>
        </div>
        <div style={s.statDivider} />
        <div style={s.stat}>
          <span style={{ ...s.statNum, color: daysLeft !== null && daysLeft < 7 ? '#DC2626' : BL }}>
            {daysLeft !== null ? `${daysLeft}d` : 'N/A'}
          </span>
          <span style={s.statLabel}>Days Left</span>
        </div>
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
    setUpdateMsg('');
    const prompt = `You are editing a professional document. The user has a specific change request.

CURRENT DOCUMENT:
${content}

USER'S REQUEST: "${updateInput}"

INSTRUCTIONS:
- Make ONLY the changes the user asked for. Do not rewrite sections they did not mention.
- If they ask to add something, add it in the right place.
- If they explicitly ask to rewrite the whole document, rewrite everything.
- Return the COMPLETE document in HTML with your changes applied (h1, h2, p, ul/li). No html/head/body tags. No markdown.`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode: 'document' }),
      });
      const result = await res.json();
      const updated = (result.result || '').replace(/```html|```/g, '').trim();
      if (updated && updated.length > 100) {
        setContent(updated);
        await supabase.from('documents').update({ content: updated, updated_at: new Date().toISOString() }).eq('id', doc.id);
        onUpdate({ ...doc, content: updated });
        setUpdateInput('');
        setUpdateMsg('Updated.');
      }
    } catch (err) {
      setUpdateMsg('Something went wrong. Try again.');
    }
    setUpdating(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: WH, borderRadius: 16, width: '100%', maxWidth: 800, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Quick Doc</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: BL }}>{doc.title}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '7px 16px', background: WH, color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadDoc({ ...doc, content })}>Download</button>
            <button style={{ padding: '7px 16px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={onClose}>Close</button>
          </div>
        </div>
        <div style={{ padding: '14px 28px', borderBottom: '1px solid #E5E7EB', background: GREY }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: WH }}
              placeholder="Want to change something? e.g. Add a budget section, make it shorter..."
              value={updateInput}
              onChange={e => setUpdateInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && updateDoc()}
            />
            <button
              style={{ padding: '10px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !updateInput.trim() || updating ? 0.5 : 1, whiteSpace: 'nowrap' }}
              onClick={updateDoc}
              disabled={!updateInput.trim() || updating}
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>
          {updateMsg && <p style={{ fontSize: 12, color: '#15803D', marginTop: 6 }}>{updateMsg}</p>}
        </div>
        <div
          style={{ padding: '32px 40px', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', maxHeight: '65vh', overflowY: 'auto' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: WH, padding: '40px 48px 80px', fontFamily: "'DM Sans', system-ui, sans-serif" },
  wrap: { maxWidth: 1000, margin: '0 auto' },
  installBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BL, borderRadius: 12, padding: '14px 18px', marginBottom: 20, gap: 12, flexWrap: 'wrap' },
  installLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  installIcon: { width: 36, height: 36, borderRadius: 8, background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  installTitle: { fontSize: 14, fontWeight: 700, color: WH, marginBottom: 2 },
  installSub: { fontSize: 12, color: '#9CA3AF' },
  installActions: { display: 'flex', gap: 8, alignItems: 'center' },
  installBtn: { padding: '8px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  installDismiss: { background: 'none', border: 'none', color: '#6B7280', fontSize: 16, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  greeting: { fontSize: 13, color: '#9CA3AF', fontWeight: 400, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: 500, color: BL, letterSpacing: '-0.8px' },
  logoutBtn: { padding: '8px 16px', background: 'none', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  quickSection: { marginBottom: 28 },
  quickGrid: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  quickCard: { display: 'flex', alignItems: 'center', gap: 10, background: WH, border: `1px solid ${RULE}`, borderRadius: 10, padding: '12px 16px', fontFamily: 'inherit', textAlign: 'left' },
  quickIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  quickLabel: { fontSize: 13, fontWeight: 600, color: BL, display: 'flex', alignItems: 'center', gap: 6 },
  comingSoon: { fontSize: 10, fontWeight: 600, color: BLUE, background: '#EFF6FF', padding: '2px 7px', borderRadius: 100 },
  tabBar: { display: 'flex', borderBottom: `1.5px solid ${RULE}`, marginBottom: 24, overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  tabBtn: { padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  tabCount: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '1px 6px', borderRadius: 100 },
  section: { marginBottom: 36 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.14em' },
  newBtn: { padding: '6px 14px', background: 'none', color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  primaryBtn: { padding: '10px 20px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  emptyState: { padding: '40px 0' },
  emptyTitle: { fontSize: 16, fontWeight: 500, color: BL, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#9CA3AF', marginBottom: 20, lineHeight: 1.7, maxWidth: 420 },
  emptyText: { color: '#9CA3AF', fontSize: 14, padding: '24px 0' },
  projectsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  projectCard: { border: `1px solid ${RULE}`, borderRadius: 10, padding: '20px' },
  projectBadges: { display: 'flex', gap: 6, marginBottom: 12 },
  industryBadge: { fontSize: 10, fontWeight: 600, background: '#EFF6FF', color: BLUE, padding: '3px 9px', borderRadius: 100 },
  methodBadge: { fontSize: 10, fontWeight: 600, background: GREY, color: '#6B7280', padding: '3px 9px', borderRadius: 100 },
  projectName: { fontSize: 15, fontWeight: 600, color: BL, marginBottom: 4 },
  projectDesc: { fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  projectStats: { display: 'flex', marginBottom: 16, border: `1px solid ${RULE}`, borderRadius: 8, overflow: 'hidden' },
  stat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 8px', gap: 3 },
  statNum: { fontSize: 16, fontWeight: 600, color: BL },
  statLabel: { fontSize: 10, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statDivider: { width: 1, background: RULE, flexShrink: 0 },
  cardActions: { display: 'flex', gap: 8 },
  openBtn: { padding: '7px 16px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { padding: '7px 14px', background: 'none', color: '#9CA3AF', border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  validationsGrid: { display: 'flex', flexDirection: 'column', gap: 0 },
  validationRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: `1px solid ${RULE}`, gap: 20, flexWrap: 'wrap' },
  validationLeft: { flex: 1, minWidth: 200 },
  validationMeta: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  modeBadge: { fontSize: 10, fontWeight: 600, background: '#EFF6FF', color: BLUE, padding: '3px 9px', borderRadius: 100 },
  validationDate: { fontSize: 12, color: '#9CA3AF' },
  validationTitle: { fontSize: 15, fontWeight: 500, color: BL, marginBottom: 4 },
  validationVerdict: { fontSize: 12, fontWeight: 600 },
  validationRight: { display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  scoreRing: { display: 'flex', alignItems: 'baseline', gap: 3 },
  scoreNum: { fontSize: 28, fontWeight: 600, letterSpacing: '-1px', lineHeight: 1 },
  scoreLabel: { fontSize: 12, color: '#9CA3AF' },
  validationActions: { display: 'flex', gap: 8 },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${RULE}`, gap: 16, flexWrap: 'wrap' },
  docRowLeft: { flex: 1 },
  docTypeBadge: { fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 100, display: 'inline-block', marginBottom: 4 },
  docRowTitle: { fontSize: 14, fontWeight: 500, color: BL, marginBottom: 2 },
  docRowDate: { fontSize: 12, color: '#9CA3AF' },
  docRowActions: { display: 'flex', gap: 8 },
};
