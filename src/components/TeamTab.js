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

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch { return {}; }
}

export default function TeamTab({ project, currentUser, onSave }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteError, setInviteError] = useState('');

  const isOwner = project.user_id === currentUser?.id ||
    members.some(m => m.user_id === currentUser?.id && m.role === 'owner');

  useEffect(() => { fetchMembers(); fetchOwner(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOwner = async () => {
    if (project.user_id === currentUser?.id) {
      setOwnerEmail(currentUser?.email || '');
    } else {
      setOwnerEmail(project.owner_email || 'Project Owner');
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase.from('project_members').select('*').eq('project_id', project.id).order('created_at', { ascending: true });
    setMembers(data || []);
    setLoading(false);
  };

  const sendInvite = async () => {
   // Check if this email is already invited to this project
const { data: existing } = await supabase
  .from('project_members')
  .select('id, status')
  .eq('project_id', project.id)
  .eq('email', email.trim().toLowerCase())
  .single();

if (existing) {
  setInviteError(existing.status === 'accepted'
    ? 'This person is already a member of this project.'
    : 'This person has already been invited. Use Resend to send the invite again.');
  setSending(false);
  return;
}
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

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ email: email.trim(), role, projectId: project.id, projectName: project.name, inviterName, token }),
      });
      const result = await res.json();
      if (res.ok) {
        setInviteMsg(`Invitation sent to ${email.trim()}`);
        setEmail('');
        fetchMembers();
      } else {
        setInviteError(`Email failed: ${result.error || 'Unknown error'}. Invite record saved — ask them to check PM Buddy.`);
      }
    } catch (err) {
      setInviteError(`Network error: ${err.message}. Invite record was saved.`);
    }
    setSending(false);
  };

  const removeMember = async (id) => { await supabase.from('project_members').delete().eq('id', id); fetchMembers(); };
  const changeRole = async (id, newRole) => { await supabase.from('project_members').update({ role: newRole }).eq('id', id); fetchMembers(); };

  const resendInvite = async (member) => {
    const inviterName = currentUser?.user_metadata?.first_name || currentUser?.email?.split('@')[0] || 'A team member';
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ email: member.email, role: member.role, projectId: project.id, projectName: project.name, inviterName, token: member.token }),
      });
      if (res.ok) {
        setInviteMsg(`Invite resent to ${member.email}`);
      } else {
        const r = await res.json();
        setInviteError(`Could not resend: ${r.error || 'Unknown error'}`);
      }
    } catch (err) {
      setInviteError(`Network error: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={s.head}>
        <h3 style={s.title}>Team Members</h3>
        <p style={s.sub}>Invite people to collaborate on this project. Set their access level before sending.</p>
      </div>

      <div style={s.ownerRow}>
        <div style={s.avatar}>{(ownerEmail || 'O')[0]?.toUpperCase()}</div>
        <div style={s.memberInfo}>
          <p style={s.memberEmail}>{ownerEmail || 'Project Owner'}</p>
          <p style={s.memberStatus}>Project owner</p>
        </div>
        <span style={{ ...s.roleBadge, background: '#EFF6FF', color: BLUE }}>Owner</span>
      </div>

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
                  <select style={s.roleSelect} value={m.role} onChange={e => changeRole(m.id, e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                ) : <span style={s.roleBadge}>{ROLE_LABELS[m.role]}</span>}
                {isOwner && m.status === 'pending' && <button style={s.smBtn} onClick={() => resendInvite(m)}>Resend</button>}
                {isOwner && <button style={{ ...s.smBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => removeMember(m.id)}>Remove</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div style={s.inviteCard}>
          <p style={s.inviteTitle}>Invite Someone</p>
          <label style={s.label}>Email address</label>
          <input style={s.input} type="email" placeholder="colleague@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendInvite()} />
          <label style={s.label}>Role</label>
          <div style={s.roleGrid}>
            {ROLES.map(r => (
              <button key={r} style={{ ...s.roleBtn, borderColor: role === r ? BLUE : '#E5E7EB', background: role === r ? '#EFF6FF' : WH }} onClick={() => setRole(r)}>
                <p style={{ ...s.roleName, color: role === r ? BLUE : BL }}>{ROLE_LABELS[r]}</p>
                <p style={s.roleDesc}>{ROLE_DESC[r]}</p>
              </button>
            ))}
          </div>
          {inviteMsg && <p style={s.successMsg}>{inviteMsg}</p>}
          {inviteError && <p style={s.errorMsg}>{inviteError}</p>}
          <button style={{ ...s.sendBtn, opacity: !email.trim() || inviting ? 0.6 : 1 }} onClick={sendInvite} disabled={!email.trim() || inviting}>
            {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      )}

      {!isOwner && <div style={s.viewerNote}><p style={s.viewerNoteText}>Only the project owner can invite or remove team members.</p></div>}

      {onSave && <WhoDoesWhat project={project} onSave={onSave} />}
      {onSave && <CommunicationPlan project={project} onSave={onSave} />}
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
  roleBtn: { flex: 1, minWidth: 120, padding: '12px 14px', border: '1.5px solid', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  roleName: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  roleDesc: { fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 },
  successMsg: { fontSize: 13, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '8px 12px', marginBottom: 12 },
  errorMsg: { fontSize: 13, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', marginBottom: 12 },
  sendBtn: { padding: '10px 24px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  viewerNote: { marginTop: 24, padding: '14px', background: GREY, borderRadius: 8 },
  viewerNoteText: { fontSize: 13, color: '#9CA3AF' },
};

export function WhoDoesWhat({ project, onSave }) {
  const tasks = project.who_does_what || [];
  const team = project.team || [];
  const [newTask, setNewTask] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newLoop, setNewLoop] = useState('');

  const add = () => {
    if (!newTask.trim()) return;
    onSave({ who_does_what: [...tasks, { task: newTask.trim(), owner: newOwner.trim(), loop: newLoop.trim() }] });
    setNewTask(''); setNewOwner(''); setNewLoop('');
  };

  const remove = (i) => onSave({ who_does_what: tasks.filter((_, idx) => idx !== i) });

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #F3F4F6' }}>
      <p style={wStyle.label}>Who Does What</p>
      <p style={wStyle.sub}>For each key task, say who handles it and who just needs to be kept in the loop.</p>
      <div style={wStyle.formCard}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={{ ...wStyle.input, flex: 2, minWidth: 140 }} placeholder="Task e.g. Build the app" value={newTask} onChange={e => setNewTask(e.target.value)} />
          <input style={{ ...wStyle.input, flex: 1, minWidth: 100 }} placeholder="Who does it" value={newOwner} onChange={e => setNewOwner(e.target.value)} list="team-list" />
          <input style={{ ...wStyle.input, flex: 1, minWidth: 100 }} placeholder="Who to keep in the loop" value={newLoop} onChange={e => setNewLoop(e.target.value)} />
          <datalist id="team-list">{team.map((m, i) => <option key={i} value={m.name} />)}</datalist>
        </div>
        <button style={wStyle.addBtn} onClick={add}>Add</button>
      </div>
      {tasks.length === 0 && <p style={wStyle.empty}>No tasks added yet. Add who is responsible for what.</p>}
      {tasks.map((t, i) => (
        <div key={i} style={wStyle.row}>
          <div style={{ flex: 2 }}><p style={wStyle.taskName}>{t.task}</p></div>
          <div style={{ flex: 1 }}><p style={wStyle.metaLabel}>Does it</p><p style={wStyle.metaVal}>{t.owner || '—'}</p></div>
          <div style={{ flex: 1 }}><p style={wStyle.metaLabel}>In the loop</p><p style={wStyle.metaVal}>{t.loop || '—'}</p></div>
          <button style={wStyle.removeBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function CommunicationPlan({ project, onSave }) {
  const comms = project.comms_plan || [];
  const team = project.team || [];
  const [who, setWho] = useState('');
  const [what, setWhat] = useState('');
  const [how, setHow] = useState('');
  const [when, setWhen] = useState('');

  const add = () => {
    if (!who.trim()) return;
    onSave({ comms_plan: [...comms, { who: who.trim(), what: what.trim(), how: how.trim(), when: when.trim() }] });
    setWho(''); setWhat(''); setHow(''); setWhen('');
  };

  const remove = (i) => onSave({ comms_plan: comms.filter((_, idx) => idx !== i) });

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #F3F4F6' }}>
      <p style={wStyle.label}>Who Needs to Know What</p>
      <p style={wStyle.sub}>Keep everyone in the loop without overwhelming anyone. Add one row per person or group.</p>
      <div style={wStyle.formCard}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={{ ...wStyle.input, flex: 1, minWidth: 100 }} placeholder="Who e.g. Investors" value={who} onChange={e => setWho(e.target.value)} list="team-list-comms" />
          <input style={{ ...wStyle.input, flex: 2, minWidth: 140 }} placeholder="What they need to know" value={what} onChange={e => setWhat(e.target.value)} />
          <input style={{ ...wStyle.input, flex: 1, minWidth: 100 }} placeholder="How e.g. Email, WhatsApp" value={how} onChange={e => setHow(e.target.value)} />
          <input style={{ ...wStyle.input, flex: 1, minWidth: 100 }} placeholder="How often e.g. Weekly" value={when} onChange={e => setWhen(e.target.value)} />
          <datalist id="team-list-comms">{team.map((m, i) => <option key={i} value={m.name} />)}</datalist>
        </div>
        <button style={wStyle.addBtn} onClick={add}>Add</button>
      </div>
      {comms.length === 0 && <p style={wStyle.empty}>No communication plan yet. Add who needs to know what and how often.</p>}
      {comms.map((c, i) => (
        <div key={i} style={wStyle.row}>
          <div style={{ flex: 1 }}><p style={wStyle.metaLabel}>Who</p><p style={wStyle.metaVal}>{c.who}</p></div>
          <div style={{ flex: 2 }}><p style={wStyle.metaLabel}>What they need to know</p><p style={wStyle.metaVal}>{c.what || '—'}</p></div>
          <div style={{ flex: 1 }}><p style={wStyle.metaLabel}>How</p><p style={wStyle.metaVal}>{c.how || '—'}</p></div>
          <div style={{ flex: 1 }}><p style={wStyle.metaLabel}>How often</p><p style={wStyle.metaVal}>{c.when || '—'}</p></div>
          <button style={wStyle.removeBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
    </div>
  );
}

const wStyle = {
  label: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 14 },
  formCard: { background: '#F8FAFC', borderRadius: 10, padding: '14px', border: '1px solid #E5E7EB', marginBottom: 14 },
  input: { border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#0A0A0A', outline: 'none', background: '#FFFFFF', marginBottom: 10 },
  addBtn: { padding: '8px 20px', background: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap' },
  taskName: { fontSize: 14, fontWeight: 600, color: '#0A0A0A' },
  metaLabel: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 },
  metaVal: { fontSize: 13, color: '#374151' },
  removeBtn: { background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', flexShrink: 0, alignSelf: 'center' },
  empty: { fontSize: 13, color: '#9CA3AF', padding: '16px 0' },
};
