import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';
const RULE = '#E5E7EB';

export default function Dashboard({ user, onOpenValidation, onOpenProject, onNewValidation, onNewProject, onNewCampaign, onNewQuickDoc, onLogout }) {
  const [validations, setValidations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invitedProjects, setInvitedProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: v }, { data: p }, { data: d }, { data: members }] = await Promise.all([
      supabase.from('projects').select('*').order('updated_at', { ascending: false }),
      supabase.from('pm_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('documents').select('*').order('updated_at', { ascending: false }),
      supabase.from('project_members').select('*').eq('user_id', user.id).eq('status', 'accepted'),
    ]);
    setValidations(v || []);
    setProjects(p || []);
    setDocuments(d || []);
    // Fetch invited projects separately
    if (members && members.length > 0) {
      const ownedIds = new Set((p || []).map(proj => proj.id));
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

  const deleteValidation = async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    setValidations(validations.filter(p => p.id !== id));
  };

  const deleteProject = async (id) => {
    await supabase.from('pm_projects').delete().eq('id', id);
    setProjects(projects.filter(p => p.id !== id));
  };

  return (
    <>
    <div style={s.page}>
      <div style={s.wrap}>

        {/* HEADER */}
        <div style={s.header}>
          <div>
            <p style={s.greeting}>{greeting}, {firstName}.</p>
            <h1 style={s.title}>Your Dashboard</h1>
          </div>
          <button style={s.logoutBtn} onClick={onLogout}>Log out</button>
        </div>

        <div style={s.rule} />

        {/* QUICK ACTIONS */}
        <div style={s.quickSection}>
          <p style={s.sectionLabel}>Quick Actions</p>
          <div style={s.quickGrid}>
            {[
              { icon: '◈', label: 'New Project', body: 'Full PM project with risks, milestones and team roles.', action: onNewProject, bg: BL, color: WH },
              { icon: '◈', label: 'New Campaign', body: 'Short-term partnerships, drives and mini-projects.', action: onNewCampaign, bg: '#EFF6FF', color: BLUE },
              { icon: '✦', label: 'New Validation', body: 'Check if your idea is worth building before you start.', action: onNewValidation, bg: '#F0FDF4', color: '#15803D' },
              { icon: '✎', label: 'Quick Doc', body: 'Create a concept note, session plan or proposal in minutes.', action: onNewQuickDoc, bg: '#FFF7ED', color: '#C2410C' },
              { icon: '◎', label: 'Book a Consultant', body: 'Get expert PM support directly from your dashboard.', action: null, bg: '#F3F4F6', color: '#9CA3AF', soon: true },
            ].map((item, i) => (
              <button key={i} style={{ ...s.quickCard, cursor: item.action ? 'pointer' : 'default', opacity: item.action ? 1 : 0.5 }} onClick={item.action || undefined} disabled={!item.action}>
                <div style={{ ...s.quickIcon, background: item.bg, color: item.color }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={s.quickTitleRow}>
                    <p style={s.quickTitle}>{item.label}</p>
                    {item.soon && <span style={s.comingSoon}>Soon</span>}
                  </div>
                  <p style={s.quickBody}>{item.body}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={s.rule} />

        {/* MY PROJECTS */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <p style={s.sectionLabel}>My Projects</p>
            {projects.length > 0 && <button style={s.newBtn} onClick={onNewProject}>New project</button>}
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
              {projects.map(p => {
                const end = p.timeline?.end ? new Date(p.timeline.end) : null;
                const daysLeft = end ? Math.ceil((end - new Date()) / 86400000) : null;
                const openRisks = (p.risks || []).filter(r => r.status === 'open').length;
                const doneMilestones = (p.milestones || []).filter(m => m.status === 'done').length;
                const totalMilestones = (p.milestones || []).length;
                return (
                  <div key={p.id} style={s.projectCard}>
                    <div style={s.projectBadges}>
                      <span style={s.industryBadge}>{p.industry}</span>
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
                        <span style={s.statLabel}>Open Risks</span>
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
                      <button style={s.openBtn} onClick={() => onOpenProject(p)}>Open project</button>
                      <button style={s.deleteBtn} onClick={() => deleteProject(p.id)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={s.rule} />

        {/* INVITED PROJECTS */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <p style={s.sectionLabel}>Projects I Was Invited To</p>
          </div>

          {!loading && invitedProjects.length === 0 && (
            <div style={s.emptyState}>
              <p style={s.emptyTitle}>No invited projects yet.</p>
              <p style={s.emptyBody}>When someone invites you to collaborate on their project and you accept, it will appear here.</p>
            </div>
          )}

          {!loading && invitedProjects.length > 0 && (
            <div style={s.projectsGrid}>
              {invitedProjects.map(p => {
                const end = p.timeline?.end ? new Date(p.timeline.end) : null;
                const daysLeft = end ? Math.ceil((end - new Date()) / 86400000) : null;
                const doneMilestones = (p.milestones || []).filter(m => m.status === 'done').length;
                const totalMilestones = (p.milestones || []).length;
                return (
                  <div key={p.id} style={{ ...s.projectCard, borderColor: BLUE + '40' }}>
                    <div style={s.projectBadges}>
                      <span style={s.industryBadge}>{p.industry}</span>
                      <span style={{ ...s.methodBadge, background: '#EFF6FF', color: BLUE }}>{p._inviteRole}</span>
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
                        <span style={{ ...s.statNum, color: daysLeft !== null && daysLeft < 7 ? '#DC2626' : BL }}>
                          {daysLeft !== null ? `${daysLeft}d` : 'N/A'}
                        </span>
                        <span style={s.statLabel}>Days Left</span>
                      </div>
                    </div>
                    <div style={s.cardActions}>
                      <button style={s.openBtn} onClick={() => onOpenProject(p)}>Open project</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={s.rule} />

        {/* VALIDATIONS */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <p style={s.sectionLabel}>My Validations</p>
            {validations.length > 0 && <button style={s.newBtn} onClick={onNewValidation}>New validation</button>}
          </div>
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
                    <p style={{ ...s.validationVerdict, color: v.analysis.color }}>{v.analysis.verdict}</p>
                  </div>
                  <div style={s.validationRight}>
                    <div style={s.scoreRing}>
                      <span style={{ ...s.scoreNum, color: v.analysis.color }}>{v.analysis.score}</span>
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

        <div style={s.rule} />

        {/* DOCUMENTS */}
        <div style={s.section}>
          <div style={s.sectionHead}><p style={s.sectionLabel}>My Documents</p></div>
          {!loading && documents.length === 0 && (
            <div style={s.emptyState}>
              <p style={s.emptyTitle}>No documents yet.</p>
              <p style={s.emptyBody}>Open a project and go to the Documents tab to generate and save PM documents.</p>
            </div>
          )}
          {!loading && documents.length > 0 && (() => {
            const grouped = documents.reduce((acc, doc) => {
              const key = doc.project_name || 'Unknown Project';
              if (!acc[key]) acc[key] = [];
              acc[key].push(doc);
              return acc;
            }, {});
            return Object.entries(grouped).map(([projectName, docs]) => (
              <div key={projectName} style={s.docGroup}>
                <p style={s.docGroupLabel}>{projectName}</p>
                {docs.map(doc => (
                  <div key={doc.id} style={s.docRow}>
                    <div style={s.docRowLeft}>
                      <span style={{ ...s.docTypeBadge, background: doc.type === 'pm' ? '#EFF6FF' : doc.type === 'quick' ? '#FFF7ED' : '#F5F3FF', color: doc.type === 'pm' ? BLUE : doc.type === 'quick' ? '#C2410C' : '#7C3AED' }}>
                        {doc.type === 'pm' ? 'Internal' : doc.type === 'quick' ? 'Quick Doc' : 'External'}
                      </span>
                      <p style={s.docRowTitle}>{doc.title}</p>
                      <p style={s.docRowDate}>{new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div style={s.docRowActions}>
                      <button style={s.openBtn} onClick={() => {
                        if (doc.type === 'quick' || !doc.project_id) {
                          setViewingDoc(doc);
                        } else {
                          const project = projects.find(p => p.id === doc.project_id);
                          if (project) onOpenProject({ ...project, _openDoc: doc });
                          else setViewingDoc(doc);
                        }
                      }}>Open</button>
                      <button style={{ ...s.openBtn, background: WH, color: BLUE, border: `1px solid ${BLUE}` }} onClick={() => {
                        const blob = new Blob([doc.content], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${doc.title.replace(/\s+/g, '_')}.html`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}>Download</button>
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>

      </div>
    </div>

    {/* Document Viewer Modal */}
    {viewingDoc && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
        <div style={{ background: WH, borderRadius: 16, width: '100%', maxWidth: 760, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #E5E7EB' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Quick Doc</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: BL }}>{viewingDoc.title}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '7px 16px', background: WH, color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => {
                const blob = new Blob([viewingDoc.content], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${viewingDoc.title.replace(/\s+/g, '_')}.html`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
              }}>Download</button>
              <button style={{ padding: '7px 16px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setViewingDoc(null)}>Close</button>
            </div>
          </div>
          <div style={{ padding: '32px 40px', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', maxHeight: '70vh', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: viewingDoc.content }} />
        </div>
      </div>
    )}
  </>
  );
}

const s = {
  page: { minHeight: '100vh', background: WH, padding: '48px 48px 80px', fontFamily: "'DM Sans', system-ui, sans-serif" },
  wrap: { maxWidth: 1000, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 12 },
  greeting: { fontSize: 13, color: '#9CA3AF', fontWeight: 400, marginBottom: 6, letterSpacing: '0.01em' },
  title: { fontSize: 28, fontWeight: 500, color: BL, letterSpacing: '-0.8px' },
  logoutBtn: { padding: '8px 16px', background: 'none', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  rule: { borderTop: `1px solid ${RULE}`, margin: '0 0 36px' },
  quickSection: { marginBottom: 36 },
  sectionLabel: { fontSize: 11, fontWeight: 500, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 16 },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  quickCard: { display: 'flex', alignItems: 'flex-start', gap: 14, background: WH, border: `1px solid ${RULE}`, borderRadius: 10, padding: '18px', fontFamily: 'inherit', textAlign: 'left', width: '100%' },
  quickIcon: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  quickTitleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  quickTitle: { fontSize: 13, fontWeight: 600, color: BL },
  quickBody: { fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 },
  comingSoon: { fontSize: 10, fontWeight: 600, color: BLUE, background: '#EFF6FF', padding: '2px 7px', borderRadius: 100 },
  section: { marginBottom: 36 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
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
  projectName: { fontSize: 15, fontWeight: 600, color: BL, marginBottom: 4, letterSpacing: '-0.2px' },
  projectDesc: { fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  projectStats: { display: 'flex', gap: 0, marginBottom: 16, border: `1px solid ${RULE}`, borderRadius: 8, overflow: 'hidden' },
  stat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 8px', gap: 3 },
  statNum: { fontSize: 16, fontWeight: 600, color: BL, letterSpacing: '-0.3px' },
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
  validationTitle: { fontSize: 15, fontWeight: 500, color: BL, marginBottom: 4, letterSpacing: '-0.2px' },
  validationVerdict: { fontSize: 12, fontWeight: 600 },
  validationRight: { display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  scoreRing: { display: 'flex', alignItems: 'baseline', gap: 3 },
  scoreNum: { fontSize: 28, fontWeight: 600, letterSpacing: '-1px', lineHeight: 1 },
  scoreLabel: { fontSize: 12, color: '#9CA3AF' },
  validationActions: { display: 'flex', gap: 8 },
  docGroup: { marginBottom: 24 },
  docGroupLabel: { fontSize: 13, fontWeight: 600, color: BL, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${RULE}` },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${RULE}`, gap: 16, flexWrap: 'wrap' },
  docRowLeft: { flex: 1 },
  docTypeBadge: { fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 100, display: 'inline-block', marginBottom: 4 },
  docRowTitle: { fontSize: 14, fontWeight: 500, color: BL, marginBottom: 2 },
  docRowDate: { fontSize: 12, color: '#9CA3AF' },
  docRowActions: { display: 'flex', gap: 8 },
};
