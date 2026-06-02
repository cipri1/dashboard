import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { roleBadge } from '../components/ui';
import Overview  from './Overview';
import Products  from './Products';
import Parts     from './Parts';
import Sales     from './Sales';
import Clients   from './Clients';
import AuditLog  from './AuditLog';
import Users     from './Users';
import Settings  from './Settings';

const TABS = [
  { id: 'overview',  labelKey: 'overview',  icon: 'ti-layout-dashboard' },
  { id: 'products',  labelKey: 'products',  icon: 'ti-cpu' },
  { id: 'inventory', labelKey: 'inventory', icon: 'ti-box' },
  { id: 'sales',     labelKey: 'sales',     icon: 'ti-receipt' },
  { id: 'clients',   labelKey: 'clients',   icon: 'ti-users' },
  { id: 'audit',     labelKey: 'audit',     icon: 'ti-history' },
  { id: 'users',     labelKey: 'users',     icon: 'ti-shield-lock', adminOnly: true },
  { id: 'settings',  labelKey: 'settings',  icon: 'ti-settings',    adminOnly: true },
];

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function App() {
  const { user, logout, isAdmin } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [tab, setTab] = useState('overview');

  const pages = {
    overview:  <Overview />,
    products:  <Products />,
    inventory: <Parts />,
    sales:     <Sales />,
    clients:   <Clients />,
    audit:     <AuditLog />,
    users:     <Users />,
    settings:  <Settings />,
  };

  return (
    <div className="dash">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-building-factory-2" style={{ fontSize: 20, color: 'var(--color-text-secondary)' }} />
          <span style={{ fontSize: 15, fontWeight: 500 }}>{t('title')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-sm"
            style={lang === 'ro' ? { fontWeight: 700 } : { opacity: 0.7 }}
            onClick={() => setLang('ro')}
          >
            RO
          </button>
          <button
            className="btn btn-sm"
            style={lang === 'en' ? { fontWeight: 700 } : { opacity: 0.7 }}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          {roleBadge(user.role, t)}
          <div className={`avatar avatar-${user.role}`}>{initials(user.fullname)}</div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{user.fullname}</span>
          <button className="btn btn-sm" onClick={logout}>
            <i className="ti ti-logout" /> {t('signOut')}
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.filter(tabItem => !tabItem.adminOnly || isAdmin).map(tabItem => (
          <button key={tabItem.id} className={`tab${tab === tabItem.id ? ' active' : ''}`} onClick={() => setTab(tabItem.id)}>
            <i className={`ti ${tabItem.icon}`} /> {tabItem.labelKey ? t(tabItem.labelKey) : tabItem.label}
          </button>
        ))}
      </div>

      <div>{pages[tab]}</div>
    </div>
  );
}
