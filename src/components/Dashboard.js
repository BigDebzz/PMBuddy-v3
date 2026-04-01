import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogoIcon } from '../lib/icons';

export default function Dashboard({ user, onOpen, onNew, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const deleteProject = async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    setProjects(projects.filter(p => p.id !== id));
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        <div style={s.header}>
          <div style={s.headerLeft}>
            <LogoIcon size={28} />
            <div>
              <h1 style={s.title}>Your Projects</h1>
              <p style={s.sub}>{user.email}</p>
            </div>
          </div>
          <div style={s.headerBtns}>
            <button style={s.newBtn} onClick={onNew}>New project</button>
            <button style={s.logoutBtn} onClick={onLogout}>Log out</button>
          </div>
        </div>

        {loading && <p style={s.empty}>Loading your projects...</p>}

        {!loading && projects.length === 0 && (
          <div style={s.emptyCard}>
            <p style={s.emptyTitle}>No saved projects yet</p>
            <p style={s.emptySub}>Complete a validation and save your report to see it here.</p>
            <button style={s.newBtn} onClick={onNew}>Start a new project</button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div style={s.grid}>
            {projects.map(p => (
              <div key={p.id} style={s.card}>
                <div style={s.cardTop}>
                  <span style={{ ...s.modeBadge, background: p.mode === 'hackathon' ? '#F5F3FF' : '#EFF6FF', color: p.mode === 'hackathon' ? '#7C3AED' : '#2563EB' }}>
                    {p.mode === 'hackathon' ? 'Hackathon' : 'Startup'}
                  </span>
                  <span style={s.date}>{new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p style={s.cardTitle}>{p.title || 'Untitled project'}</p>
                <div style={s.scoreRow}>
                  <span style={s.scoreLabel}>Validation score</span>
                  <span style={{ ...s.score, color: p.analysis.color }}>{p.analysis.score}/100</span>
                </div>
                <p style={{ ...s.verdict, color: p.analysis.color }}>{p.analysis.verdict}</p>
                <div style={s.cardBtns}>
                  <button style={s.openBtn} onClick={() => onOpen(p)}>Open report</button>
                  <button style={s.deleteBtn} onClick={() => deleteProject(p.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#FAFAFA', padding: '28px 20px 64px' },
  wrap: { maxWidth: 780, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.4px', marginBottom: 2 },
  sub: { fontSize: 13, color: '#9CA3AF' },
  headerBtns: { display: 'flex', gap: 8 },
  newBtn: { padding: '9px 18px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  logoutBtn: { padding: '9px 18px', background: '#FFFFFF', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  empty: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: '48px 0' },
  emptyCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '48px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  emptyTitle: { fontSize: 18, fontWeight: 800, color: '#0A0A0A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modeBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  date: { fontSize: 12, color: '#9CA3AF' },
  cardTitle: { fontSize: 17, fontWeight: 800, color: '#0A0A0A', marginBottom: 10, letterSpacing: '-0.2px' },
  scoreRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  scoreLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  score: { fontSize: 15, fontWeight: 800 },
  verdict: { fontSize: 13, fontWeight: 600, marginBottom: 16 },
  cardBtns: { display: 'flex', gap: 8 },
  openBtn: { padding: '8px 16px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { padding: '8px 16px', background: '#FFFFFF', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
