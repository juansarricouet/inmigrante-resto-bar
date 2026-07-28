const redis = require('../lib/redis');

module.exports = async (req, res) => {
  try {
    const [orders, menu, drinks, stock, customers] = await Promise.all([
      redis.lrange('orders', 0, -1),
      redis.get('menu'),
      redis.get('drinks'),
      redis.get('stock'),
      redis.get('customers')
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      orders:    orders    || [],
      menu:      menu      || null,
      drinks:    drinks    || null,
      stock:     stock     || {},
      customers: customers || []
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
