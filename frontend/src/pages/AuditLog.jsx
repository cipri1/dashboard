import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Spinner } from '../components/ui';

const ACTION_COLORS = {
  create: 'badge-create',
  edit:   'badge-edit',
  delete: 'badge-delete',
  status: 'badge-status',
  login:  'badge-login',
};

export default function AuditLog() {
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
      title="Audit log"
      action={
        <select value={filter} onChange={handleFilter} style={{ width: 140, fontSize: 12, padding: '5px 8px' }}>
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="edit">Edit</option>
          <option value="delete">Delete</option>
          <option value="status">Status change</option>
          <option value="login">Login</option>
        </select>
      }
    >
      {loading ? <div style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading…</div> : (
        <table>
          <thead>
            <tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {log.map(e => (
              <tr key={e.id}>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{new Date(e.ts).toLocaleString()}</td>
                <td style={{ fontWeight: 500 }}>{e.username}</td>
                <td><span className={`badge badge-${e.role}`}>{e.role}</span></td>
                <td><span className={`badge ${ACTION_COLORS[e.action] || 'badge-status'}`}>{e.action}</span></td>
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
