/* ————— Shared domain types (frontend ⇄ backend) ————— */

export type Role = "owner" | "admin" | "miembro";

export type QuestionType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "boolean"
  | "date"
  | "scale";

export type MapsTo = "name" | "phone" | "email" | "product" | "gender" | "age" | "amount" | null;

export interface Question {
  id: string;
  form_id: string;
  type: QuestionType;
  label: string;
  placeholder: string | null;
  options: string[];
  required: boolean;
  active: boolean;
  position: number;
  maps_to: MapsTo;
  scale_max: number | null;
}

export interface FormTheme {
  color: string;
  showLogo: boolean;
  emoji: string;
}

export interface Form {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  status: "active" | "paused";
  incentive: string;
  welcome_title: string;
  welcome_text: string;
  success_title: string;
  success_text: string;
  theme: FormTheme;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  submissions_count?: number;
  scans_count?: number;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  brand_color: string;
  hours: string | null;
  plan: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
  notes: string | null;
  first_visit_at: string;
  last_visit_at: string;
  visits: number;
  created_at: string;
  favorite_product?: string | null;
  total_spent?: number;
  submissions_count?: number;
  tags?: Tag[];
}

export interface SubmissionRow {
  id: string;
  form_id: string;
  form_name?: string;
  customer_id: string | null;
  customer_name: string | null;
  product: string | null;
  amount: number | null;
  discount_code: string | null;
  created_at: string;
  answers: Record<string, unknown>; // question_id → value
}

/* ————— Segments ————— */

export type SegmentField =
  | "visits"
  | "last_visit_days"
  | "age"
  | "gender"
  | "product"
  | "favorite_product"
  | "total_spent"
  | "has_phone"
  | "has_email"
  | "tag"
  | "question";

export type SegmentOp = "gte" | "lte" | "eq" | "neq" | "contains" | "between";

export interface SegmentRule {
  field: SegmentField;
  op: SegmentOp;
  value?: string | number | boolean;
  min?: number;
  max?: number;
  questionId?: string;
}

export interface Segment {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  rules: SegmentRule[];
  created_at: string;
  updated_at: string;
  count?: number;
}

/* ————— Campaigns ————— */

export type CampaignChannel = "whatsapp" | "email";
export type CampaignStatus = "draft" | "scheduled" | "sent";

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  channel: CampaignChannel;
  segment_id: string | null;
  segment_name?: string | null;
  subject: string | null;
  message: string;
  status: CampaignStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  audience_count: number;
  created_at: string;
  updated_at: string;
}

/* ————— Stats payloads ————— */

export interface DashboardStats {
  total_customers: number;
  new_this_month: number;
  new_prev_month: number;
  recurrent_customers: number;
  return_rate: number;
  total_submissions: number;
  submissions_this_month: number;
  total_scans: number;
  conversion_rate: number;
  customers_by_month: { month: string; nuevos: number; recurrentes: number }[];
  top_products: { name: string; count: number }[];
  visits_by_hour: { hour: number; count: number }[];
  visit_frequency: { bucket: string; count: number }[];
  recent_submissions: SubmissionRow[];
}
