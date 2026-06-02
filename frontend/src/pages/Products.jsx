import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Card, Modal, ModalActions, Btn, FormRow, Field, fmt, productStockBadge, useConfirm, PermNotice, Spinner, ErrorMsg } from '../components/ui';

const emptyProd = { name: '', sku: '', price: '', description: '', qty: 0 };

export default function Products() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [parts, setParts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyProd);
  const [bom, setBom] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() {
    const [p, pts] = await Promise.all([api.getProducts(), api.getParts()]);
    setProducts(p); setParts(pts); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(emptyProd); setBom([]); setEditing(null); setErr(''); setOpen(true); }
  function openEdit(p) {
    setForm({ name: p.name, sku: p.sku, price: p.price, description: p.description || '', qty: p.qty || 0 });
    setBom(p.bom.map(b => ({ part_id: b.part_id, qty: b.qty })));
    setEditing(p.id); setErr(''); setOpen(true);
  }

  function addBomRow() { setBom(b => [...b, { part_id: parts[0]?.id || '', qty: 1 }]); }
  function updateBomRow(i, key, val) { setBom(b => b.map((r, j) => j === i ? { ...r, [key]: val } : r)); }
  function removeBomRow(i) { setBom(b => b.filter((_, j) => j !== i)); }

  async function save() {
    setErr('');
    try {
      const body = { ...form, price: parseFloat(form.price) || 0, qty: parseInt(form.qty, 10) || 0, bom };
      if (editing) await api.updateProduct(editing, body);
      else await api.createProduct(body);
      setOpen(false); load();
    } catch (e) { setErr(e.message); }
  }

  function del(p) {
    confirm(t('deleteProductQuestion', { name: p.name }), async () => {
      try { await api.deleteProduct(p.id); load(); } catch (e) { alert(e.message); }
    });
  }

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));
  const partName = (id) => parts.find(p => p.id === id)?.name || '?';

  if (loading) return <Spinner />;

  return (
    <>
      {!isAdmin && <PermNotice>{t('onlyAdminsCanAddEditDeleteProducts')}</PermNotice>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        {isAdmin && <Btn variant="primary" sm onClick={openAdd}><i className="ti ti-plus" /> {t('addProduct')}</Btn>}
      </div>

      {products.map(prod => {
        const bomCost = prod.bom.reduce((a, b) => {
          const pt = parts.find(p => p.id === b.part_id);
          return a + (pt ? pt.unit_cost * b.qty : 0);
        }, 0);
        const stock = prod.qty || 0;
        return (
          <div key={prod.id} className="product-card">
            <div className="product-card-header">
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{prod.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{prod.sku} — {prod.description}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{fmt(prod.price)}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t('margin')} {fmt(prod.price - bomCost)}</div>
                {isAdmin && <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
                  <Btn sm onClick={() => openEdit(prod)}><i className="ti ti-edit" /></Btn>
                  <Btn sm variant="danger" onClick={() => del(prod)}><i className="ti ti-trash" /></Btn>
                </div>}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{t('partsPerUnit')}</div>
            <div className="bom-list">
              {prod.bom.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{t('noPartsDefined')}</div>
                : prod.bom.map((b, i) => {
                  const pt = parts.find(p => p.id === b.part_id);
                  return (
                    <div key={i} className="bom-item">
                      <span>{pt?.name || '?'}</span>
                      <span>{b.qty} × {pt ? fmt(pt.unit_cost) : '—'}</span>
                    </div>
                  );
                })}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {t('partsCostPerUnit')} <strong style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{fmt(bomCost)}</strong>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{t('productStock')}</span>
              <strong style={{ fontWeight: 500 }}>{stock}</strong>
              {productStockBadge(stock, t)}
            </div>
          </div>
        );
      })}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editProduct') : t('addProduct')} wide>
        <FormRow cols={2}>
          <Field label={t('productName')}><input value={form.name} onChange={f('name')} placeholder={t('enterProductName')} /></Field>
          <Field label={t('productSku')}><input value={form.sku} onChange={f('sku')} placeholder={t('enterSku')} /></Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label={t('salePriceRon')}><input type="number" min="0" step="0.01" value={form.price} onChange={f('price')} /></Field>
          <Field label={t('stock')}><input type="number" min="0" step="1" value={form.qty} onChange={f('qty')} /></Field>
          <Field label={t('description')}><input value={form.description} onChange={f('description')} placeholder={t('enterDescription')} /></Field>
        </FormRow>

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t('billOfMaterials')}</label>
            <Btn sm onClick={addBomRow}><i className="ti ti-plus" /> {t('addPart')}</Btn>
          </div>
          {bom.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>{t('noPartsAddedYet')}</div>
            : bom.map((row, i) => (
              <div key={i} className="bom-row">
                <select value={row.part_id} onChange={e => updateBomRow(i, 'part_id', parseInt(e.target.value))} style={{ flex: 1 }}>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min="1" value={row.qty} onChange={e => updateBomRow(i, 'qty', parseInt(e.target.value) || 1)} style={{ width: 65 }} />
                <Btn sm variant="danger" onClick={() => removeBomRow(i)}><i className="ti ti-trash" /></Btn>
              </div>
            ))}
        </div>

        <ErrorMsg msg={err} />
        <ModalActions>
          <Btn onClick={() => setOpen(false)}>{t('cancel')}</Btn>
          <Btn variant="primary" onClick={save}>{t('saveProduct')}</Btn>
        </ModalActions>
      </Modal>

      <ConfirmDialog />
    </>
  );
}
