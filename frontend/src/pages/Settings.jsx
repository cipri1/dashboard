import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Btn, FormRow, Field, Spinner, ErrorMsg } from '../components/ui';

const FIELDS = [
  { key: 'company_name',    label: 'Company name',    placeholder: 'My Company SRL' },
  { key: 'company_address', label: 'Street address',  placeholder: 'Str. Exemplu 1' },
  { key: 'company_city',    label: 'City',            placeholder: 'Cluj-Napoca' },
  { key: 'company_country', label: 'Country',         placeholder: 'Romania' },
  { key: 'company_phone',   label: 'Phone',           placeholder: '+40 700 000 000' },
  { key: 'company_email',   label: 'Email',           placeholder: 'contact@mycompany.com' },
];

export default function Settings() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getSettings()
      .then(data => setForm(data))
      .catch(e => setErr(e.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setErr(''); setSaved(false);
    try {
      await api.updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const f = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: 600 }}>
      <Card title="Expeditor / Company info">
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          This information appears as the <strong style={{ fontWeight: 500 }}>FROM</strong> address on every shipping label you print.
        </p>

        <FormRow cols={2}>
          {FIELDS.slice(0, 2).map(f2 => (
            <Field key={f2.key} label={f2.label}>
              <input value={form[f2.key] || ''} onChange={f(f2.key)} placeholder={f2.placeholder} />
            </Field>
          ))}
        </FormRow>
        <FormRow cols={2}>
          {FIELDS.slice(2, 4).map(f2 => (
            <Field key={f2.key} label={f2.label}>
              <input value={form[f2.key] || ''} onChange={f(f2.key)} placeholder={f2.placeholder} />
            </Field>
          ))}
        </FormRow>
        <FormRow cols={2}>
          {FIELDS.slice(4, 6).map(f2 => (
            <Field key={f2.key} label={f2.label}>
              <input value={form[f2.key] || ''} onChange={f(f2.key)} placeholder={f2.placeholder} />
            </Field>
          ))}
        </FormRow>

        <ErrorMsg msg={err} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.5rem' }}>
          <Btn variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Btn>
          {saved && (
            <span style={{ fontSize: 12, color: 'var(--color-text-success)' }}>
              <i className="ti ti-circle-check" /> Saved successfully
            </span>
          )}
        </div>
      </Card>

      {/* Label preview */}
      <Card title="Shipping label preview">
        <div style={{
          width: 280, margin: '0 auto',
          border: '1.5px solid var(--color-text-primary)',
          borderRadius: 4, padding: '16px 18px',
          fontFamily: 'monospace', fontSize: 11,
          background: 'var(--color-background-primary)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>SHIPPING LABEL</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Sale #— &nbsp;|&nbsp; {new Date().toLocaleDateString()}</div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-text-primary)', marginBottom: 10 }} />

          <div style={{ fontSize: 8, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 4 }}>FROM:</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{form.company_name || '—'}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{form.company_address || '—'}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{form.company_city || '—'}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{form.company_country || '—'}</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginBottom: 10 }}>{form.company_phone || '—'} &nbsp; {form.company_email || '—'}</div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--color-border-secondary)', marginBottom: 10 }} />

          <div style={{ fontSize: 8, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 4 }}>TO:</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Client Name</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>Company SRL</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>Street address</div>
          <div style={{ fontSize: 10, marginBottom: 8 }}>City, Country</div>

          <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 3, padding: '6px 8px' }}>
            <div style={{ fontSize: 8, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 3 }}>PRODUCT</div>
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2 }}>Product name here</div>
            <div style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>SKU: XXX-001 &nbsp;&nbsp; QTY: 1</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 10 }}>
          Preview — actual label is A6 PDF
        </p>
      </Card>
    </div>
  );
}
