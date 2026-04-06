import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

export default function Dashboard({ user, onOpenValidation, onOpenProject, onNewValidation, onNewProject, onLogout }) {
  const [validations, setValidations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: v }, { data: p }] = await Promise.all([
      supabase.from('projects').select('*').order('updated_at', { ascending: false }),
      supabase.from('pm_projects').select('*').order('updated_at', { ascending: false }),
    ]);
    setValidations(v || []);
    setProjects(p || []);
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
    <div style={s.page}>
      <div style={s.wrap}>

        <div style={s.header}>
          <div>
            <p style={s.greeting}>{greeting}, {firstName}.</p>
            <h1 style={s.title}>Your Dashboard</h1>
          </div>
          <button style={s.logoutBtn} onClick={onLogout}>Log Out</button>
        </div>

        {/* QUICK ACTIONS */}
        <div style={s.quickSection}>
          <p style={s.sectionLabel}>Quick Actions</p>
          <div style={s.quickGrid}>
            <button style={s.quickCard} onClick={onNewProject}>
              <div style={s.quickIcon}>◈</div>
              <div>
                <p style={s.quickTitle}>New Project</p>
                <p style={s.quickBody}>Set up a full PM project with risks, milestones and team roles.</p>
              </div>
            </button>
            <button style={s.quickCard} onClick={onNewValidation}>
              <div style={{ ...s.quickIcon, background: '#EFF6FF', color: BLUE }}>✦</div>
              <div>
                <p style={s.quickTitle}>New Validation</p>
                <p style={s.quickBody}>Check if your idea is worth building before you start.</p>
              </div>
            </button>
            <div style={{ ...s.quickCard, opacity: 0.5, cursor: 'default' }}>
              <div style={{ ...s.quickIcon, background: '#F3F4F6', color: '#9CA3AF' }}>◎</div>
              <div>
                <p style={s.quickTitle}>Book a Consultant <span style={s.comingSoon}>Soon</span></p>
                <p style={s.quickBody}>Get expert PM support directly from your dashboard.</p>
              </div>
            </div>
          </div>
        </div>

        {/* PM PROJECTS */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <p style={s.sectionLabel}>My Projects</p>
            {projects.length > 0 && <button style={s.newBtn} onClick={onNewProject}>New Project</button>}
          </div>

          {loading && <p style={s.emptyText}>Loading...</p>}

          {!loading && projects.length === 0 && (
            <div style={s.emptyCard}>
              <p style={s.emptyTitle}>No Projects Yet</p>
              <p style={s.emptyBody}>Create your first project and PM Buddy will help you set it up with risks, milestones, team roles and a communication plan.</p>
              <button style={s.primaryBtn} onClick={onNewProject}>Create Your First Project</button>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div style={s.projectsGrid}>
              {projects.map(p => {
                const end = p.timeline?.end ? new Date(p.timeline.end) : null;
                const today = new Date();
                const daysLeft = end ? Math.ceil((end - today) / (1000 * 60 * 60 * 24)) : null;
                const openRisks = (p.risks || []).filter(r => r.status === 'open').length;
                const doneMilestones = (p.milestones || []).filter(m => m.status === 'done').length;
                const totalMilestones = (p.milestones || []).length;

                return (
                  <div key={p.id} style={s.projectCard}>
                    <div style={s.projectCardTop}>
                      <span style={s.industryBadge}>{p.industry}</span>
                      <span style={s.methodBadge}>{p.methodology}</span>
                    </div>
                    <p style={s.projectTitle}>{p.name}</p>
                    <p style={s.projectDesc}>{p.description}</p>
                    <div style={s.projectStats}>
                      <div style={s.projectStat}>
                        <span style={s.projectStatNum}>{doneMilestones}/{totalMilestones}</span>
                        <span style={s.projectStatLabel}>Milestones</span>
                      </div>
                      <div style={s.projectStat}>
                        <span style={{ ...s.projectStatNum, color: openRisks > 0 ? '#DC2626' : '#15803D' }}>{openRisks}</span>
                        <span style={s.projectStatLabel}>Open Risks</span>
                      </div>
                      <div style={s.projectStat}>
                        <span style={{ ...s.projectStatNum, color: daysLeft !== null && daysLeft < 7 ? '#DC2626' : BL }}>{daysLeft !== null ? `${daysLeft}d` : 'N/A'}</span>
                        <span style={s.projectStatLabel}>Days Left</span>
                      </div>
                    </div>
                    <div style={s.cardBtns}>
                      <button style={s.openBtn} onClick={() => onOpenProject(p)}>Open Project</button>
                      <button style={s.deleteBtn} onClick={() => deleteProject(p.id)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* VALIDATIONS */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <p style={s.sectionLabel}>My Validations</p>
            {validations.length > 0 && <button style={s.newBtn} onClick={onNewValidation}>New Validation</button>}
          </div>

          {!loading && validations.length === 0 && (
            <div style={s.emptyCard}>
              <p style={s.emptyTitle}>No Validations Yet</p>
              <p style={s.emptyBody}>Answer honest questions about your idea and get a report in 10 minutes.</p>
              <button style={s.primaryBtn} onClick={onNewValidation}>Start a Validation</button>
            </div>
          )}

          {!loading && validations.length > 0 && (
            <div style={s.validationsGrid}>
              {validations.map(p => (
                <div key={p.id} style={s.validationCard}>
                  <div style={s.validationCardTop}>
                    <span style={s.modeBadge}>{p.mode === 'hackathon' ? 'Hackathon' : 'Startup'}</span>
                    <span style={s.date}>{new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <p style={s.validationTitle}>{p.title || 'Untitled Validation'}</p>
                  <div style={s.scoreSection}>
                    <span style={{ ...s.scoreNum, color: p.analysis.color }}>{p.analysis.score}</span>
                    <span style={s.scoreOutOf}>/ 100</span>
                    <div style={s.scoreBar}>
                      <div style={{ ...s.scoreBarFill, width: `${p.analysis.score}%`, background: p.analysis.color }} />
                    </div>
                    <p style={{ ...s.verdict, color: p.analysis.color }}>{p.analysis.verdict}</p>
                  </div>
                  <div style={s.cardBtns}>
                    <button style={s.openBtn} onClick={() => onOpenValidation(p)}>Open Report</button>
                    <button style={s.deleteBtn} onClick={() => deleteValidation(p.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '40px 24px 80px' },
  wrap: { maxWidth: 960, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 12 },
  greeting: { fontSize: 14, color: '#6B7280', fontWeight: 500, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: 900, color: BL, letterSpacing: '-0.8px' },
  logoutBtn: { padding: '9px 18px', background: WH, color: BL, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  quickSection: { marginBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  quickCard: { display: 'flex', alignItems: 'flex-start', gap: 14, background: WH, border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '20px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.2s ease' },
  quickIcon: { width: 40, height: 40, borderRadius: 10, background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  quickTitle: { fontSize: 14, fontWeight: 800, color: BL, marginBottom: 4 },
  quickBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },
  comingSoon: { fontSize: 10, fontWeight: 700, color: BLUE, background: '#EFF6FF', padding: '2px 7px', borderRadius: 100, marginLeft: 6 },

  section: { marginBottom: 40 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  newBtn: { padding: '7px 14px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  primaryBtn: { padding: '12px 24px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },

  emptyCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: '40px 32px', textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: 800, color: BL, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 24px' },
  emptyText: { color: '#9CA3AF', fontSize: 14, padding: '24px 0' },

  projectsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  projectCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: '22px' },
  projectCardTop: { display: 'flex', gap: 8, marginBottom: 12 },
  industryBadge: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  methodBadge: { fontSize: 11, fontWeight: 700, background: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: 100 },
  projectTitle: { fontSize: 17, fontWeight: 800, color: BL, marginBottom: 6, letterSpacing: '-0.3px' },
  projectDesc: { fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 16 },
  projectStats: { display: 'flex', gap: 16, marginBottom: 16, background: GREY, borderRadius: 10, padding: '12px 16px' },
  projectStat: { display: 'flex', flexDirection: 'column', gap: 2 },
  projectStatNum: { fontSize: 18, fontWeight: 900, color: BL, letterSpacing: '-0.5px' },
  projectStatLabel: { fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' },

  validationsGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  validationCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 22px' },
  validationCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modeBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#EFF6FF', color: BLUE },
  date: { fontSize: 12, color: '#9CA3AF' },
  validationTitle: { fontSize: 16, fontWeight: 800, color: BL, marginBottom: 12, letterSpacing: '-0.2px' },
  scoreSection: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  scoreNum: { fontSize: 28, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 },
  scoreOutOf: { fontSize: 13, color: '#9CA3AF', fontWeight: 600, marginRight: 8 },
  scoreBar: { flex: 1, height: 4, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden', minWidth: 80 },
  scoreBarFill: { height: '100%', borderRadius: 2 },
  verdict: { fontSize: 12, fontWeight: 700 },
  cardBtns: { display: 'flex', gap: 8 },
  openBtn: { padding: '8px 18px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { padding: '8px 16px', background: WH, color: BL, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
