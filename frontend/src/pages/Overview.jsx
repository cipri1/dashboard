import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../hooks/useLanguage';
import { Card, fmt, stockBadge, saleBadge, Spinner, productStockBadge } from '../components/ui';

export default function Overview() {
  const [data, setData] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    Promise.all([api.getSales(), api.getParts(), api.getClients(), api.getProducts()])
      .then(([sales, parts, clients, products]) => setData({ sales, parts, clients, products }));
  }, []);

  if (!data) return <Spinner />;
  const { sales, parts, clients, products } = data;

  const paidRev = sales.filter(s => s.status === 'Paid').reduce((a, s) => a + (s.items || []).reduce((sum, item) => sum + item.qty * item.price, 0), 0);
  const pendingRev = sales.filter(s => s.status === 'Pending').reduce((a, s) => a + (s.items || []).reduce((sum, item) => sum + item.qty * item.price, 0), 0);
  const aborted = sales.filter(s => s.status === 'Aborted').length;
  const lowOrOut = parts.filter(p => p.qty < p.min_stock);
  const productStocks = products.map(p => ({ ...p, stock: p.qty || 0 }));
  const availableProducts = productStocks.filter(p => p.stock > 0).length;
  const sellableUnits = productStocks.reduce((a, p) => a + p.stock, 0);
  const recent = [...sales].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div>
      <div className="metrics">
        {[
          { label: t('overviewRevenuePaid'), value: fmt(paidRev), sub: `${sales.filter(s => s.status === 'Paid').length} ${t('salesCountSuffix')}` },
          { label: t('overviewPending'), value: fmt(pendingRev), sub: `${sales.filter(s => s.status === 'Pending').length} ${t('invoiceCountSuffix')}` },
          { label: t('overviewAborted'), value: aborted, sub: t('cancelled') },
          { label: t('overviewClients'), value: clients.length, sub: t('overviewActive') },
          { label: t('overviewProducts'), value: products.length, sub: t('overviewInCatalog') },
          { label: t('overviewProductsInStock'), value: availableProducts, sub: t('overviewManuallyTracked') },
          { label: t('overviewStockUnits'), value: sellableUnits, sub: t('overviewInInventory') },
          { label: t('overviewPartsAlerts'), value: lowOrOut.length, sub: t('overviewNeedAttention') },
        ].map(m => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card title={t('overviewLowOutOfStockParts')}>
          {lowOrOut.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t('overviewAllPartsSufficient')}</p>
            : <table><thead><tr><th>{t('overviewTablePart')}</th><th>{t('overviewTableQty')}</th><th>{t('overviewTableStatus')}</th></tr></thead>
              <tbody>{lowOrOut.map(p => (
                <tr key={p.id}><td>{p.name}</td><td>{p.qty}/{p.min_stock}</td><td>{stockBadge(p.qty, p.min_stock, t)}</td></tr>
              ))}</tbody></table>}
        </Card>
        <Card title={t('overviewProductStock')}>
          {productStocks.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t('overviewNoProductsAvailable')}</p>
            : <table><thead><tr><th>{t('overviewTableProduct')}</th><th>{t('overviewTableAvailable')}</th><th>{t('overviewTableStatus')}</th></tr></thead>
              <tbody>{[...productStocks].sort((a, b) => a.stock - b.stock).map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.stock}</td>
                  <td>{productStockBadge(p.stock, t)}</td>
                </tr>
              ))}</tbody></table>}
        </Card>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Card title={t('overviewRecentSales')}>
          <table><thead><tr><th>{t('overviewTableProduct')}</th><th>{t('overviewTableClient')}</th><th>{t('overviewTableStatus')}</th><th>{t('overviewTableTotal')}</th></tr></thead>
            <tbody>{recent.map(s => {
              const items = s.items || [];
              const itemsStr = items.map(i => i.product_name).join(', ') || '—';
              const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);
              return (
                <tr key={s.id}>
                  <td>{itemsStr}</td>
                  <td>{s.client_name}</td>
                  <td>{saleBadge(s.status, t(`status${s.status}`))}</td>
                  <td>{fmt(total)}</td>
                </tr>
              );
            })}</tbody></table>
        </Card>
      </div>
    </div>
  );
}
