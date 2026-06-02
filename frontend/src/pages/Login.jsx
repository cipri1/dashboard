import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { ErrorMsg } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
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
      setErr(e.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-secondary)' }}>
      <div className="card" style={{ width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <i className="ti ti-building-factory-2" style={{ fontSize: 28, color: 'var(--color-text-secondary)' }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>{t('loginTitle')}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{t('loginSubtitle')}</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fr"><div>
            <label>{t('username')}</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder={t('enterUsername')} autoFocus />
          </div></div>
          <div className="fr"><div>
            <label>{t('password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('enterPassword')} />
          </div></div>
          <ErrorMsg msg={err} />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>
        <div style={{ marginTop: '1.25rem', borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '1rem' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 500 }}>{t('demoAccounts')}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            <span className="badge badge-admin">{t('demoAdmin')}</span> &nbsp;admin / admin123
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <span className="badge badge-user">{t('demoUser')}</span> &nbsp;&nbsp;maria / user123
          </div>
        </div>
      </div>
    </div>
  );
}
