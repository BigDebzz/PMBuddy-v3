import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogoIcon } from '../lib/icons';

const B = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';

export default function AuthScreen({ onAuth, onBack }) {
  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const roles = [
    'Founder', 'Hackathon participant', 'Solo builder',
    'Product manager', 'Student', 'Community builder', 'Other',
  ];

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (err) { setError(err.message); setLoading(false); }
  };

  const handle = async () => {
    setError('');
    setMessage('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    if (mode === 'signup' && !firstName.trim()) { setError('Please enter your first name.'); return; }
    if (mode === 'signup' && !role) { setError('Please select what describes you best.'); return; }
    if (mode === 'signup' && !consent) { setError('Please accept the privacy policy to create an account.'); return; }
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
            consent_given: true,
            consent_date: new Date().toISOString(),
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

        <button style={s.googleBtn} onClick={handleGoogle} disabled={loading}>
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>or continue with email</span>
          <div style={s.dividerLine} />
        </div>

        {mode === 'signup' && (
          <>
            <div style={s.nameRow}>
              <div style={s.nameField}>
                <label style={s.label}>First name</label>
                <input style={s.input} type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div style={s.nameField}>
                <label style={s.label}>Last name</label>
                <input style={s.input} type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            <label style={s.label}>What describes you best?</label>
            <div style={s.roleGrid}>
              {roles.map(r => (
                <button key={r} style={{ ...s.roleBtn, background: role === r ? B : WH, color: role === r ? WH : BL, borderColor: role === r ? B : '#E5E7EB' }} onClick={() => setRole(r)}>
                  {r}
                </button>
              ))}
            </div>
          </>
        )}

        <label style={s.label}>Email address</label>
        <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />

        <label style={s.label}>Password</label>
        <input style={s.input} type="password" placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} />

        {mode === 'signup' && (
          <div style={s.consentWrap}>
            <button
              style={{ ...s.checkbox, borderColor: consent ? B : '#D1D5DB', background: consent ? B : WH }}
              onClick={() => setConsent(p => !p)}
              aria-label="Accept privacy policy"
            >
              {consent && <span style={s.checkmark}>✓</span>}
            </button>
            <p style={s.consentText}>
              I agree to PM Buddy's{' '}
              <a href="#privacy" style={s.consentLink} onClick={e => e.preventDefault()}>Privacy Policy</a>.
              {' '}My data is stored securely and will not be sold or shared with third parties.
              PM Buddy complies with Nigeria's NDPR and global GDPR data protection standards.
            </p>
          </div>
        )}

        <button style={{ ...s.btn, opacity: mode === 'signup' && !consent ? 0.6 : 1 }} onClick={handle} disabled={loading || (mode === 'signup' && !consent)}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        {mode === 'login' && (
          <div style={s.privacyNote}>
            <p style={s.privacyNoteText}>
              PM Buddy is NDPR and GDPR compliant. Your data is stored securely and never sold.
            </p>
          </div>
        )}

        <p style={s.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={s.toggleBtn} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); setConsent(false); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>

        <button style={s.backBtn} onClick={onBack}>Continue without account</button>

        {mode === 'signup' && (
          <div style={s.privacyDetail}>
            <p style={s.privacyDetailTitle}>Your data rights</p>
            <p style={s.privacyDetailText}>
              Under Nigeria's NDPR and the global GDPR, you have the right to access, correct or delete your personal data at any time.
              PM Buddy collects only what is necessary to provide the service. We do not share your data with advertisers.
              To request data deletion, contact us directly.
            </p>
          </div>
        )}
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
  consentWrap: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16, padding: '14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E5E7EB' },
  checkbox: { width: 20, height: 20, borderRadius: 5, border: '2px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' },
  checkmark: { fontSize: 11, color: WH, fontWeight: 800 },
  consentText: { fontSize: 12, color: '#6B7280', lineHeight: 1.65, margin: 0 },
  consentLink: { color: B, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 },
  btn: { width: '100%', background: B, color: WH, border: 'none', borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, marginTop: 4, transition: 'opacity 0.15s' },
  privacyNote: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', marginBottom: 16 },
  privacyNoteText: { fontSize: 12, color: '#1E40AF', lineHeight: 1.6, margin: 0 },
  toggle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  toggleBtn: { background: 'none', border: 'none', color: B, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  backBtn: { width: '100%', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 },
  privacyDetail: { background: '#F8FAFC', borderRadius: 10, padding: '14px', border: '1px solid #E5E7EB', marginTop: 4 },
  privacyDetailTitle: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  privacyDetailText: { fontSize: 12, color: '#6B7280', lineHeight: 1.7, margin: 0 },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: WH, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, color: BL, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, transition: 'background 0.15s' },
  divider: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, background: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap' },
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
