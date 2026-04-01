import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogoIcon } from '../lib/icons';

const B = '#550000';
const BL = '#0A0A0A';
const WH = '#FFFFFF';

export default function AuthScreen({ onAuth, onBack }) {
  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const roles = [
    'Founder',
    'Hackathon participant',
    'Solo builder',
    'Product manager',
    'Student',
    'Community builder',
    'Other',
  ];

  const handle = async () => {
    setError('');
    setMessage('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    if (mode === 'signup' && !firstName.trim()) { setError('Please enter your first name.'); return; }
    if (mode === 'signup' && !role) { setError('Please select what describes you best.'); return; }
    setLoading(true);

    if (mode === 'login') {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      onAuth(data.user);
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role,
          }
        }
      });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user && data.session) {
        onAuth(data.user);
      } else {
        setMessage('Account created. Check your email to confirm, then log in.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <LogoIcon size={32} />
          <span style={s.logoText}>PM Buddy</span>
        </div>

        {mode === 'login' ? (
          <>
            <h1 style={s.title}>Welcome back</h1>
            <p style={s.sub}>Log in to see your saved projects and reports.</p>
          </>
        ) : (
          <>
            <h1 style={s.title}>Create your account</h1>
            <p style={s.sub}>Save your reports and track your progress as you build.</p>
          </>
        )}

        {error && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}

        {mode === 'signup' && (
          <>
            <div style={s.nameRow}>
              <div style={s.nameField}>
                <label style={s.label}>First name</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div style={s.nameField}>
                <label style={s.label}>Last name</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            <label style={s.label}>What describes you best?</label>
            <div style={s.roleGrid}>
              {roles.map(r => (
                <button
                  key={r}
                  style={{ ...s.roleBtn, background: role === r ? B : WH, color: role === r ? WH : BL, borderColor: role === r ? B : '#E5E7EB' }}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}

        <label style={s.label}>Email address</label>
        <input
          style={s.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label style={s.label}>Password</label>
        <input
          style={s.input}
          type="password"
          placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button style={s.btn} onClick={handle} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <p style={s.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={s.toggleBtn} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>

        <button style={s.backBtn} onClick={onBack}>Continue without account</button>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { background: WH, border: '1px solid #E5E7EB', borderRadius: 20, padding: '40px 36px', maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoText: { fontSize: 18, fontWeight: 800, color: BL, letterSpacing: '-0.3px' },
  title: { fontSize: 24, fontWeight: 800, color: BL, marginBottom: 6, letterSpacing: '-0.4px' },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 },
  error: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 },
  success: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803D', marginBottom: 16 },
  nameRow: { display: 'flex', gap: 12, marginBottom: 4 },
  nameField: { flex: 1 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' },
  input: { width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 16, boxSizing: 'border-box', color: BL, outline: 'none' },
  roleGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  roleBtn: { padding: '8px 14px', border: '1.5px solid', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  btn: { width: '100%', background: B, color: WH, border: 'none', borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, marginTop: 4 },
  toggle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  toggleBtn: { background: 'none', border: 'none', color: B, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  backBtn: { width: '100%', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' },
};
