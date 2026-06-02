import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Card, Modal, ModalActions, Btn, FormRow, Field, roleBadge, useConfirm, Spinner, ErrorMsg } from '../components/ui';

const empty = { username: '', fullname: '', password: '', role: 'user' };

export default function Users() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
    confirm(t('removeUserQuestion', { username: u.username }), async () => {
      try { await api.deleteUser(u.id); load(); } catch (e) { alert(e.message); }
    });
  }

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  if (loading) return <Spinner />;

  return (
    <>
      <Card title={t('usersManagement')} action={<Btn variant="primary" sm onClick={() => { setForm(empty); setErr(''); setOpen(true); }}><i className="ti ti-plus" /> {t('addUser')}</Btn>}>
        <table>
          <thead><tr><th>{t('usernameLabel')}</th><th>{t('fullnameLabel')}</th><th>{t('roleLabel')}</th><th>{t('lastLogin')}</th><th>{t('actions')}</th></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500 }}>{u.username}</td>
              <td>{u.fullname}</td>
              <td>{roleBadge(u.role, t)}</td>
              <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : t('never')}</td>
              <td>{u.id === user.id
                ? <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{t('currentUser')}</span>
                : <Btn sm variant="danger" onClick={() => del(u)}><i className="ti ti-trash" /> {t('removeUser')}</Btn>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('addUserTitle')}>
        <FormRow cols={2}>
          <Field label={t('usernameLabel')}><input value={form.username} onChange={f('username')} placeholder={t('usernameExample')} /></Field>
          <Field label={t('fullnameLabel')}><input value={form.fullname} onChange={f('fullname')} placeholder={t('fullnameExample')} /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label={t('passwordLabel')}><input type="password" value={form.password} onChange={f('password')} /></Field>
          <Field label={t('roleLabel')}>
            <select value={form.role} onChange={f('role')}>
              <option value="user">{t('userRoleUser')}</option>
              <option value="admin">{t('userRoleAdmin')}</option>
            </select>
          </Field>
        </FormRow>
        <ErrorMsg msg={err} />
        <ModalActions>
          <Btn onClick={() => setOpen(false)}>{t('cancel')}</Btn>
          <Btn variant="primary" onClick={save}>{t('save')}</Btn>
        </ModalActions>
      </Modal>

      <ConfirmDialog />
    </>
  );
}
