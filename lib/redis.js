const { Redis } = require('@upstash/redis');

// La integración de Upstash en el marketplace de Vercel inyecta
// UPSTASH_REDIS_REST_*; la antigua Vercel KV usaba KV_REST_API_*.
const url   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error('Falta conectar la base de datos: en Vercel → Storage → Upstash for Redis');
}

module.exports = new Redis({ url, token });
