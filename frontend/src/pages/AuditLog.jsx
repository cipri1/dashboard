import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Spinner, roleBadge } from '../components/ui';
import { useLanguage } from '../hooks/useLanguage';

const ACTION_COLORS = {
  create: 'badge-create',
  edit:   'badge-edit',
  delete: 'badge-delete',
  status: 'badge-status',
  login:  'badge-login',
};

export default function AuditLog() {
  const { t } = useLanguage();
  const [log, setLog] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(action) {
    setLoading(true);
    setLog(await api.getAudit(action));
    setLoading(false);
  }

  useEffect(() => { load(''); }, []);

  function handleFilter(e) {
    setFilter(e.target.value);
    load(e.target.value);
  }

  return (
    <Card
      title={t('auditLog')}
      action={
        <select value={filter} onChange={handleFilter} style={{ width: 140, fontSize: 12, padding: '5px 8px' }}>
          <option value="">{t('allActions')}</option>
          <option value="create">{t('createAction')}</option>
          <option value="edit">{t('editAction')}</option>
          <option value="delete">{t('deleteAction')}</option>
          <option value="status">{t('statusAction')}</option>
          <option value="login">{t('loginAction')}</option>
        </select>
      }
    >
      {loading ? <div style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: 13 }}>{t('loading')}</div> : (
        <table>
          <thead>
            <tr><th>{t('time')}</th><th>{t('user')}</th><th>{t('role')}</th><th>{t('action')}</th><th>{t('entity')}</th><th>{t('detail')}</th></tr>
          </thead>
          <tbody>
            {log.map(e => (
              <tr key={e.id}>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{new Date(e.ts).toLocaleString()}</td>
                <td style={{ fontWeight: 500 }}>{e.username}</td>
                <td>{roleBadge(e.role, t)}</td>
                <td><span className={`badge ${ACTION_COLORS[e.action] || 'badge-status'}`}>{t(`${e.action}Action`)}</span></td>
                <td>{e.entity}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }} title={e.detail}>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
