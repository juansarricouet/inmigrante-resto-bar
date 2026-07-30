import "server-only";
import { getDb, monthKey, monthKeyNow, parseJson } from "../db";
import { getCustomerFacts } from "./customers";
import type { DashboardStats, SubmissionRow } from "@/lib/types";
import { listSubmissions } from "./submissions";

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(monthKeyNow(-i));
  return keys;
}

/** Divide "hamburguesa, papas" en productos individuales para los rankings. */
function splitProducts(product: string | null): string[] {
  if (!product) return [];
  return product
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s[0]?.toUpperCase() ?? "") + s.slice(1));
}

export function getDashboardStats(businessId: string): DashboardStats {
  const db = getDb();
  const thisMonth = monthKeyNow(0);
  const prevMonth = monthKeyNow(-1);

  const customers = db
    .prepare("SELECT id, first_visit_at, visits FROM customers WHERE business_id = ?")
    .all(businessId) as { id: string; first_visit_at: string; visits: number }[];

  const totalCustomers = customers.length;
  let newThisMonth = 0;
  let newPrevMonth = 0;
  let recurrent = 0;
  const firstVisitMonth = new Map<string, string>();
  for (const c of customers) {
    const mk = monthKey(c.first_visit_at);
    firstVisitMonth.set(c.id, mk);
    if (mk === thisMonth) newThisMonth++;
    if (mk === prevMonth) newPrevMonth++;
    if (c.visits >= 2) recurrent++;
  }

  const submissions = db
    .prepare("SELECT customer_id, product, hour, created_at FROM submissions WHERE business_id = ?")
    .all(businessId) as { customer_id: string | null; product: string | null; hour: number | null; created_at: string }[];

  const totalScans = (db.prepare("SELECT COUNT(*) AS c FROM scans WHERE business_id = ?").get(businessId) as { c: number }).c;

  // Serie mensual: nuevos vs recurrentes
  const months = lastNMonthKeys(12);
  const monthSet = new Set(months);
  const newByMonth = new Map<string, number>();
  const recurrentByMonth = new Map<string, Set<string>>();
  for (const [, mk] of firstVisitMonth) {
    if (monthSet.has(mk)) newByMonth.set(mk, (newByMonth.get(mk) ?? 0) + 1);
  }
  let submissionsThisMonth = 0;
  const hourCounts = new Array<number>(24).fill(0);
  const productCounts = new Map<string, number>();
  for (const s of submissions) {
    const mk = monthKey(s.created_at);
    if (mk === thisMonth) submissionsThisMonth++;
    if (s.hour != null && s.hour >= 0 && s.hour < 24) hourCounts[s.hour]!++;
    for (const p of splitProducts(s.product)) productCounts.set(p, (productCounts.get(p) ?? 0) + 1);
    if (s.customer_id && monthSet.has(mk) && firstVisitMonth.get(s.customer_id) !== mk) {
      const set = recurrentByMonth.get(mk) ?? new Set<string>();
      set.add(s.customer_id);
      recurrentByMonth.set(mk, set);
    }
  }

  const frequencyBuckets: { bucket: string; count: number }[] = [
    { bucket: "1 visita", count: 0 },
    { bucket: "2–3", count: 0 },
    { bucket: "4–6", count: 0 },
    { bucket: "7–10", count: 0 },
    { bucket: "Más de 10", count: 0 },
  ];
  for (const c of customers) {
    if (c.visits <= 1) frequencyBuckets[0]!.count++;
    else if (c.visits <= 3) frequencyBuckets[1]!.count++;
    else if (c.visits <= 6) frequencyBuckets[2]!.count++;
    else if (c.visits <= 10) frequencyBuckets[3]!.count++;
    else frequencyBuckets[4]!.count++;
  }

  const recent = listSubmissions(businessId, { limit: 8 }).rows;

  return {
    total_customers: totalCustomers,
    new_this_month: newThisMonth,
    new_prev_month: newPrevMonth,
    recurrent_customers: recurrent,
    return_rate: totalCustomers > 0 ? Math.round((recurrent / totalCustomers) * 100) : 0,
    total_submissions: submissions.length,
    submissions_this_month: submissionsThisMonth,
    total_scans: totalScans,
    conversion_rate: totalScans > 0 ? Math.round((submissions.length / totalScans) * 100) : 0,
    customers_by_month: months.map((m) => ({
      month: m,
      nuevos: newByMonth.get(m) ?? 0,
      recurrentes: recurrentByMonth.get(m)?.size ?? 0,
    })),
    top_products: [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    visits_by_hour: hourCounts.map((count, hour) => ({ hour, count })),
    visit_frequency: frequencyBuckets,
    recent_submissions: recent as SubmissionRow[],
  };
}

/* ————— Analytics completo (Estadísticas) ————— */

export interface QuestionBreakdown {
  question_id: string;
  form_name: string;
  label: string;
  type: string;
  responses: number;
  options?: { label: string; count: number }[];
  average?: number;
  samples?: string[];
}

export interface AnalyticsData {
  active_30d: number;
  lost_customers: number;
  recovered_this_month: number;
  avg_days_between_visits: number | null;
  avg_age: number | null;
  total_revenue_tracked: number;
  gender_distribution: { name: string; value: number }[];
  age_histogram: { bucket: string; count: number }[];
  weekday_distribution: { day: string; count: number }[];
  monthly_movement: { month: string; nuevos: number; recuperados: number; perdidos: number }[];
  top_customers: { id: string; name: string; visits: number; favorite: string | null; last_visit: string; spent: number }[];
  top_products: { name: string; count: number }[];
  question_ranking: { label: string; responses: number; form_name: string }[];
  question_breakdowns: QuestionBreakdown[];
}

const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function getAnalytics(businessId: string): AnalyticsData {
  const db = getDb();
  const facts = getCustomerFacts(businessId);
  const now = Date.now();
  const thisMonth = monthKeyNow(0);

  let lost = 0;
  let active30 = 0;
  const gapDaysList: number[] = [];
  const ages: number[] = [];
  const genderCounts = new Map<string, number>();
  for (const c of facts) {
    const daysSinceLast = (now - new Date(c.last_visit_at).getTime()) / 86400000;
    if (daysSinceLast > 30) lost++;
    else active30++;
    if (c.avg_days_between_visits != null) gapDaysList.push(c.avg_days_between_visits);
    if (c.age != null) ages.push(c.age);
    const g = c.gender ?? "Sin dato";
    genderCounts.set(g, (genderCounts.get(g) ?? 0) + 1);
  }

  const ageBuckets = [
    { bucket: "18–24", min: 0, max: 24, count: 0 },
    { bucket: "25–34", min: 25, max: 34, count: 0 },
    { bucket: "35–44", min: 35, max: 44, count: 0 },
    { bucket: "45–54", min: 45, max: 54, count: 0 },
    { bucket: "55+", min: 55, max: 200, count: 0 },
  ];
  for (const a of ages) {
    const b = ageBuckets.find((x) => a >= x.min && a <= x.max);
    if (b) b.count++;
  }

  // Movimiento mensual: nuevos / recuperados / perdidos
  const subs = db
    .prepare(
      "SELECT customer_id, created_at, weekday, amount FROM submissions WHERE business_id = ? AND customer_id IS NOT NULL ORDER BY created_at ASC",
    )
    .all(businessId) as { customer_id: string; created_at: string; weekday: number | null; amount: number | null }[];

  const weekdayCounts = new Array<number>(7).fill(0);
  let revenue = 0;
  const lastSeenByCustomer = new Map<string, number>();
  const recoveredByMonth = new Map<string, number>();
  let recoveredThisMonth = 0;
  for (const s of subs) {
    if (s.weekday != null && s.weekday >= 0 && s.weekday < 7) weekdayCounts[s.weekday]!++;
    revenue += s.amount ?? 0;
    const t = new Date(s.created_at).getTime();
    const prev = lastSeenByCustomer.get(s.customer_id);
    if (prev !== undefined && t - prev > 30 * 86400000) {
      const mk = monthKey(s.created_at);
      recoveredByMonth.set(mk, (recoveredByMonth.get(mk) ?? 0) + 1);
      if (mk === thisMonth) recoveredThisMonth++;
    }
    lastSeenByCustomer.set(s.customer_id, t);
  }

  const months = lastNMonthKeys(6);
  const newByMonth = new Map<string, number>();
  const lostByMonth = new Map<string, number>();
  for (const c of facts) {
    const fm = monthKey(c.first_visit_at);
    if (months.includes(fm)) newByMonth.set(fm, (newByMonth.get(fm) ?? 0) + 1);
    const daysSinceLast = (now - new Date(c.last_visit_at).getTime()) / 86400000;
    if (daysSinceLast > 30) {
      const lm = monthKey(c.last_visit_at);
      if (months.includes(lm)) lostByMonth.set(lm, (lostByMonth.get(lm) ?? 0) + 1);
    }
  }

  // Preguntas: ranking y desglose
  const questions = db
    .prepare(
      `SELECT q.id, q.label, q.type, q.options_json, q.scale_max, q.maps_to, f.name AS form_name,
              (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS responses
       FROM questions q JOIN forms f ON f.id = q.form_id
       WHERE f.business_id = ? AND f.is_template = 0
       ORDER BY responses DESC`,
    )
    .all(businessId) as {
    id: string; label: string; type: string; options_json: string; scale_max: number | null;
    maps_to: string | null; form_name: string; responses: number;
  }[];

  const breakdowns: QuestionBreakdown[] = [];
  for (const q of questions) {
    if (["name", "phone", "email"].includes(q.maps_to ?? "")) continue;
    if (q.responses === 0) continue;
    const values = (
      db.prepare("SELECT value_json FROM answers WHERE question_id = ?").all(q.id) as { value_json: string | null }[]
    ).map((r) => parseJson<unknown>(r.value_json, null));

    const breakdown: QuestionBreakdown = {
      question_id: q.id,
      form_name: q.form_name,
      label: q.label,
      type: q.type,
      responses: q.responses,
    };
    if (["select", "multiselect", "boolean"].includes(q.type)) {
      const counts = new Map<string, number>();
      for (const v of values) {
        const list = Array.isArray(v) ? v : [v];
        for (const item of list) {
          if (item == null) continue;
          const key = typeof item === "boolean" ? (item ? "Sí" : "No") : String(item);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      breakdown.options = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }));
    } else if (["scale", "number"].includes(q.type)) {
      const nums = values.map(Number).filter((n) => Number.isFinite(n));
      if (nums.length > 0) breakdown.average = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
      if (q.type === "scale") {
        const max = q.scale_max ?? 10;
        const counts = new Map<number, number>();
        for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
        breakdown.options = Array.from({ length: max }, (_, i) => ({
          label: String(i + 1),
          count: counts.get(i + 1) ?? 0,
        }));
      }
    } else {
      breakdown.samples = values
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .slice(-6)
        .reverse();
    }
    breakdowns.push(breakdown);
  }

  const productCounts = new Map<string, number>();
  for (const s of db
    .prepare("SELECT product FROM submissions WHERE business_id = ? AND product IS NOT NULL")
    .all(businessId) as { product: string }[]) {
    for (const p of splitProducts(s.product)) productCounts.set(p, (productCounts.get(p) ?? 0) + 1);
  }

  return {
    active_30d: active30,
    lost_customers: lost,
    recovered_this_month: recoveredThisMonth,
    avg_days_between_visits:
      gapDaysList.length > 0 ? Math.round(gapDaysList.reduce((a, b) => a + b, 0) / gapDaysList.length) : null,
    avg_age: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
    total_revenue_tracked: Math.round(revenue),
    gender_distribution: [...genderCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value })),
    age_histogram: ageBuckets.map(({ bucket, count }) => ({ bucket, count })),
    weekday_distribution: WEEKDAYS_ES.map((day, i) => ({ day, count: weekdayCounts[i] ?? 0 })),
    monthly_movement: months.map((m) => ({
      month: m,
      nuevos: newByMonth.get(m) ?? 0,
      recuperados: recoveredByMonth.get(m) ?? 0,
      perdidos: lostByMonth.get(m) ?? 0,
    })),
    top_customers: facts
      .slice()
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        name: c.name,
        visits: c.visits,
        favorite: c.favorite_product,
        last_visit: c.last_visit_at,
        spent: c.total_spent,
      })),
    top_products: [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
    question_ranking: questions
      .filter((q) => !["name", "phone", "email"].includes(q.maps_to ?? ""))
      .slice(0, 10)
      .map((q) => ({ label: q.label, responses: q.responses, form_name: q.form_name })),
    question_breakdowns: breakdowns,
  };
}
