import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Card, Modal, ModalActions, Btn, FormRow, Field, fmt, stockBadge, useConfirm, PermNotice, Spinner, ErrorMsg } from '../components/ui';

const empty = { name: '', sku: '', qty: 0, min_stock: 0, unit_cost: 0 };

export default function Parts() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [parts, setParts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() { setParts(await api.getParts()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setEditing(null); setErr(''); setOpen(true); }
  function openEdit(p) { setForm({ name: p.name, sku: p.sku, qty: p.qty, min_stock: p.min_stock, unit_cost: p.unit_cost }); setEditing(p.id); setErr(''); setOpen(true); }

  async function save() {
    setErr('');
    try {
      if (editing) await api.updatePart(editing, form);
      else await api.createPart(form);
      setOpen(false); load();
    } catch (e) { setErr(e.message); }
  }

  function del(p) {
    confirm(t('deletePartQuestion', { name: p.name }), async () => {
      try { await api.deletePart(p.id); load(); } catch (e) { alert(e.message); }
    });
  }

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  if (loading) return <Spinner />;

  return (
    <>
      {!isAdmin && <PermNotice>{t('onlyAdminsCanManageParts')}</PermNotice>}
      <Card title={t('partsInventory')} action={isAdmin && <Btn variant="primary" sm onClick={openAdd}><i className="ti ti-plus" /> {t('addPart')}</Btn>}>
        <table>
          <thead><tr><th>{t('partName')}</th><th>{t('partSku')}</th><th>{t('qtyInStock')}</th><th>{t('minStock')}</th><th>{t('unitCostRon')}</th><th>{t('status')}</th>{isAdmin && <th>{t('actions')}</th>}</tr></thead>
          <tbody>{parts.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.sku}</td>
              <td style={{ fontWeight: 500 }}>{p.qty}</td>
              <td>{p.min_stock}</td>
              <td>{fmt(p.unit_cost)}</td>
              <td>{stockBadge(p.qty, p.min_stock)}</td>
              {isAdmin && <td><div style={{ display: 'flex', gap: 4 }}>
                <Btn sm onClick={() => openEdit(p)}><i className="ti ti-edit" /></Btn>
                <Btn sm variant="danger" onClick={() => del(p)}><i className="ti ti-trash" /></Btn>
              </div></td>}
            </tr>
          ))}</tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editPartTitle') : t('addPartTitle')}>
        <FormRow cols={2}>
          <Field label={t('partName')}><input value={form.name} onChange={f('name')} placeholder={t('enterPartName')} /></Field>
          <Field label={t('partSku')}><input value={form.sku} onChange={f('sku')} placeholder={t('enterPartSku')} /></Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label={t('qtyInStock')}><input type="number" min="0" value={form.qty} onChange={f('qty')} /></Field>
          <Field label={t('minStock')}><input type="number" min="0" value={form.min_stock} onChange={f('min_stock')} /></Field>
          <Field label={t('unitCostRon')}><input type="number" min="0" step="0.01" value={form.unit_cost} onChange={f('unit_cost')} /></Field>
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
