import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const ROLES = ['viewer', 'editor', 'owner'];
const ROLE_LABELS = { viewer: 'Viewer', editor: 'Editor', owner: 'Owner' };
const ROLE_DESC = {
  viewer: 'Can view the project but not make changes',
  editor: 'Can view and edit all project content',
  owner: 'Full access including inviting and removing members',
};

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function TeamTab({ project, currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteError, setInviteError] = useState('');

  const isOwner = project.user_id === currentUser?.id ||
    members.some(m => m.user_id === currentUser?.id && m.role === 'owner');

  useEffect(() => { fetchMembers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });
    setMembers(data || []);
    setLoading(false);
  };

  const sendInvite = async () => {
    if (!email.trim()) return;
    setInviteError('');
    setInviteMsg('');
    setSending(true);

    const token = generateToken();
    const inviterName = currentUser?.user_metadata?.first_name || currentUser?.email?.split('@')[0] || 'A team member';

    const { error: dbErr } = await supabase.from('project_members').insert({
      project_id: project.id,
      invited_by: currentUser.id,
      email: email.trim().toLowerCase(),
      role,
      status: 'pending',
      token,
    });

    if (dbErr) {
      setInviteError('Could not send invite. This person may already be invited.');
      setSending(false);
      return;
    }

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        role,
        projectId: project.id,
        projectName: project.name,
        inviterName,
        token,
      }),
    });

    setSending(false);

    if (res.ok) {
      setInviteMsg(`Invitation sent to ${email.trim()}`);
      setEmail('');
      fetchMembers();
    } else {
      setInviteError('Email could not be sent but the invite was created. Ask them to check PM Buddy.');
    }
  };

  const removeMember = async (id) => {
    await supabase.from('project_members').delete().eq('id', id);
    fetchMembers();
  };

  const changeRole = async (id, newRole) => {
    await supabase.from('project_members').update({ role: newRole }).eq('id', id);
    fetchMembers();
  };

  const resendInvite = async (member) => {
    const inviterName = currentUser?.user_metadata?.first_name || currentUser?.email?.split('@')[0] || 'A team member';
    await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: member.email,
        role: member.role,
        projectId: project.id,
        projectName: project.name,
        inviterName,
        token: member.token,
      }),
    });
    setInviteMsg(`Invite resent to ${member.email}`);
  };

  return (
    <div>
      <div style={s.head}>
        <h3 style={s.title}>Team Members</h3>
        <p style={s.sub}>Invite people to collaborate on this project. Set their access level before sending.</p>
      </div>

      {/* OWNER */}
      <div style={s.ownerRow}>
        <div style={s.avatar}>{(project.user_id === currentUser?.id ? currentUser?.user_metadata?.first_name || currentUser?.email : 'Owner')[0]?.toUpperCase()}</div>
        <div style={s.memberInfo}>
          <p style={s.memberEmail}>{currentUser?.email || 'Project owner'}</p>
          <p style={s.memberStatus}>Project owner</p>
        </div>
        <span style={{ ...s.roleBadge, background: '#EFF6FF', color: BLUE }}>Owner</span>
      </div>

      {/* MEMBERS */}
      {!loading && members.length > 0 && (
        <div style={s.membersList}>
          {members.map(m => (
            <div key={m.id} style={s.memberRow}>
              <div style={s.avatar}>{m.email[0].toUpperCase()}</div>
              <div style={s.memberInfo}>
                <p style={s.memberEmail}>{m.email}</p>
                <p style={s.memberStatus}>{m.status === 'pending' ? 'Invitation pending' : 'Active'}</p>
              </div>
              <div style={s.memberActions}>
                {isOwner ? (
                  <select
                    style={s.roleSelect}
                    value={m.role}
                    onChange={e => changeRole(m.id, e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                ) : (
                  <span style={s.roleBadge}>{ROLE_LABELS[m.role]}</span>
                )}
                {isOwner && m.status === 'pending' && (
                  <button style={s.smBtn} onClick={() => resendInvite(m)}>Resend</button>
                )}
                {isOwner && (
                  <button style={{ ...s.smBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => removeMember(m.id)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INVITE FORM */}
      {isOwner && (
        <div style={s.inviteCard}>
          <p style={s.inviteTitle}>Invite Someone</p>

          <label style={s.label}>Email address</label>
          <input
            style={s.input}
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendInvite()}
          />

          <label style={s.label}>Role</label>
          <div style={s.roleGrid}>
            {ROLES.map(r => (
              <button
                key={r}
                style={{ ...s.roleBtn, borderColor: role === r ? BLUE : '#E5E7EB', background: role === r ? '#EFF6FF' : WH }}
                onClick={() => setRole(r)}
              >
                <p style={{ ...s.roleName, color: role === r ? BLUE : BL }}>{ROLE_LABELS[r]}</p>
                <p style={s.roleDesc}>{ROLE_DESC[r]}</p>
              </button>
            ))}
          </div>

          {inviteMsg && <p style={s.successMsg}>{inviteMsg}</p>}
          {inviteError && <p style={s.errorMsg}>{inviteError}</p>}

          <button
            style={{ ...s.sendBtn, opacity: !email.trim() || inviting ? 0.6 : 1 }}
            onClick={sendInvite}
            disabled={!email.trim() || inviting}
          >
            {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      )}

      {!isOwner && (
        <div style={s.viewerNote}>
          <p style={s.viewerNoteText}>Only the project owner can invite or remove team members.</p>
        </div>
      )}
    </div>
  );
}

const s = {
  head: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  title: { fontSize: 18, fontWeight: 700, color: BL, marginBottom: 4 },
  sub: { fontSize: 14, color: '#6B7280', lineHeight: 1.65 },
  ownerRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #F3F4F6' },
  membersList: { marginBottom: 24 },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF', color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  memberInfo: { flex: 1, minWidth: 140 },
  memberEmail: { fontSize: 14, fontWeight: 500, color: BL, marginBottom: 2 },
  memberStatus: { fontSize: 12, color: '#9CA3AF' },
  memberActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  roleBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: GREY, color: '#6B7280' },
  roleSelect: { border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', color: BL, background: WH, cursor: 'pointer' },
  smBtn: { padding: '5px 12px', background: WH, color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  inviteCard: { background: GREY, borderRadius: 12, padding: '20px', border: '1px solid #E5E7EB', marginTop: 24 },
  inviteTitle: { fontSize: 14, fontWeight: 600, color: BL, marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' },
  input: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 16, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  roleGrid: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
  roleBtn: { flex: 1, minWidth: 120, padding: '12px 14px', border: '1.5px solid', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' },
  roleName: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  roleDesc: { fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 },
  successMsg: { fontSize: 13, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '8px 12px', marginBottom: 12 },
  errorMsg: { fontSize: 13, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', marginBottom: 12 },
  sendBtn: { padding: '10px 24px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },
  viewerNote: { marginTop: 24, padding: '14px', background: GREY, borderRadius: 8 },
  viewerNoteText: { fontSize: 13, color: '#9CA3AF' },
};
