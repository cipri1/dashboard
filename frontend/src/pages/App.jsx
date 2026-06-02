import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Overview  from './Overview';
import Products  from './Products';
import Parts     from './Parts';
import Sales     from './Sales';
import Clients   from './Clients';
import AuditLog  from './AuditLog';
import Users     from './Users';
import Settings  from './Settings';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: 'ti-layout-dashboard' },
  { id: 'products',  label: 'Products',  icon: 'ti-cpu' },
  { id: 'inventory', label: 'Parts',     icon: 'ti-box' },
  { id: 'sales',     label: 'Sales',     icon: 'ti-receipt' },
  { id: 'clients',   label: 'Clients',   icon: 'ti-users' },
  { id: 'audit',     label: 'Audit log', icon: 'ti-history' },
  { id: 'users',     label: 'Users',     icon: 'ti-shield-lock', adminOnly: true },
  { id: 'settings',  label: 'Settings',  icon: 'ti-settings',    adminOnly: true },
];

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function App() {
  const { user, logout, isAdmin } = useAuth();
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
          <span style={{ fontSize: 15, fontWeight: 500 }}>Manufacturing Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge badge-${user.role}`}>{user.role}</span>
          <div className={`avatar avatar-${user.role}`}>{initials(user.fullname)}</div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{user.fullname}</span>
          <button className="btn btn-sm" onClick={logout}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.filter(t => !t.adminOnly || isAdmin).map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <i className={`ti ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      <div>{pages[tab]}</div>
    </div>
  );
}
