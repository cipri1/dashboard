import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Card, Modal, ModalActions, Btn, FormRow, Field, fmt, saleBadge, useConfirm, Spinner, ErrorMsg } from '../components/ui';

const emptySale = { date: new Date().toISOString().slice(0, 10), client_id: '', items: [], status: 'Pending' };

export default function Sales() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptySale);
  const [stockWarn, setStockWarn] = useState('');
  const [err, setErr] = useState('');
  const [statusSale, setStatusSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() {
    const [s, p, c] = await Promise.all([api.getSales(), api.getProducts(), api.getClients()]);
    setSales(s); setProducts(p); setClients(c); setLoading(false);
  }
  useEffect(() => { load(); }, []);

 function openAdd() {
  const firstProd = products[0];
  const firstClient = clients[0];
  setForm({
    ...emptySale,
    client_id:  firstClient?.id || '',
    date:       new Date().toISOString().slice(0, 10),
    items:      firstProd?.id ? [{ product_id: firstProd.id, qty: 1, price: firstProd.price }] : []
  });
  setErr(''); setStockWarn(''); setOpen(true);
}

 function handleProductChange(index, e) {
   const prod = products.find(p => p.id === parseInt(e.target.value));
   setForm(v => {
     const newItems = [...v.items];
     newItems[index] = { ...newItems[index], product_id: parseInt(e.target.value), price: prod?.price || '' };
     return { ...v, items: newItems };
   });
 }

 function handleItemQtyChange(index, e) {
   const newQty = parseInt(e.target.value);
   setForm(v => {
     const newItems = [...v.items];
     newItems[index] = { ...newItems[index], qty: newQty };
     return { ...v, items: newItems };
   });
 }

 function handleItemPriceChange(index, e) {
   const newPrice = parseFloat(e.target.value);
   setForm(v => {
     const newItems = [...v.items];
     newItems[index] = { ...newItems[index], price: newPrice };
     return { ...v, items: newItems };
   });
 }

 function addItem() {
   const firstProd = products[0];
   setForm(v => ({
     ...v,
     items: [...v.items, { product_id: firstProd?.id || '', qty: 1, price: firstProd?.price || '' }]
   }));
 }

 function removeItem(index) {
   setForm(v => ({
     ...v,
     items: v.items.filter((_, i) => i !== index)
   }));
 }

 async function save() {
   setErr('');
   try {
     if (!form.client_id) {
       setErr(t('clientRequired'));
       return;
     }
     if (!form.items || form.items.length === 0) {
       setErr(t('itemsRequired'));
       return;
     }
     const saleData = {
       date: form.date,
       status: form.status,
       client_id: parseInt(form.client_id),
       items: form.items.map(item => ({
         product_id: parseInt(item.product_id),
         qty: parseInt(item.qty),
         price: parseFloat(item.price)
       }))
     };
     await api.createSale(saleData);
     setOpen(false); load();
   } catch (e) {
     if (e.message.includes('stock') || e.message.includes('Insufficient')) setStockWarn(e.message);
     else setErr(e.message);
   }
 }

  async function changeStatus(saleId, newStatus) {
    try {
      await api.updateSaleStatus(saleId, newStatus);
      setStatusSale(null); load();
    } catch (e) { alert(e.message); }
  }

  async function printLabel(s) {
    try {
      const currentLang = localStorage.getItem('app-language') || 'en';
      const blob = await api.getSaleLabel(s.id, currentLang);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) throw new Error(t('allowPopups'));
    } catch (e) {
      alert(e.message);
    }
  }

  function del(s) {
    confirm(t('deleteSaleQuestion', { id: s.id }), async () => {
      try { await api.deleteSale(s.id); load(); } catch (e) { alert(e.message); }
    });
  }

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  const transitions = {
    Pending:  ['Paid', 'Aborted'],
    Paid:     ['Refunded'],
    Aborted:  [],
    Refunded: [],
  };
  const transitionLabels = {
    Paid:     { label: t('markAsPaid'), sub: t('partsDeductedImmediately'), variant: 'success' },
    Aborted:  { label: t('abortSale'), sub: t('noStockDeductedSaleCancelled'), variant: 'warn' },
    Refunded: { label: t('refundReverse'), sub: t('partsRestoredOnRefund'), variant: 'danger' },
  };

  if (loading) return <Spinner />;

  return (
    <>
      <div className="card" style={{ background: 'var(--color-background-secondary)', border: 'none', padding: '10px 14px', marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{t('saleStatusLifecycle')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
          <span className="badge badge-pending">{t('statusPending')}</span> <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="badge badge-paid">{t('statusPaid')}</span> <span style={{ color: 'var(--color-text-tertiary)' }}>&nbsp;{t('or')}&nbsp;</span>
          <span className="badge badge-pending">{t('statusPending')}</span> <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="badge badge-aborted">{t('statusAborted')}</span>
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 8 }}>· {t('statusPaid')} →</span>
          <span className="badge badge-refunded">{t('statusRefunded')}</span>
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 8, fontSize: 11 }}>({t('stockRestoredOnRefund')})</span>
        </div>
      </div>

      <Card title={t('salesRecords')} action={<Btn variant="primary" sm onClick={openAdd}><i className="ti ti-plus" /> {t('recordSale')}</Btn>}>
        <table>
          <thead><tr><th>{t('date')}</th><th>{t('saleProducts')}</th><th>{t('saleClient')}</th><th>{t('saleTotal')}</th><th>{t('status')}</th><th>{t('by')}</th><th>{t('actions')}</th></tr></thead>
          <tbody>{sales.map(s => {
            const locked = s.status === 'Aborted' || s.status === 'Refunded';
            const items = s.items || [];
            const total = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
            const itemsStr = items.map(i => `${i.product_name} × ${i.qty}`).join(', ');
            return (
              <tr key={s.id} style={locked ? { opacity: 0.55 } : {}}>
                <td>{s.date?.slice(0, 10)}</td>
                <td title={itemsStr}>{itemsStr || '—'}</td>
                <td>{s.client_name}</td>
                <td style={{ fontWeight: 500 }}>{fmt(total)}</td>
                <td>{saleBadge(s.status, t(`status${s.status}`))}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.recorded_by_name}</td>
                <td><div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {(s.status === 'Paid' || s.status === 'Pending') && <Btn sm variant="success" onClick={() => printLabel(s)}><i className="ti ti-send" /> {t('labelPrint')}</Btn>}
                  {!locked && <Btn sm onClick={() => setStatusSale(s)}><i className="ti ti-arrows-exchange" /> {t('statusChange')}</Btn>}
                  {isAdmin && locked && <Btn sm variant="danger" onClick={() => del(s)}><i className="ti ti-trash" /> {t('delete')}</Btn>}
                </div></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      {/* Record sale modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={t('recordSale')}>
        {stockWarn && <div style={{ background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', fontSize: 12, color: '#633806', marginBottom: 10 }}>
          <i className="ti ti-alert-triangle" /> {stockWarn}
        </div>}
        <FormRow cols={2}>
          <Field label={t('saleClient')}>
            <select value={form.client_id} onChange={f('client_id')}>
              <option value="">— {t('selectClient')} —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t('date')}><input type="date" value={form.date} onChange={f('date')} /></Field>
        </FormRow>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('saleItems')}</span>
            <Btn sm variant="success" onClick={addItem}><i className="ti ti-plus" /> {t('addItem')}</Btn>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
            {form.items && form.items.length > 0 ? (
              form.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, padding: 10, borderBottom: idx < form.items.length - 1 ? '1px solid var(--color-border)' : 'none', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>{t('saleProduct')}</label>
                    <select value={item.product_id || ''} onChange={(e) => handleProductChange(idx, e)} style={{ width: '100%' }}>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>{t('saleQty')}</label>
                    <input type="number" min="1" value={item.qty || 1} onChange={(e) => handleItemQtyChange(idx, e)} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>{t('salePrice')}</label>
                    <input type="number" min="0" step="0.01" value={item.price || ''} onChange={(e) => handleItemPriceChange(idx, e)} style={{ width: '100%' }} />
                  </div>
                  <Btn sm variant="danger" onClick={() => removeItem(idx)}><i className="ti ti-trash" /></Btn>
                </div>
              ))
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>{t('noItems')}</div>
            )}
          </div>
        </div>

        <FormRow>
          <Field label={t('saleStatusField')}>
            <select value={form.status} onChange={f('status')}>
              <option value="Pending">{t('statusPendingOption')}</option>
              <option value="Paid">{t('statusPaidOption')}</option>
            </select>
          </Field>
        </FormRow>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10, padding: '8px 10px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13 }} /> {t('saleInfoPaid')}
        </div>
        <ErrorMsg msg={err} />
        <ModalActions>
          <Btn onClick={() => setOpen(false)}>{t('cancel')}</Btn>
          <Btn variant="primary" onClick={save}>{t('saveSale')}</Btn>
        </ModalActions>
      </Modal>

      {/* Status change modal */}
      {statusSale && (
        <Modal open onClose={() => setStatusSale(null)} title={t('updateSaleTitle', { id: statusSale.id })}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '1rem', padding: 10, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
           {statusSale.items?.map((item, i) => (
             <div key={i}>
               <strong style={{ fontWeight: 500 }}>{item.product_name}</strong> × {item.qty} @ {fmt(item.price)}
               {i < statusSale.items.length - 1 && ' · '}
             </div>
           ))}
           <br /><span style={{ marginTop: 4, display: 'inline-block' }}>{t('client')}: {statusSale.client_name}</span>
           <br /><span style={{ marginTop: 4, display: 'inline-block' }}>{t('current')}: {saleBadge(statusSale.status, t(`status${statusSale.status}`))}</span>
         </div>
         <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{t('chooseNewStatus')}</div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
           {(transitions[statusSale.status] || []).length === 0
             ? <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t('saleLockedCannotChange')}</div>
             : transitions[statusSale.status].map(st => {
               const info = transitionLabels[st];
               return (
                 <button key={st} className={`btn btn-${info.variant}`} style={{ textAlign: 'left', width: '100%', padding: '10px 14px' }}
                   onClick={() => changeStatus(statusSale.id, st)}>
                   <strong style={{ fontWeight: 500 }}>{info.label}</strong><br />
                   <span style={{ fontSize: 11, fontWeight: 400 }}>{info.sub}</span>
                 </button>
               );
             })}
         </div>
         <ModalActions><Btn onClick={() => setStatusSale(null)}>{t('cancel')}</Btn></ModalActions>
       </Modal>
      )}

      <ConfirmDialog />
    </>
  );
}
