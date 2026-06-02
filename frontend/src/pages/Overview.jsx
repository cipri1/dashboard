import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, fmt, stockBadge, saleBadge, Spinner } from '../components/ui';

export default function Overview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([api.getSales(), api.getParts(), api.getClients(), api.getProducts()])
      .then(([sales, parts, clients, products]) => setData({ sales, parts, clients, products }));
  }, []);

  if (!data) return <Spinner />;
  const { sales, parts, clients, products } = data;

  const paidRev = sales.filter(s => s.status === 'Paid').reduce((a, s) => a + s.qty * s.price, 0);
  const pendingRev = sales.filter(s => s.status === 'Pending').reduce((a, s) => a + s.qty * s.price, 0);
  const aborted = sales.filter(s => s.status === 'Aborted').length;
  const lowOrOut = parts.filter(p => p.qty < p.min_stock);
  const recent = [...sales].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div>
      <div className="metrics">
        {[
          { label: 'Revenue (paid)', value: fmt(paidRev), sub: `${sales.filter(s => s.status === 'Paid').length} sales` },
          { label: 'Pending', value: fmt(pendingRev), sub: `${sales.filter(s => s.status === 'Pending').length} invoice(s)` },
          { label: 'Aborted', value: aborted, sub: 'cancelled' },
          { label: 'Clients', value: clients.length, sub: 'active' },
          { label: 'Products', value: products.length, sub: 'in catalog' },
          { label: 'Parts alerts', value: lowOrOut.length, sub: 'need attention' },
        ].map(m => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card title="Low / out of stock parts">
          {lowOrOut.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>All parts sufficiently stocked.</p>
            : <table><thead><tr><th>Part</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>{lowOrOut.map(p => (
                <tr key={p.id}><td>{p.name}</td><td>{p.qty}/{p.min_stock}</td><td>{stockBadge(p.qty, p.min_stock)}</td></tr>
              ))}</tbody></table>}
        </Card>
        <Card title="Recent sales">
          <table><thead><tr><th>Product</th><th>Client</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>{recent.map(s => (
              <tr key={s.id}>
                <td>{s.product_name}</td>
                <td>{s.client_name}</td>
                <td>{saleBadge(s.status)}</td>
                <td>{fmt(s.qty * s.price)}</td>
              </tr>
            ))}</tbody></table>
        </Card>
      </div>
    </div>
  );
}
