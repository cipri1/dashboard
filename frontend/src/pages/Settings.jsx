import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../hooks/useLanguage';
import { Card, Btn, FormRow, Field, Spinner, ErrorMsg } from '../components/ui';

const FIELDS = [
  { key: 'company_name',    labelKey: 'companyName',    placeholderKey: 'companyNameExample' },
  { key: 'company_address', labelKey: 'streetAddress',  placeholderKey: 'streetAddressExample' },
  { key: 'company_city',    labelKey: 'city',           placeholderKey: 'cityExample' },
  { key: 'company_country', labelKey: 'country',        placeholderKey: 'countryExample' },
  { key: 'company_phone',   labelKey: 'phone',          placeholderKey: 'phoneExample' },
  { key: 'company_email',   labelKey: 'emailLabel',     placeholderKey: 'emailExample' },
];

export default function Settings() {
  const { t } = useLanguage();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getSettings()
      .then(data => setForm(data))
      .catch(e => setErr(e.message || t('failedLoadSettings')))
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
      <Card title={t('settingsSenderCompanyInfo')}>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          {t('settingsInfoDescription')}
        </p>

        <FormRow cols={2}>
          {FIELDS.slice(0, 2).map(f2 => (
            <Field key={f2.key} label={t(f2.labelKey)}>
              <input value={form[f2.key] || ''} onChange={f(f2.key)} placeholder={t(f2.placeholderKey)} />
            </Field>
          ))}
        </FormRow>
        <FormRow cols={2}>
          {FIELDS.slice(2, 4).map(f2 => (
            <Field key={f2.key} label={t(f2.labelKey)}>
              <input value={form[f2.key] || ''} onChange={f(f2.key)} placeholder={t(f2.placeholderKey)} />
            </Field>
          ))}
        </FormRow>
        <FormRow cols={2}>
          {FIELDS.slice(4, 6).map(f2 => (
            <Field key={f2.key} label={t(f2.labelKey)}>
              <input value={form[f2.key] || ''} onChange={f(f2.key)} placeholder={t(f2.placeholderKey)} />
            </Field>
          ))}
        </FormRow>

        <ErrorMsg msg={err} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.5rem' }}>
          <Btn variant="primary" onClick={save} disabled={saving}>
            {saving ? t('saving') : t('saveSettings')}
          </Btn>
          {saved && (
            <span style={{ fontSize: 12, color: 'var(--color-text-success)' }}>
              <i className="ti ti-circle-check" /> {t('savedSuccessfully')}
            </span>
          )}
        </div>
      </Card>

      {/* Label preview */}
      <Card title={t('shippingLabelPreview')}>
        <div style={{
          width: 280, margin: '0 auto',
          border: '1.5px solid var(--color-text-primary)',
          borderRadius: 4, padding: '16px 18px',
          fontFamily: 'monospace', fontSize: 11,
          background: 'var(--color-background-primary)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>{t('shippingLabelHeading')}</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{t('saleNumber')} #— &nbsp;|&nbsp; {new Date().toLocaleDateString()}</div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-text-primary)', marginBottom: 10 }} />

          <div style={{ fontSize: 8, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 4 }}>{t('shippingLabelFrom')}</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{form.company_name || '—'}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{form.company_address || '—'}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{form.company_city || '—'}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{form.company_country || '—'}</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginBottom: 10 }}>{form.company_phone || '—'} &nbsp; {form.company_email || '—'}</div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--color-border-secondary)', marginBottom: 10 }} />

          <div style={{ fontSize: 8, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 4 }}>{t('shippingLabelTo')}</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{t('previewClientName')}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{t('previewCompanyName')}</div>
          <div style={{ fontSize: 10, marginBottom: 1 }}>{t('previewAddress')}</div>
          <div style={{ fontSize: 10, marginBottom: 8 }}>{t('previewCityCountry')}</div>

          <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 3, padding: '6px 8px' }}>
            <div style={{ fontSize: 8, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 3 }}>{t('shippingLabelProduct')}</div>
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2 }}>{t('productNamePlaceholder')}</div>
            <div style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>{t('skuLabel')}: XXX-001 &nbsp;&nbsp; {t('qtyLabel')}: 1</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 10 }}>
          {t('shippingLabelPreviewNote')}
        </p>
      </Card>
    </div>
  );
}
