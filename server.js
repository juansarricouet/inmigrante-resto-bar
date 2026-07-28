const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT       = process.env.PORT || 3000;
const STATIC_DIR = __dirname;
const DATA_DIR   = process.env.DATA_DIR || __dirname;
const DATA_FILE  = path.join(DATA_DIR, 'data.json');
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

/* ── Data store (memory + file) ── */
let store = { orders: [], menu: null, drinks: null, stock: {}, customers: [] };
if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    store = Object.assign({ orders:[], menu:null, drinks:null, stock:{}, customers:[] }, saved);
  } catch(e) {}
}
function persist() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2)); } catch(e) {}
}

/* ── MIME types ── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.mp3':  'audio/mpeg',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.json': 'application/json'
};

/* ── HTTP server (serves static files) ── */
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/bar-app.html';

  const filePath = path.resolve(path.join(STATIC_DIR, urlPath));

  // Security: only serve files inside STATIC_DIR
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

/* ── WebSocket server ── */
const wss = new WebSocketServer({ server });

function broadcast(msg, exclude) {
  const str = JSON.stringify(msg);
  wss.clients.forEach(c => {
    if (c !== exclude && c.readyState === 1) c.send(str);
  });
}

wss.on('connection', ws => {
  // Send current full state to new client
  ws.send(JSON.stringify({
    type:   'init',
    orders: store.orders,
    menu:   store.menu,
    drinks: store.drinks,
    stock:  store.stock
  }));

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch(e) { return; }

    switch (msg.type) {

      case 'new-order':
        store.orders.unshift(msg.order);
        if (store.orders.length > 1000) store.orders = store.orders.slice(0, 1000);
        // update customer stats
        if (msg.order.customer && msg.order.customer.phone) {
          const cust = store.customers.find(x => x.phone === msg.order.customer.phone);
          if (cust) { cust.orders = (cust.orders||0)+1; cust.totalSpent = (cust.totalSpent||0)+msg.order.total; cust.lastOrder = msg.order.ts; }
        }
        persist();
        broadcast(msg, ws);
        break;

      case 'menu-update':
        store.menu = msg.menu;
        persist();
        broadcast(msg, ws);
        break;

      case 'drinks-update':
        store.drinks = msg.drinks;
        persist();
        broadcast(msg, ws);
        break;

      case 'stock-update':
        store.stock = msg.stock;
        persist();
        broadcast(msg, ws);
        break;

      case 'order-status': {
        const o = store.orders.find(x => x.id === msg.id);
        if (o) { o.status = msg.status; persist(); }
        broadcast(msg, ws);
        break;
      }

      case 'order-delete':
        store.orders = store.orders.filter(o => o.id !== msg.id);
        persist();
        broadcast(msg, ws);
        break;

      case 'clear-entregados':
        store.orders = store.orders.filter(o => o.status !== 'entregado');
        persist();
        broadcast(msg, ws);
        break;

      case 'register-customer': {
        const c = msg.customer;
        const exists = store.customers.find(x => x.phone === c.phone);
        if (!exists) {
          c.id = Date.now();
          c.orders = 0;
          c.totalSpent = 0;
          store.customers.push(c);
          persist();
        }
        // notify admin of new/updated customer list
        broadcast({ type: 'customers-update', customers: store.customers }, null);
        break;
      }

      case 'find-customer': {
        const found = store.customers.find(x => x.phone === msg.phone);
        ws.send(JSON.stringify({ type: 'customer-found', customer: found || null, _cb: msg._cb }));
        break;
      }

      case 'get-customers':
        ws.send(JSON.stringify({ type: 'customers-update', customers: store.customers }));
        break;
    }
  });

  ws.on('error', () => {});
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✅  Inmigrante server corriendo en http://localhost:' + PORT);
  console.log('  📱  Menú clientes : http://localhost:' + PORT + '/bar-app.html');
  console.log('  🔑  Panel admin   : http://localhost:' + PORT + '/admin.html');
  console.log('');
});
