import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ErrorMsg } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-secondary)' }}>
      <div className="card" style={{ width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <i className="ti ti-building-factory-2" style={{ fontSize: 28, color: 'var(--color-text-secondary)' }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>Manufacturing Dashboard</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Sign in to continue</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fr"><div>
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoFocus />
          </div></div>
          <div className="fr"><div>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
          </div></div>
          <ErrorMsg msg={err} />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop: '1.25rem', borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '1rem' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 500 }}>Demo accounts</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            <span className="badge badge-admin">Admin</span> &nbsp;admin / admin123
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <span className="badge badge-user">User</span> &nbsp;&nbsp;maria / user123
          </div>
        </div>
      </div>
    </div>
  );
}
