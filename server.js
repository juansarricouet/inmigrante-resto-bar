const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT       = process.env.PORT || 3000;
const STATIC_DIR = __dirname;
const DATA_FILE  = path.join(__dirname, 'data.json');

/* ── Data store (memory + file) ── */
let store = { orders: [], menu: null, drinks: null, stock: {} };
if (fs.existsSync(DATA_FILE)) {
  try { store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
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
        persist();
        broadcast(msg, ws);   // notify all admins (and other bar-apps)
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
