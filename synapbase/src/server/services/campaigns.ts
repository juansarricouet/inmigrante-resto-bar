import "server-only";
import { getDb, nowIso, uid, tx } from "../db";
import { ApiError } from "../http";
import { log } from "../log";
import { evaluateRules, getSegment } from "./segments";
import type { Campaign, CampaignChannel, CampaignStatus } from "@/lib/types";
import type { CustomerFacts } from "./customers";

function rowToCampaign(r: Record<string, unknown>): Campaign {
  return {
    id: r.id as string,
    business_id: r.business_id as string,
    name: r.name as string,
    channel: r.channel as CampaignChannel,
    segment_id: (r.segment_id as string) ?? null,
    segment_name: (r.segment_name as string) ?? null,
    subject: (r.subject as string) ?? null,
    message: r.message as string,
    status: r.status as CampaignStatus,
    scheduled_for: (r.scheduled_for as string) ?? null,
    sent_at: (r.sent_at as string) ?? null,
    audience_count: (r.audience_count as number) ?? 0,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function listCampaigns(businessId: string): Campaign[] {
  const rows = getDb()
    .prepare(
      `SELECT c.*, s.name AS segment_name FROM campaigns c
       LEFT JOIN segments s ON s.id = c.segment_id
       WHERE c.business_id = ? ORDER BY c.created_at DESC`,
    )
    .all(businessId) as Record<string, unknown>[];
  return rows.map(rowToCampaign);
}

export function getCampaign(businessId: string, campaignId: string): Campaign | null {
  const row = getDb()
    .prepare(
      `SELECT c.*, s.name AS segment_name FROM campaigns c
       LEFT JOIN segments s ON s.id = c.segment_id
       WHERE c.id = ? AND c.business_id = ?`,
    )
    .get(campaignId, businessId) as Record<string, unknown> | undefined;
  return row ? rowToCampaign(row) : null;
}

/** Audiencia efectiva de una campaña (clientes del segmento con canal disponible). */
export function resolveAudience(businessId: string, segmentId: string | null, channel: CampaignChannel): CustomerFacts[] {
  const segment = segmentId ? getSegment(businessId, segmentId) : null;
  const base = evaluateRules(businessId, segment?.rules ?? []);
  if (channel === "whatsapp") return base.filter((c) => !!c.phone);
  return base.filter((c) => !!c.email);
}

export interface CampaignInput {
  name: string;
  channel: CampaignChannel;
  segment_id: string | null;
  subject?: string | null;
  message: string;
  status?: CampaignStatus;
  scheduled_for?: string | null;
}

export function createCampaign(businessId: string, data: CampaignInput): Campaign {
  const id = uid();
  const now = nowIso();
  const audience = resolveAudience(businessId, data.segment_id, data.channel);
  getDb()
    .prepare(
      `INSERT INTO campaigns (id, business_id, name, channel, segment_id, subject, message, status, scheduled_for, audience_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      businessId,
      data.name.trim(),
      data.channel,
      data.segment_id,
      data.subject ?? null,
      data.message,
      data.status ?? "draft",
      data.scheduled_for ?? null,
      audience.length,
      now,
      now,
    );
  log.info("campaign.created", { businessId, campaignId: id, status: data.status ?? "draft" });
  return getCampaign(businessId, id)!;
}

export function updateCampaign(businessId: string, campaignId: string, data: Partial<CampaignInput>): Campaign {
  const existing = getCampaign(businessId, campaignId);
  if (!existing) throw new ApiError(404, "Campaña no encontrada");
  if (existing.status === "sent") throw new ApiError(400, "Una campaña enviada no se puede editar");
  const merged = {
    name: data.name ?? existing.name,
    channel: data.channel ?? existing.channel,
    segment_id: data.segment_id !== undefined ? data.segment_id : existing.segment_id,
    subject: data.subject !== undefined ? data.subject : existing.subject,
    message: data.message ?? existing.message,
    status: data.status ?? existing.status,
    scheduled_for: data.scheduled_for !== undefined ? data.scheduled_for : existing.scheduled_for,
  };
  const audience = resolveAudience(businessId, merged.segment_id, merged.channel);
  getDb()
    .prepare(
      `UPDATE campaigns SET name = ?, channel = ?, segment_id = ?, subject = ?, message = ?, status = ?, scheduled_for = ?, audience_count = ?, updated_at = ?
       WHERE id = ? AND business_id = ?`,
    )
    .run(
      merged.name,
      merged.channel,
      merged.segment_id,
      merged.subject,
      merged.message,
      merged.status,
      merged.scheduled_for,
      audience.length,
      nowIso(),
      campaignId,
      businessId,
    );
  return getCampaign(businessId, campaignId)!;
}

export function deleteCampaign(businessId: string, campaignId: string) {
  const res = getDb()
    .prepare("DELETE FROM campaigns WHERE id = ? AND business_id = ?")
    .run(campaignId, businessId);
  if (res.changes === 0) throw new ApiError(404, "Campaña no encontrada");
}

/**
 * "Envío" de campaña. La integración real (WhatsApp Business API / proveedor
 * de email) se conecta acá: hoy materializa la cola de destinatarios con el
 * snapshot de la audiencia y marca la campaña como enviada. Un worker externo
 * solo tendría que consumir campaign_recipients con status 'queued'.
 */
export function dispatchCampaign(businessId: string, campaignId: string): Campaign {
  const db = getDb();
  const campaign = getCampaign(businessId, campaignId);
  if (!campaign) throw new ApiError(404, "Campaña no encontrada");
  if (campaign.status === "sent") throw new ApiError(400, "Esta campaña ya fue enviada");
  const audience = resolveAudience(businessId, campaign.segment_id, campaign.channel);
  if (audience.length === 0)
    throw new ApiError(400, "La audiencia está vacía: no hay clientes con ese canal de contacto");
  const now = nowIso();
  tx(() => {
    const stmt = db.prepare(
      "INSERT INTO campaign_recipients (id, campaign_id, customer_id, channel_to, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'sent', ?, ?)",
    );
    for (const c of audience) {
      stmt.run(uid(), campaignId, c.id, campaign.channel === "whatsapp" ? c.phone : c.email, now, now);
    }
    db.prepare(
      "UPDATE campaigns SET status = 'sent', sent_at = ?, audience_count = ?, updated_at = ? WHERE id = ?",
    ).run(now, audience.length, now, campaignId);
  });
  log.info("campaign.dispatched", { businessId, campaignId, audience: audience.length });
  return getCampaign(businessId, campaignId)!;
}

/** Reemplaza variables {{nombre}}, {{producto_favorito}}, etc. en el mensaje. */
export function renderMessage(template: string, c: CustomerFacts): string {
  return template
    .replaceAll("{{nombre}}", c.name.split(" ")[0] ?? c.name)
    .replaceAll("{{nombre_completo}}", c.name)
    .replaceAll("{{producto_favorito}}", c.favorite_product ?? "tu pedido de siempre")
    .replaceAll("{{visitas}}", String(c.visits));
}
