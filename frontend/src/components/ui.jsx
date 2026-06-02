import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }) {
  return <div className="modal-actions">{children}</div>;
}

export function Badge({ variant, children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function stockBadge(qty, min, t = (key) => key) {
  if (qty === 0) return <Badge variant="out">{t('productStockOut')}</Badge>;
  if (qty < min) return <Badge variant="low">{t('productStockLow')}</Badge>;
  return <Badge variant="ok">{t('productStockOk')}</Badge>;
}

export function productStockBadge(stock, t = (key) => key) {
  if (stock === 0) return <Badge variant="out">{t('productStockOut')}</Badge>;
  if (stock < 3) return <Badge variant="low">{t('productStockLow')}</Badge>;
  return <Badge variant="ok">{t('productStockOk')}</Badge>;
}

export function saleBadge(status, label = status) {
  const map = { Paid: 'paid', Pending: 'pending', Aborted: 'aborted', Refunded: 'refunded' };
  return <Badge variant={map[status] || 'pending'}>{label}</Badge>;
}

export function roleBadge(role, t = (key) => key) {
  const label = role === 'admin'
    ? t('userRoleAdmin')
    : role === 'user'
      ? t('userRoleUser')
      : t(role);

  return <Badge variant={role}>{label}</Badge>;
}

export function Btn({ variant = '', sm, onClick, disabled, children, type = 'button' }) {
  return (
    <button
      type={type}
      className={`btn${variant ? ` btn-${variant}` : ''}${sm ? ' btn-sm' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function FormRow({ cols, children }) {
  return <div className={`fr${cols ? ` c${cols}` : ''}`}>{children}</div>;
}

export function Field({ label, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Card({ title, action, children }) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card-header">
          {title && <span className="card-title">{title}</span>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState(null);

  function confirm(message, onOk, danger = true) {
    setState({ message, onOk, danger });
  }

  function ConfirmDialog() {
    const { t } = useLanguage();
    if (!state) return null;
    return (
      <Modal open title={t('confirmAction')} onClose={() => setState(null)}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 0 }}>{state.message}</p>
        <ModalActions>
          <Btn onClick={() => setState(null)}>{t('cancel')}</Btn>
          <Btn variant={state.danger ? 'danger' : 'primary'} onClick={() => { state.onOk(); setState(null); }}>
            {t('confirm')}
          </Btn>
        </ModalActions>
      </Modal>
    );
  }

  return { confirm, ConfirmDialog };
}

export function fmt(n) { return 'RON ' + Number(n).toFixed(2); }

export function PermNotice({ children }) {
  return (
    <div className="perm-notice">
      <i className="ti ti-lock" style={{ fontSize: 14 }} />
      {children}
    </div>
  );
}

export function Spinner() {
  const { t } = useLanguage();
  return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>{t('loading')}</div>;
}

export function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ fontSize: 12, color: 'var(--color-text-danger)', marginBottom: 8 }}>{msg}</div>;
}
