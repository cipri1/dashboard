import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Card, Modal, ModalActions, Btn, FormRow, Field, fmt, saleBadge, useConfirm, Spinner, ErrorMsg } from '../components/ui';

const emptySale = { date: new Date().toISOString().slice(0, 10), product_id: '', client_id: '', qty: 1, price: '', status: 'Pending' };

export default function Sales() {
  const { isAdmin } = useAuth();
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
    product_id: firstProd?.id || '',
    client_id:  firstClient?.id || '',
    price:      firstProd?.price || '',
    date:       new Date().toISOString().slice(0, 10),
  });
  setErr(''); setStockWarn(''); setOpen(true);
}

  function handleProductChange(e) {
    const prod = products.find(p => p.id === parseInt(e.target.value));
    setForm(v => ({ ...v, product_id: parseInt(e.target.value), price: prod?.price || '' }));
  }

  async function save() {
    setErr('');
    try {
      await api.createSale({ ...form, product_id: parseInt(form.product_id), client_id: parseInt(form.client_id), qty: parseInt(form.qty), price: parseFloat(form.price) });
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
      const blob = await api.getSaleLabel(s.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) throw new Error('Please allow popups to open the label');
    } catch (e) {
      alert(e.message);
    }
  }

  function del(s) {
    confirm(`Delete sale #${s.id}?`, async () => {
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
    Paid:     { label: 'Mark as Paid', sub: 'Parts will be deducted from stock', variant: 'success' },
    Aborted:  { label: 'Abort sale',   sub: 'No stock deducted — sale cancelled', variant: 'warn' },
    Refunded: { label: 'Refund / Reverse', sub: 'Parts will be restored to stock', variant: 'danger' },
  };

  if (loading) return <Spinner />;

  return (
    <>
      <div className="card" style={{ background: 'var(--color-background-secondary)', border: 'none', padding: '10px 14px', marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Sale status lifecycle</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
          <span className="badge badge-pending">Pending</span> <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="badge badge-paid">Paid</span> <span style={{ color: 'var(--color-text-tertiary)' }}>&nbsp;or&nbsp;</span>
          <span className="badge badge-pending">Pending</span> <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="badge badge-aborted">Aborted</span>
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 8 }}>· Paid →</span>
          <span className="badge badge-refunded">Refunded</span>
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 8, fontSize: 11 }}>(stock restored on Refund)</span>
        </div>
      </div>

      <Card title="Sales records" action={<Btn variant="primary" sm onClick={openAdd}><i className="ti ti-plus" /> Record sale</Btn>}>
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Client</th><th>Qty</th><th>Price</th><th>Total</th><th>Status</th><th>By</th><th>Actions</th></tr></thead>
          <tbody>{sales.map(s => {
            const locked = s.status === 'Aborted' || s.status === 'Refunded';
            return (
              <tr key={s.id} style={locked ? { opacity: 0.55 } : {}}>
                <td>{s.date?.slice(0, 10)}</td>
                <td title={s.product_name}>{s.product_name}</td>
                <td>{s.client_name}</td>
                <td>{s.qty}</td>
                <td>{fmt(s.price)}</td>
                <td style={{ fontWeight: 500 }}>{fmt(s.qty * s.price)}</td>
                <td>{saleBadge(s.status)}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.recorded_by_name}</td>
                <td><div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {s.status === 'Paid' && <Btn sm variant="success" onClick={() => printLabel(s)}><i className="ti ti-send" /> Label</Btn>}
                  {!locked && <Btn sm onClick={() => setStatusSale(s)}><i className="ti ti-arrows-exchange" /> Status</Btn>}
                  {isAdmin && locked && <Btn sm variant="danger" onClick={() => del(s)}><i className="ti ti-trash" /></Btn>}
                </div></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      {/* Record sale modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Record sale">
        {stockWarn && <div style={{ background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', fontSize: 12, color: '#633806', marginBottom: 10 }}>
          <i className="ti ti-alert-triangle" /> {stockWarn}
        </div>}
        <FormRow cols={2}>
          <Field label="Product">
            <select value={form.product_id} onChange={handleProductChange}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Client">
            <select value={form.client_id} onChange={f('client_id')}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label="Date"><input type="date" value={form.date} onChange={f('date')} /></Field>
          <Field label="Qty"><input type="number" min="1" value={form.qty} onChange={f('qty')} /></Field>
          <Field label="Unit price (€)"><input type="number" min="0" step="0.01" value={form.price} onChange={f('price')} /></Field>
        </FormRow>
        <FormRow>
          <Field label="Initial status">
            <select value={form.status} onChange={f('status')}>
              <option value="Pending">Pending — payment awaited</option>
              <option value="Paid">Paid — parts deducted immediately</option>
            </select>
          </Field>
        </FormRow>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10, padding: '8px 10px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13 }} /> Parts are deducted only when status is <strong>Paid</strong>.
        </div>
        <ErrorMsg msg={err} />
        <ModalActions>
          <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={save}>Save sale</Btn>
        </ModalActions>
      </Modal>

      {/* Status change modal */}
      {statusSale && (
        <Modal open onClose={() => setStatusSale(null)} title={`Update sale #${statusSale.id}`}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '1rem', padding: 10, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
            <strong style={{ fontWeight: 500 }}>{statusSale.product_name}</strong> × {statusSale.qty} &nbsp;·&nbsp; {statusSale.client_name} &nbsp;·&nbsp; {fmt(statusSale.qty * statusSale.price)}
            <br /><span style={{ marginTop: 4, display: 'inline-block' }}>Current: {saleBadge(statusSale.status)}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Choose new status:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(transitions[statusSale.status] || []).length === 0
              ? <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>This sale is locked and cannot be changed further.</div>
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
          <ModalActions><Btn onClick={() => setStatusSale(null)}>Cancel</Btn></ModalActions>
        </Modal>
      )}

      <ConfirmDialog />
    </>
  );
}
