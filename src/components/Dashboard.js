import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

export default function Dashboard({ user, onOpen, onNew, onLogout }) {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';

  useEffect(() => { fetchValidations(); }, []);

  const fetchValidations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    setValidations(data || []);
    setLoading(false);
  };

  const deleteValidation = async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    setValidations(validations.filter(p => p.id !== id));
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        {/* HEADER */}
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
            <button style={s.quickCard} onClick={onNew}>
              <div style={s.quickIcon}>+</div>
              <div>
                <p style={s.quickTitle}>New Validation</p>
                <p style={s.quickBody}>Check if your idea is worth building before you start.</p>
              </div>
            </button>
            <div style={{ ...s.quickCard, ...s.quickCardDisabled }}>
              <div style={{ ...s.quickIcon, background: '#F3F4F6', color: '#9CA3AF' }}>◈</div>
              <div>
                <p style={s.quickTitle}>New Project <span style={s.comingSoon}>Coming Soon</span></p>
                <p style={s.quickBody}>Set up a full PM project with RACI, risks and milestones.</p>
              </div>
            </div>
            <div style={{ ...s.quickCard, ...s.quickCardDisabled }}>
              <div style={{ ...s.quickIcon, background: '#F3F4F6', color: '#9CA3AF' }}>◎</div>
              <div>
                <p style={s.quickTitle}>Book a Consultant <span style={s.comingSoon}>Coming Soon</span></p>
                <p style={s.quickBody}>Get expert PM support directly from your dashboard.</p>
              </div>
            </div>
          </div>
        </div>

        {/* PM PROJECTS — COMING SOON */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <p style={s.sectionLabel}>My Projects</p>
            <span style={s.comingSoonBadge}>Coming Soon</span>
          </div>
          <div style={s.comingSoonCard}>
            <div style={s.comingSoonIcon}>◈</div>
            <p style={s.comingSoonTitle}>Full Project Management Is Coming</p>
            <p style={s.comingSoonBody}>Set up projects with RACI charts, risk registers, milestone trackers, communication plans and document generation. Everything a PM would do, built for you.</p>
          </div>
        </div>

        {/* VALIDATIONS */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <p style={s.sectionLabel}>My Validations</p>
            {validations.length > 0 && (
              <button style={s.newValidationBtn} onClick={onNew}>New Validation</button>
            )}
          </div>

          {loading && <p style={s.empty}>Loading your validations...</p>}

          {!loading && validations.length === 0 && (
            <div style={s.emptyCard}>
              <p style={s.emptyTitle}>No Validations Yet</p>
              <p style={s.emptyBody}>Answer a few honest questions about your idea and get a report that tells you if it is worth building.</p>
              <button style={s.primaryBtn} onClick={onNew}>Start Your First Validation</button>
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
                    <div style={s.scoreLeft}>
                      <span style={{ ...s.scoreNum, color: p.analysis.color }}>{p.analysis.score}</span>
                      <span style={s.scoreOutOf}>/ 100</span>
                    </div>
                    <div style={s.scoreRight}>
                      <div style={s.scoreBar}>
                        <div style={{ ...s.scoreBarFill, width: `${p.analysis.score}%`, background: p.analysis.color }} />
                      </div>
                      <p style={{ ...s.verdict, color: p.analysis.color }}>{p.analysis.verdict}</p>
                    </div>
                  </div>
                  <div style={s.cardBtns}>
                    <button style={s.openBtn} onClick={() => onOpen(p)}>Open Report</button>
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
  wrap: { maxWidth: 900, margin: '0 auto' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 12 },
  greeting: { fontSize: 14, color: '#6B7280', fontWeight: 500, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: 900, color: BL, letterSpacing: '-0.8px' },
  logoutBtn: { padding: '9px 18px', background: WH, color: BL, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  quickSection: { marginBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  quickCard: { display: 'flex', alignItems: 'flex-start', gap: 16, background: WH, border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '20px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' },
  quickCardDisabled: { opacity: 0.6, cursor: 'default' },
  quickIcon: { width: 40, height: 40, borderRadius: 10, background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 },
  quickTitle: { fontSize: 14, fontWeight: 800, color: BL, marginBottom: 4, letterSpacing: '-0.2px' },
  quickBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },
  comingSoon: { fontSize: 10, fontWeight: 700, color: BLUE, background: '#EFF6FF', padding: '2px 7px', borderRadius: 100, marginLeft: 6, verticalAlign: 'middle' },

  section: { marginBottom: 40 },
  sectionHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  comingSoonBadge: { fontSize: 10, fontWeight: 700, color: BLUE, background: '#EFF6FF', padding: '3px 10px', borderRadius: 100 },
  newValidationBtn: { padding: '7px 14px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' },

  comingSoonCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: '36px', textAlign: 'center' },
  comingSoonIcon: { fontSize: 28, color: BLUE, marginBottom: 14 },
  comingSoonTitle: { fontSize: 17, fontWeight: 800, color: BL, marginBottom: 10, letterSpacing: '-0.3px' },
  comingSoonBody: { fontSize: 14, color: '#6B7280', lineHeight: 1.75, maxWidth: 480, margin: '0 auto' },

  empty: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: '48px 0' },
  emptyCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: '48px 32px', textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 800, color: BL, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.7 },
  primaryBtn: { padding: '12px 24px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },

  validationsGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  validationCard: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: '22px 24px' },
  validationCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modeBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#EFF6FF', color: BLUE },
  date: { fontSize: 12, color: '#9CA3AF' },
  validationTitle: { fontSize: 17, fontWeight: 800, color: BL, marginBottom: 14, letterSpacing: '-0.2px' },
  scoreSection: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  scoreLeft: { display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 },
  scoreNum: { fontSize: 36, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 },
  scoreOutOf: { fontSize: 14, color: '#9CA3AF', fontWeight: 600 },
  scoreRight: { flex: 1 },
  scoreBar: { height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  scoreBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.8s ease' },
  verdict: { fontSize: 13, fontWeight: 700 },
  cardBtns: { display: 'flex', gap: 8 },
  openBtn: { padding: '8px 18px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { padding: '8px 16px', background: WH, color: BL, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
