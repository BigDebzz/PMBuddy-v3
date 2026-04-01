import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogoIcon } from '../lib/icons';

export default function AuthScreen({ onAuth, onBack }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handle = async () => {
    setError('');
    setMessage('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    if (mode === 'login') {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      onAuth(data.user);
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      setMessage('Account created. Check your email to confirm, then log in.');
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <LogoIcon size={36} />
          <span style={s.logoText}>PM Buddy</span>
        </div>
        <h1 style={s.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p style={s.sub}>{mode === 'login' ? 'Log in to see your saved projects.' : 'Save your reports and come back anytime.'}</p>
        {error && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}
        <input
          style={s.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={s.input}
          type="password"
          placeholder="Password"
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
  page: { minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 20, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoText: { fontSize: 20, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px' },
  title: { fontSize: 24, fontWeight: 800, color: '#0A0A0A', marginBottom: 6, letterSpacing: '-0.4px' },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  error: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 },
  success: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803D', marginBottom: 16 },
  input: { width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', color: '#111827', outline: 'none' },
  btn: { width: '100%', background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 },
  toggle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  toggleBtn: { background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  backBtn: { width: '100%', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' },
};
