import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Card, Modal, ModalActions, Btn, FormRow, Field, roleBadge, useConfirm, Spinner, ErrorMsg } from '../components/ui';

const empty = { username: '', fullname: '', password: '', role: 'user' };

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() { setUsers(await api.getUsers()); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    setErr('');
    try { await api.createUser(form); setOpen(false); load(); }
    catch (e) { setErr(e.message); }
  }

  function del(u) {
    confirm(`Remove user "${u.username}"?`, async () => {
      try { await api.deleteUser(u.id); load(); } catch (e) { alert(e.message); }
    });
  }

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  if (loading) return <Spinner />;

  return (
    <>
      <Card title="User management" action={<Btn variant="primary" sm onClick={() => { setForm(empty); setErr(''); setOpen(true); }}><i className="ti ti-plus" /> Add user</Btn>}>
        <table>
          <thead><tr><th>Username</th><th>Full name</th><th>Role</th><th>Last login</th><th>Actions</th></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500 }}>{u.username}</td>
              <td>{u.fullname}</td>
              <td>{roleBadge(u.role)}</td>
              <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
              <td>{u.id === user.id
                ? <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>current user</span>
                : <Btn sm variant="danger" onClick={() => del(u)}><i className="ti ti-trash" /> Remove</Btn>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add user">
        <FormRow cols={2}>
          <Field label="Username"><input value={form.username} onChange={f('username')} placeholder="jdoe" /></Field>
          <Field label="Full name"><input value={form.fullname} onChange={f('fullname')} placeholder="Jane Doe" /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Password"><input type="password" value={form.password} onChange={f('password')} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={f('role')}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </FormRow>
        <ErrorMsg msg={err} />
        <ModalActions>
          <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={save}>Save</Btn>
        </ModalActions>
      </Modal>

      <ConfirmDialog />
    </>
  );
}
