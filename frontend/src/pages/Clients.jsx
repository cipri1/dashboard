import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Card, Modal, ModalActions, Btn, FormRow, Field, fmt, useConfirm, Spinner, ErrorMsg } from '../components/ui';

const empty = { name: '', company: '', email: '', phone: '', address: '', postcode: '' };

export default function Clients() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [open, setOpen] = useState(false);
  const [viewClient, setViewClient] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() {
    const [c, s] = await Promise.all([api.getClients(), api.getSales()]);
    setClients(c); setSales(s); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setEditing(null); setErr(''); setOpen(true); }
  function openEdit(c) { setForm({ name: c.name, company: c.company, email: c.email, phone: c.phone, address: c.address || '', postcode: c.postcode || '' }); setEditing(c.id); setErr(''); setOpen(true); }

  async function save() {
    setErr('');
    try {
      if (editing) await api.updateClient(editing, form);
      else await api.createClient(form);
      setOpen(false); load();
    } catch (e) { setErr(e.message); }
  }

  function del(c) {
    confirm(t('deleteClientQuestion', { name: c.name }), async () => {
      try { await api.deleteClient(c.id); load(); } catch (e) { alert(e.message); }
    });
  }

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  function clientTotals(clientId) {
    const paid = sales.filter(s => s.client_id === clientId && s.status === 'Paid');
    const total = paid.reduce((a, s) => a + s.qty * s.price, 0);
    const products = [...new Set(paid.map(s => s.product_name).filter(Boolean))];
    return { total, products, allSales: sales.filter(s => s.client_id === clientId) };
  }

  if (loading) return <Spinner />;

  return (
    <>
      <Card title={t('clientsTitle')} action={<Btn variant="primary" sm onClick={openAdd}><i className="ti ti-plus" /> {t('addClient')}</Btn>}>
        <table>
          <thead><tr><th>{t('name')}</th><th>{t('company')}</th><th>{t('clientEmail')}</th><th>{t('clientPhone')}</th><th>{t('clientPostcode')}</th><th>{t('clientAddress')}</th><th>{t('productsBought')}</th><th>{t('totalPaid')}</th><th>{t('actions')}</th></tr></thead>
          <tbody>{clients.map(c => {
            const { total, products } = clientTotals(c.id);
            return (
              <tr key={c.id}>
                <td>
                  <button className="btn btn-sm" style={{ fontSize: 12, border: 'none', padding: 0, fontWeight: 500, textDecoration: 'underline', textDecorationColor: 'var(--color-border-secondary)' }}
                    onClick={() => setViewClient(c)}>{c.name}</button>
                </td>
                <td>{c.company}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.email}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.phone}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.postcode || '—'}</td>
                <td title={c.address} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.address || '—'}</td>
                <td style={{ fontSize: 12 }} title={products.join(', ')}>{products.length ? products.join(', ') : t('noneYet')}</td>
                <td style={{ fontWeight: 500 }}>{fmt(total)}</td>
                <td><div style={{ display: 'flex', gap: 4 }}>
                  <Btn sm onClick={() => openEdit(c)}><i className="ti ti-edit" /></Btn>
                  {isAdmin && <Btn sm variant="danger" onClick={() => del(c)}><i className="ti ti-trash" /></Btn>}
                </div></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      {/* Client detail view */}
      {viewClient && (() => {
        const { total, products, allSales } = clientTotals(viewClient.id);
        return (
          <Modal open onClose={() => setViewClient(null)} title={viewClient.name}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{viewClient.company}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem', fontSize: 13 }}>
              <div><span style={{ color: 'var(--color-text-secondary)' }}>{t('clientEmail')}:</span><br />{viewClient.email}</div>
              <div><span style={{ color: 'var(--color-text-secondary)' }}>{t('clientPhone')}:</span><br />{viewClient.phone}</div>
              <div><span style={{ color: 'var(--color-text-secondary)' }}>{t('clientPostcode')}:</span><br />{viewClient.postcode || '—'}</div>
              <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--color-text-secondary)' }}>{t('clientAddress')}:</span><br /><span style={{ whiteSpace: 'pre-wrap' }}>{viewClient.address || t('notSpecified')}</span></div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('purchaseHistory')}</div>
            {allSales.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t('noPurchasesYet')}</div>
              : allSales.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 13 }}>
                  <span>{s.product_name} × {s.qty} <span className={`badge badge-${s.status.toLowerCase()}`} style={{ fontSize: 10 }}>{s.status}</span></span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{s.date?.slice(0, 10)} &nbsp; {fmt(s.qty * s.price)}</span>
                </div>
              ))}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t('totalSpentPaidOnly')}</span>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{fmt(total)}</span>
            </div>
            <ModalActions>
              <Btn onClick={() => setViewClient(null)}>{t('close')}</Btn>
              <Btn variant="primary" onClick={() => { setViewClient(null); openEdit(viewClient); }}>{t('editClient')}</Btn>
            </ModalActions>
          </Modal>
        );
      })()}

      {/* Add/Edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editClientTitle') : t('addClientTitle')} wide>
        <FormRow cols={2}>
          <Field label={t('fullnameLabel')}><input value={form.name} onChange={f('name')} placeholder={t('fullnameExample')} /></Field>
          <Field label={t('company')}><input value={form.company} onChange={f('company')} placeholder={t('companyExample')} /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label={t('clientEmail')}><input type="email" value={form.email} onChange={f('email')} /></Field>
          <Field label={t('clientPhone')}><input value={form.phone} onChange={f('phone')} placeholder={t('phoneExample')} /></Field>
        </FormRow>
        <FormRow>
          <Field label={t('clientPostcode')}><input value={form.postcode} onChange={f('postcode')} placeholder={t('postcodeExample')} /></Field>
        </FormRow>
        <FormRow>
          <Field label={t('clientAddress')}><textarea value={form.address} onChange={f('address')} placeholder={t('addressExample')} style={{ minHeight: 60 }} /></Field>
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
