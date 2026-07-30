/**
 * Datos de demostración: "Café Martina", cafetería de especialidad en Palermo.
 * Genera ~8 meses de historia realista (clientes, visitas, respuestas, escaneos,
 * segmentos y campañas) con un RNG determinístico.
 *
 * Se usa desde `npm run seed` (scripts/seed.mjs) y desde POST /api/auth/demo.
 */
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema.mjs";

export const DEMO_EMAIL = "demo@synapbase.app";
export const DEMO_PASSWORD = "synapse-demo";

const DAY = 86400000;

/* RNG determinístico (mulberry32) para que la demo sea estable */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const uid = () => crypto.randomUUID();

const FIRST_NAMES = [
  ["Sofía", "F"], ["Valentina", "F"], ["Camila", "F"], ["Martina", "F"], ["Lucía", "F"],
  ["Julieta", "F"], ["Agustina", "F"], ["Micaela", "F"], ["Florencia", "F"], ["Carolina", "F"],
  ["Paula", "F"], ["Rocío", "F"], ["Milagros", "F"], ["Josefina", "F"], ["Catalina", "F"],
  ["Ana", "F"], ["Laura", "F"], ["Mariana", "F"], ["Victoria", "F"], ["Celeste", "F"],
  ["Juan", "M"], ["Mateo", "M"], ["Santiago", "M"], ["Tomás", "M"], ["Joaquín", "M"],
  ["Facundo", "M"], ["Nicolás", "M"], ["Franco", "M"], ["Bruno", "M"], ["Ramiro", "M"],
  ["Lucas", "M"], ["Federico", "M"], ["Gonzalo", "M"], ["Martín", "M"], ["Iván", "M"],
  ["Diego", "M"], ["Pablo", "M"], ["Andrés", "M"], ["Sebastián", "M"], ["Ezequiel", "M"],
];
const LAST_NAMES = [
  "González", "Rodríguez", "Fernández", "López", "Martínez", "Pérez", "Gómez", "Sánchez",
  "Díaz", "Romero", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez",
  "Medina", "Herrera", "Aguirre", "Pereyra", "Gutiérrez", "Molina", "Silva", "Castro",
  "Rojas", "Ortiz", "Núñez", "Luna", "Juárez", "Cabrera", "Ríos", "Morales", "Godoy", "Vega",
];

const PRODUCTS = [
  { name: "Flat white", price: 3800, w: 10 },
  { name: "Cappuccino", price: 3600, w: 9 },
  { name: "Latte", price: 3700, w: 7 },
  { name: "Espresso", price: 2800, w: 5 },
  { name: "Cold brew", price: 4200, w: 4 },
  { name: "Té chai", price: 3900, w: 3 },
  { name: "Medialunas", price: 2400, w: 8 },
  { name: "Tostado de jamón y queso", price: 6500, w: 6 },
  { name: "Avo toast", price: 7200, w: 5 },
  { name: "Budín de banana", price: 3200, w: 4 },
  { name: "Cheesecake", price: 4800, w: 3 },
  { name: "Yogur con granola", price: 4500, w: 2 },
];

const SOURCES = ["Pasaba por el local", "Instagram", "Me lo recomendaron", "Google Maps", "Otro"];
const SOURCE_W = [30, 34, 20, 12, 4];

