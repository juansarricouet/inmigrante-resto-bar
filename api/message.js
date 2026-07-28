const redis = require('../lib/redis');

/* Los pedidos viven en una lista de Redis (LPUSH atómico para altas);
   menú, bebidas, stock y clientes son claves JSON simples. */

async function getOrders() {
  return (await redis.lrange('orders', 0, -1)) || [];
}

async function setOrders(orders) {
  const p = redis.pipeline();
  p.del('orders');
  if (orders.length) p.rpush('orders', ...orders.map(o => JSON.stringify(o)));
  await p.exec();
}

async function getVal(key, fallback) {
  const v = await redis.get(key);
  return v === null || v === undefined ? fallback : v;
}

async function setVal(key, value) {
  await redis.set(key, JSON.stringify(value));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const msg = req.body || {};

  try {
    switch (msg.type) {

      case 'new-order': {
        await redis.lpush('orders', JSON.stringify(msg.order));
        await redis.ltrim('orders', 0, 999);
        if (msg.order && msg.order.customer && msg.order.customer.phone) {
          const customers = await getVal('customers', []);
          const c = customers.find(x => x.phone === msg.order.customer.phone);
          if (c) {
            c.orders = (c.orders || 0) + 1;
            c.totalSpent = (c.totalSpent || 0) + msg.order.total;
            c.lastOrder = msg.order.ts;
            await setVal('customers', customers);
          }
        }
        return res.json({ ok: true });
      }

      case 'menu-update':
        await setVal('menu', msg.menu);
        return res.json({ ok: true });

      case 'drinks-update':
        await setVal('drinks', msg.drinks);
        return res.json({ ok: true });

      case 'stock-update':
        await setVal('stock', msg.stock);
        return res.json({ ok: true });

      case 'order-status': {
        const orders = await getOrders();
        const o = orders.find(x => x.id === msg.id);
        if (o) { o.status = msg.status; await setOrders(orders); }
        return res.json({ ok: true });
      }

      case 'order-delete': {
        const orders = (await getOrders()).filter(o => o.id !== msg.id);
        await setOrders(orders);
        return res.json({ ok: true });
      }

      case 'clear-entregados': {
        const orders = (await getOrders()).filter(o => o.status !== 'entregado');
        await setOrders(orders);
        return res.json({ ok: true });
      }

      case 'register-customer': {
        const customers = await getVal('customers', []);
        const c = msg.customer || {};
        if (c.phone && !customers.find(x => x.phone === c.phone)) {
          c.id = Date.now();
          c.orders = 0;
          c.totalSpent = 0;
          customers.push(c);
          await setVal('customers', customers);
        }
        return res.json({ type: 'customers-update', customers });
      }

      case 'find-customer': {
        const customers = await getVal('customers', []);
        const found = customers.find(x => x.phone === msg.phone) || null;
        return res.json({ type: 'customer-found', customer: found, _cb: msg._cb });
      }

      case 'get-customers': {
        const customers = await getVal('customers', []);
        return res.json({ type: 'customers-update', customers });
      }

      default:
        return res.status(400).json({ error: 'unknown message type' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
