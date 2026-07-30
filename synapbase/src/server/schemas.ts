import { z } from "zod";

/** Esquemas zod compartidos entre rutas (las rutas de Next solo pueden exportar handlers). */

export const ruleSchema = z.object({
  field: z.enum([
    "visits",
    "last_visit_days",
    "age",
    "gender",
    "product",
    "favorite_product",
    "total_spent",
    "has_phone",
    "has_email",
    "tag",
    "question",
  ]),
  op: z.enum(["gte", "lte", "eq", "neq", "contains", "between"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  questionId: z.string().optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(2, "Poné un nombre").max(80),
  channel: z.enum(["whatsapp", "email"]),
  segment_id: z.string().nullable(),
  subject: z.string().max(120).nullable().optional(),
  message: z.string().min(1, "Escribí el mensaje").max(2000),
  status: z.enum(["draft", "scheduled"]).optional(),
  scheduled_for: z.string().nullable().optional(),
});