function pickWeighted(rand, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Hora realista para una cafetería: pico 9-12 y 16-19 */
function pickHour(rand) {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const weights = [4, 9, 11, 10, 7, 4, 3, 4, 7, 9, 8, 5, 2];
  return pickWeighted(rand, hours, weights);
}

const AR_TZ = "America/Argentina/Buenos_Aires";
function localWeekday(date) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: AR_TZ, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

/** Fecha con la hora local deseada dentro del día dado (aprox, TZ AR = UTC-3) */
function atHour(dayMs, hour, rand) {
  const d = new Date(dayMs);
  d.setUTCHours(hour + 3, Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
  return d;
}

export function ensureDemoData(dbPath) {
  const resolved = dbPath || process.env.SYNAPBASE_DB || path.join(process.cwd(), "data", "synapbase.db");
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new DatabaseSync(resolved);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_EMAIL);
  if (existing) {
    db.close();
    return { created: false };
  }

  const rand = rng(20260728);
  const now = Date.now();
  const nowIso = () => new Date().toISOString();

  db.exec("BEGIN");
  try {
    /* ————— Cuentas ————— */
    const ownerId = uid();
    db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
      ownerId, DEMO_EMAIL, "Martina López", hashPassword(DEMO_PASSWORD), new Date(now - 240 * DAY).toISOString(),
    );
    const adminId = uid();
    db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
      adminId, "julian@cafemartina.com", "Julián Paz", hashPassword(DEMO_PASSWORD), new Date(now - 200 * DAY).toISOString(),
    );

    const bizId = uid();
    db.prepare(
      `INSERT INTO businesses (id, name, slug, category, address, phone, brand_color, hours, plan, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      bizId, "Café Martina", "cafe-martina", "Cafetería de especialidad",
      "Armenia 1602, Palermo, CABA", "+54 11 5555 0199", "#5b5bd6",
      "Lun a Vie 8:00–20:00 · Sáb y Dom 9:00–21:00", "pro",
      new Date(now - 240 * DAY).toISOString(),
    );
    db.prepare("INSERT INTO memberships (id, user_id, business_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)").run(
      uid(), ownerId, bizId, new Date(now - 240 * DAY).toISOString(),
    );
    db.prepare("INSERT INTO memberships (id, user_id, business_id, role, created_at) VALUES (?, ?, ?, 'admin', ?)").run(
      uid(), adminId, bizId, new Date(now - 200 * DAY).toISOString(),
    );
    db.prepare(
      "INSERT INTO invitations (id, business_id, email, role, token, status, created_at) VALUES (?, ?, ?, 'miembro', ?, 'pending', ?)",
    ).run(uid(), bizId, "caja@cafemartina.com", "inv" + Math.floor(rand() * 1e9).toString(36), new Date(now - 6 * DAY).toISOString());

    /* ————— Formulario principal ————— */
    const formId = uid();
    const formCreated = new Date(now - 235 * DAY).toISOString();
    db.prepare(
      `INSERT INTO forms (id, business_id, name, slug, status, incentive, welcome_title, welcome_text, success_title, success_text, theme_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      formId, bizId, "Formulario principal", "cafe-martina",
      "10% de descuento en tu próxima visita",
      "¡Hola! Somos Café Martina ☕",
      "Contanos quién sos y llevate un beneficio para tu próxima visita. Te toma 30 segundos.",
      "¡Gracias por contarnos!",
      "Mostrá este código en la caja para usar tu descuento la próxima vez que vengas.",
      JSON.stringify({ color: "#5b5bd6", showLogo: true, emoji: "☕" }),
      formCreated, formCreated,
    );

    const q = {};
    const questionDefs = [
      ["name", { type: "text", label: "¿Cómo te llamás?", placeholder: "Tu nombre", required: 1, maps_to: "name" }],
      ["product", { type: "multiselect", label: "¿Qué pediste hoy?", options: PRODUCTS.map((p) => p.name), required: 1, maps_to: "product" }],
      ["phone", { type: "text", label: "Tu teléfono", placeholder: "Ej.: 11 5555 0000", maps_to: "phone" }],
      ["email", { type: "text", label: "Tu email", placeholder: "nombre@email.com", maps_to: "email" }],
      ["source", { type: "select", label: "¿Cómo nos conociste?", options: SOURCES }],
      ["nps", { type: "scale", label: "¿Qué tan probable es que nos recomiendes?", scale_max: 10 }],
      ["gender", { type: "select", label: "Género", options: ["Femenino", "Masculino", "Prefiero no decirlo"], maps_to: "gender" }],
      ["age", { type: "number", label: "¿Cuántos años tenés?", placeholder: "Ej.: 28", maps_to: "age" }],
      ["amount", { type: "number", label: "¿Cuánto gastaste hoy aprox.?", placeholder: "En pesos", maps_to: "amount" }],
    ];
    questionDefs.forEach(([key, def], i) => {
      const qid = uid();
      q[key] = qid;
      db.prepare(
        `INSERT INTO questions (id, form_id, type, label, placeholder, options_json, required, active, position, maps_to, scale_max, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      ).run(
        qid, formId, def.type, def.label, def.placeholder ?? null,
        JSON.stringify(def.options ?? []), def.required ?? 0, i,
        def.maps_to ?? null, def.scale_max ?? null, formCreated,
      );
    });

    /* Segundo formulario, para mostrar multi-formulario */
    const form2Id = uid();
    const f2Created = new Date(now - 90 * DAY).toISOString();
    db.prepare(
      `INSERT INTO forms (id, business_id, name, slug, status, incentive, welcome_title, welcome_text, theme_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'paused', ?, ?, ?, ?, ?, ?)`,
    ).run(
      form2Id, bizId, "Encuesta brunch de fin de semana", "martina-brunch",
      "Una medialuna de regalo",
      "¿Un minuto para el brunch? 🥐",
      "Queremos armar la mejor carta de brunch de Palermo. Ayudanos con tu opinión.",
      JSON.stringify({ color: "#b45309", showLogo: true, emoji: "🥐" }),
      f2Created, f2Created,
    );
    [
      { type: "text", label: "¿Cómo te llamás?", required: 1, maps_to: "name" },
      { type: "select", label: "¿Qué día venís más seguido?", options: ["Sábado", "Domingo", "Ambos", "Casi nunca"] },
      { type: "multiselect", label: "¿Qué te gustaría ver en la carta?", options: ["Pancakes", "Huevos benedictinos", "Croissant relleno", "Jugos prensados", "Opción vegana"] },
      { type: "scale", label: "¿Cómo calificás nuestro brunch actual?", scale_max: 5 },
    ].forEach((def, i) => {
      db.prepare(
        `INSERT INTO questions (id, form_id, type, label, placeholder, options_json, required, active, position, maps_to, scale_max, created_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?, ?, ?, ?)`,
      ).run(uid(), form2Id, def.type, def.label, JSON.stringify(def.options ?? []), def.required ?? 0, i, def.maps_to ?? null, def.scale_max ?? null, f2Created);
    });

    /* ————— Etiquetas ————— */
    const tagIds = {};
    for (const [name, color] of [["VIP", "amber"], ["Frecuente", "violet"], ["Nuevo", "sky"], ["Vegetariano", "green"]]) {
      const id = uid();
      tagIds[name] = id;
      db.prepare("INSERT INTO tags (id, business_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)").run(
        id, bizId, name, color, formCreated,
      );
    }

    /* ————— Clientes + visitas ————— */
    const usedNames = new Set();
    const customers = [];
    const N_CUSTOMERS = 185;
    for (let i = 0; i < N_CUSTOMERS; i++) {
      let first, gender, last, full;
      do {
        [first, gender] = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
        last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
        full = `${first} ${last}`;
      } while (usedNames.has(full));
      usedNames.add(full);

      // Antigüedad: sesgo a clientes recientes, pero con base histórica
      const seniorityDays = Math.floor(Math.pow(rand(), 1.4) * 225) + 2;
      // Visitas: power-law (mayoría 1-2, pocos muy fieles)
      const r = rand();
      let visits;
      if (r < 0.42) visits = 1;
      else if (r < 0.68) visits = 2 + Math.floor(rand() * 2);
      else if (r < 0.88) visits = 4 + Math.floor(rand() * 4);
      else if (r < 0.97) visits = 8 + Math.floor(rand() * 8);
      else visits = 16 + Math.floor(rand() * 12);
      visits = Math.min(visits, Math.max(1, Math.floor(seniorityDays / 6)));

      const hasPhone = rand() < 0.62;
      const hasEmail = rand() < 0.55;
      const saysGender = rand() < 0.78;
      const saysAge = rand() < 0.66;
      const age = saysAge ? 18 + Math.floor(Math.pow(rand(), 1.15) * 42) : null;

      // Preferencias de consumo propias de cada cliente
      const favIdx = pickWeighted(rand, PRODUCTS.map((_, idx) => idx), PRODUCTS.map((p) => p.w));
      const source = pickWeighted(rand, SOURCES, SOURCE_W);

      customers.push({
        id: uid(),
        name: full,
        gender: saysGender ? (gender === "F" ? "Femenino" : "Masculino") : null,
        age,
        phone: hasPhone ? `115${String(Math.floor(1000000 + rand() * 8999999))}` : null,
        email: hasEmail ? `${first.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}.${last.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}${Math.floor(rand() * 90) + 10}@gmail.com` : null,
        seniorityDays, visits, favIdx, source,
        npsBase: 6 + Math.floor(rand() * 5),
      });
    }

    const insCustomer = db.prepare(
      `INSERT INTO customers (id, business_id, name, phone, email, gender, age, first_visit_at, last_visit_at, visits, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insSub = db.prepare(
      `INSERT INTO submissions (id, business_id, form_id, customer_id, product, amount, discount_code, hour, weekday, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insAns = db.prepare("INSERT INTO answers (id, submission_id, question_id, value_json) VALUES (?, ?, ?, ?)");
    const insScan = db.prepare("INSERT INTO scans (id, business_id, form_id, created_at) VALUES (?, ?, ?, ?)");

    let totalSubs = 0;
    for (const c of customers) {
      const firstDay = now - c.seniorityDays * DAY;
      // Distribuir visitas entre el primer día y ahora (más densas al final)
      const visitDays = [];
      for (let v = 0; v < c.visits; v++) {
        const t = c.visits === 1 ? 0 : v / (c.visits - 1);
        const jitter = (rand() - 0.5) * 0.18;
        const pos = Math.min(1, Math.max(0, Math.pow(t, 0.85) + jitter));
        visitDays.push(firstDay + pos * (now - firstDay) * 0.985);
      }
      visitDays.sort((a, b) => a - b);

      // Precomputar fecha+hora de cada visita para conocer primera/última
      const visitDates = visitDays.map((dayMs) => {
        const hour = pickHour(rand);
        return { hour, date: atHour(dayMs, hour, rand) };
      });
      const firstIso = visitDates[0].date.toISOString();
      const lastIso = visitDates[visitDates.length - 1].date.toISOString();

      // El cliente debe existir antes que sus visitas (FK)
      insCustomer.run(
        c.id, bizId, c.name, c.phone, c.email, c.gender, c.age,
        firstIso, lastIso, c.visits, firstIso,
      );

      visitDates.forEach(({ hour, date }, idx) => {
        const iso = date.toISOString();

        // Pedido: favorito con alta probabilidad + acompañamiento
        const items = [];
        const favProduct = PRODUCTS[c.favIdx];
        if (rand() < 0.72) items.push(favProduct);
        else items.push(PRODUCTS[pickWeighted(rand, PRODUCTS.map((_, i2) => i2), PRODUCTS.map((p) => p.w))]);
        if (rand() < 0.45) {
          const second = PRODUCTS[pickWeighted(rand, PRODUCTS.map((_, i2) => i2), PRODUCTS.map((p) => p.w))];
          if (!items.includes(second)) items.push(second);
        }
        const productStr = items.map((p) => p.name).join(", ");
        const amount = Math.round(items.reduce((a, p) => a + p.price, 0) * (0.92 + rand() * 0.25));

        const subId = uid();
        insSub.run(
          subId, bizId, formId, c.id, productStr, amount,
          `MAR-${Math.floor(rand() * 1296).toString(36).padStart(2, "0").toUpperCase()}${Math.floor(rand() * 1296).toString(36).padStart(2, "0").toUpperCase()}`,
          hour, localWeekday(date), iso,
        );
        totalSubs++;

        insAns.run(uid(), subId, q.name, JSON.stringify(c.name.split(" ")[0]));
        insAns.run(uid(), subId, q.product, JSON.stringify(items.map((p) => p.name)));
        if (c.phone) insAns.run(uid(), subId, q.phone, JSON.stringify(c.phone));
        if (c.email && rand() < 0.8) insAns.run(uid(), subId, q.email, JSON.stringify(c.email));
        if (idx === 0) insAns.run(uid(), subId, q.source, JSON.stringify(c.source));
        if (rand() < 0.75) {
          const nps = Math.max(1, Math.min(10, c.npsBase + Math.floor(rand() * 3) - 1));
          insAns.run(uid(), subId, q.nps, JSON.stringify(nps));
        }
        if (c.gender) insAns.run(uid(), subId, q.gender, JSON.stringify(c.gender));
        if (c.age != null) insAns.run(uid(), subId, q.age, JSON.stringify(c.age));
        insAns.run(uid(), subId, q.amount, JSON.stringify(amount));

        // Escaneos: cada visita implica 1 escaneo + escaneos que no convirtieron
        insScan.run(uid(), bizId, formId, iso);
        if (rand() < 0.75) {
          const extra = atHour(date.getTime(), pickHour(rand), rand);
          insScan.run(uid(), bizId, formId, extra.toISOString());
        }
      });
    }

    /* Etiquetas asignadas con criterio */
    const byVisits = [...customers].sort((a, b) => b.visits - a.visits);
    for (const c of byVisits.slice(0, 9)) {
      db.prepare("INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?, ?)").run(c.id, tagIds.VIP);
    }
    for (const c of customers.filter((x) => x.visits >= 6)) {
      db.prepare("INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?, ?)").run(c.id, tagIds.Frecuente);
    }
    for (const c of customers.filter((x) => x.seniorityDays <= 21)) {
      db.prepare("INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?, ?)").run(c.id, tagIds.Nuevo);
    }
    for (const c of customers) {
      if (rand() < 0.07) db.prepare("INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?, ?)").run(c.id, tagIds.Vegetariano);
    }

    /* Notas en algunos clientes destacados */
    const notes = [
      "Siempre pide el flat white con leche de almendras. Cliente de la mañana.",
      "Vino al evento de cata de octubre. Muy fan del cold brew.",
      "Trabaja en la oficina de la esquina, viene con el equipo los viernes.",
      "Le gustó la propuesta vegana, preguntar por nuevos productos.",
    ];
    byVisits.slice(0, 4).forEach((c, i) => {
      db.prepare("UPDATE customers SET notes = ? WHERE id = ?").run(notes[i], c.id);
    });

    /* ————— Segmentos ————— */
    const segs = [
      {
        name: "Clientes frecuentes", description: "Vinieron 5 veces o más",
        rules: [{ field: "visits", op: "gte", value: 5 }],
      },
      {
        name: "Inactivos hace 30+ días", description: "Para campañas de recupero",
        rules: [{ field: "last_visit_days", op: "gte", value: 30 }],
      },
      {
        name: "Fans del flat white", description: "Pidieron flat white alguna vez y dejaron teléfono",
        rules: [{ field: "product", op: "contains", value: "Flat white" }, { field: "has_phone", op: "eq", value: true }],
      },
      {
        name: "Ticket alto", description: "Gastaron más de $40.000 en total",
        rules: [{ field: "total_spent", op: "gte", value: 40000 }],
      },
      {
        name: "Jóvenes 18–30", description: "Edad entre 18 y 30 años",
        rules: [{ field: "age", op: "between", min: 18, max: 30 }],
      },
    ];
    const segIds = {};
    for (const s of segs) {
      const id = uid();
      segIds[s.name] = id;
      db.prepare(
        "INSERT INTO segments (id, business_id, name, description, rules_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(id, bizId, s.name, s.description, JSON.stringify(s.rules), new Date(now - 120 * DAY).toISOString(), new Date(now - 40 * DAY).toISOString());
    }

    /* ————— Campañas ————— */
    const camp1 = uid();
    const sentAt = new Date(now - 52 * DAY).toISOString();
    db.prepare(
      `INSERT INTO campaigns (id, business_id, name, channel, segment_id, message, status, sent_at, audience_count, created_at, updated_at)
       VALUES (?, ?, ?, 'whatsapp', ?, ?, 'sent', ?, ?, ?, ?)`,
    ).run(
      camp1, bizId, "Volvió el budín de banana 🍌", segIds["Clientes frecuentes"],
      "Hola {{nombre}} 👋 ¡Volvió el budín de banana que tanto pedían! Esta semana, si venís por la tarde, te lo llevás con 2x1. Te esperamos en Armenia 1602.",
      sentAt, 0, new Date(now - 54 * DAY).toISOString(), sentAt,
    );
    // Materializar destinatarios de la campaña enviada
    const freqCustomers = customers.filter((c) => c.visits >= 5 && c.phone);
    let sentCount = 0;
    for (const c of freqCustomers) {
      db.prepare(
        "INSERT INTO campaign_recipients (id, campaign_id, customer_id, channel_to, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'sent', ?, ?)",
      ).run(uid(), camp1, c.id, c.phone, sentAt, sentAt);
      sentCount++;
    }
    db.prepare("UPDATE campaigns SET audience_count = ? WHERE id = ?").run(sentCount, camp1);

    db.prepare(
      `INSERT INTO campaigns (id, business_id, name, channel, segment_id, message, status, audience_count, created_at, updated_at)
       VALUES (?, ?, ?, 'whatsapp', ?, ?, 'draft', 0, ?, ?)`,
    ).run(
      uid(), bizId, "Te extrañamos ❤️", segIds["Inactivos hace 30+ días"],
      "Hola {{nombre}}, hace un tiempo que no venís por Café Martina. Esta semana tenés un beneficio especial esperándote: mostrá este mensaje y llevate un 15% en tu {{producto_favorito}}.",
      new Date(now - 9 * DAY).toISOString(), new Date(now - 2 * DAY).toISOString(),
    );

    db.prepare(
      `INSERT INTO campaigns (id, business_id, name, channel, segment_id, subject, message, status, scheduled_for, audience_count, created_at, updated_at)
       VALUES (?, ?, ?, 'email', ?, ?, ?, 'scheduled', ?, 0, ?, ?)`,
    ).run(
      uid(), bizId, "Novedades de la carta de invierno", segIds["Ticket alto"],
      "Llegó la carta de invierno ❄️",
      "Hola {{nombre_completo}}: como cliente de la casa queremos que seas de los primeros en probar la nueva carta de invierno. Reservá tu mesa esta semana y el postre va por nuestra cuenta.",
      new Date(now + 5 * DAY).toISOString(), new Date(now - 1 * DAY).toISOString(), new Date(now - 1 * DAY).toISOString(),
    );

    db.exec("COMMIT");
    db.close();
    return { created: true, customers: customers.length, submissions: totalSubs };
  } catch (err) {
    db.exec("ROLLBACK");
    db.close();
    throw err;
  }
}
