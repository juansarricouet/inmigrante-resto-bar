/**
 * SynapBase — esquema relacional multi-tenant.
 * Fuente única de verdad: la importan tanto el runtime de Next (db.ts)
 * como el script de seed (scripts/seed.mjs).
 *
 * Aislamiento por comercio: toda tabla de datos lleva business_id y las
 * consultas de los servicios SIEMPRE filtran por el negocio de la sesión.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS businesses (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT,
  address     TEXT,
  phone       TEXT,
  logo_url    TEXT,
  brand_color TEXT NOT NULL DEFAULT '#5b5bd6',
  hours       TEXT,
  timezone    TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  plan        TEXT NOT NULL DEFAULT 'pro',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner',
  created_at  TEXT NOT NULL,
  UNIQUE(user_id, business_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_biz ON memberships(business_id);

CREATE TABLE IF NOT EXISTS invitations (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'miembro',
  token       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forms (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'active',
  incentive     TEXT NOT NULL DEFAULT '5% de descuento en tu consumo',
  welcome_title TEXT NOT NULL DEFAULT '',
  welcome_text  TEXT NOT NULL DEFAULT '',
  success_title TEXT NOT NULL DEFAULT '',
  success_text  TEXT NOT NULL DEFAULT '',
  theme_json    TEXT NOT NULL DEFAULT '{}',
  is_template   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forms_biz ON forms(business_id);

CREATE TABLE IF NOT EXISTS questions (
  id          TEXT PRIMARY KEY,
  form_id     TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  label       TEXT NOT NULL,
  placeholder TEXT,
  options_json TEXT NOT NULL DEFAULT '[]',
  required    INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  position    INTEGER NOT NULL DEFAULT 0,
  maps_to     TEXT,
  scale_max   INTEGER,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_form ON questions(form_id, position);

CREATE TABLE IF NOT EXISTS customers (
  id             TEXT PRIMARY KEY,
  business_id    TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  gender         TEXT,
  age            INTEGER,
  notes          TEXT,
  first_visit_at TEXT NOT NULL,
  last_visit_at  TEXT NOT NULL,
  visits         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_biz ON customers(business_id, last_visit_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(business_id, email);

CREATE TABLE IF NOT EXISTS tags (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT 'violet',
  created_at  TEXT NOT NULL,
  UNIQUE(business_id, name)
);

CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  form_id       TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  customer_id   TEXT REFERENCES customers(id) ON DELETE SET NULL,
  product       TEXT,
  amount        REAL,
  discount_code TEXT,
  hour          INTEGER,
  weekday       INTEGER,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_biz ON submissions(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_customer ON submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_form ON submissions(form_id);

CREATE TABLE IF NOT EXISTS answers (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  value_json    TEXT
);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);

CREATE TABLE IF NOT EXISTS scans (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  form_id     TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scans_biz ON scans(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scans_form ON scans(form_id);

CREATE TABLE IF NOT EXISTS segments (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  rules_json  TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_segments_biz ON segments(business_id);

CREATE TABLE IF NOT EXISTS campaigns (
  id             TEXT PRIMARY KEY,
  business_id    TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  channel        TEXT NOT NULL DEFAULT 'whatsapp',
  segment_id     TEXT REFERENCES segments(id) ON DELETE SET NULL,
  subject        TEXT,
  message        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'draft',
  scheduled_for  TEXT,
  sent_at        TEXT,
  audience_count INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaigns_biz ON campaigns(business_id, created_at);

-- Cola de envíos: la arquitectura queda lista para integrar WhatsApp/Email.
-- Un worker futuro consume filas 'queued' y las marca 'sent'/'failed'.
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id          TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_to  TEXT,
  status      TEXT NOT NULL DEFAULT 'queued',
  sent_at     TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
`;
