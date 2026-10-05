import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export type Role = "admin" | "company" | "user";

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  title: text("title").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<Role>().notNull(),
  companyId: text("company_id"),
  createdAt: createdAt(),
});

export type BusinessModel = "api" | "gpu" | "hybrid";
export type CompanyStatus = "onboarding" | "active" | "watch";

export const companies = sqliteTable("companies", {
  id: id(),
  name: text("name").notNull(),
  bizNo: text("biz_no").notNull(),
  industry: text("industry").notNull(),
  model: text("model").$type<BusinessModel>().notNull(),
  description: text("description").notNull(),
  foundedYear: integer("founded_year").notNull(),
  employees: integer("employees").notNull(),
  ceoName: text("ceo_name").notNull(),
  status: text("status").$type<CompanyStatus>().notNull().default("onboarding"),
  monthlyBudget: integer("monthly_budget"),
  createdAt: createdAt(),
});

export const govPrograms = sqliteTable("gov_programs", {
  id: id(),
  companyId: text("company_id").notNull(),
  name: text("name").notNull(),
  agency: text("agency").notNull(),
  kind: text("kind").$type<"gpu" | "voucher" | "guarantee">().notNull(),
  startMonth: text("start_month").notNull(),
  endMonth: text("end_month").notNull(),
  amount: integer("amount").notNull(),
});

export const investments = sqliteTable("investments", {
  id: id(),
  companyId: text("company_id").notNull(),
  round: text("round").notNull(),
  amount: integer("amount").notNull(),
  month: text("month").notNull(),
  investor: text("investor").notNull(),
});

export type ConnectionCategory = "llm" | "gpu" | "pg" | "bank";
export type ConnectionStatus = "connected" | "disconnected" | "error";

export const connections = sqliteTable(
  "connections",
  {
    id: id(),
    companyId: text("company_id").notNull(),
    provider: text("provider").notNull(),
    category: text("category").$type<ConnectionCategory>().notNull(),
    status: text("status").$type<ConnectionStatus>().notNull().default("disconnected"),
    consentAt: integer("consent_at", { mode: "timestamp_ms" }),
    lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
    account: text("account"),
  },
  (t) => [uniqueIndex("connections_company_provider").on(t.companyId, t.provider)],
);

export const llmUsage = sqliteTable(
  "llm_usage",
  {
    id: id(),
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    tokensM: real("tokens_m").notNull(),
    cost: integer("cost").notNull(),
    funding: text("funding").$type<"paid" | "free_credit" | "government">().notNull(),
    source: text("source").$type<"provider" | "self_reported">().notNull(),
  },
  (t) => [index("llm_usage_company_month").on(t.companyId, t.month)],
);

export const gpuWorkloads = sqliteTable(
  "gpu_workloads",
  {
    id: id(),
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    gpuType: text("gpu_type").notNull(),
    gpuCount: integer("gpu_count").notNull(),
    gpuHours: real("gpu_hours").notNull(),
    cost: integer("cost").notNull(),
    funding: text("funding").$type<"paid" | "free_credit" | "government">().notNull(),
    source: text("source").$type<"provider" | "self_reported">().notNull(),
    activeDays: integer("active_days").notNull(),
    avgUtilization: real("avg_utilization").notNull(),
    hasEndpoint: integer("has_endpoint", { mode: "boolean" }).notNull(),
  },
  (t) => [index("gpu_workloads_company_month").on(t.companyId, t.month)],
);

export const revenue = sqliteTable(
  "revenue",
  {
    id: id(),
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    revenue: integer("revenue").notNull(),
    grossMarginPct: real("gross_margin_pct").notNull(),
    customers: integer("customers").notNull(),
    retentionPct: real("retention_pct").notNull(),
  },
  (t) => [uniqueIndex("revenue_company_month").on(t.companyId, t.month)],
);

export type ApplicationStatus = "submitted" | "approved" | "rejected" | "withdrawn";

export const applications = sqliteTable("applications", {
  id: id(),
  companyId: text("company_id").notNull(),
  requestedAmount: integer("requested_amount").notNull(),
  termMonths: integer("term_months").notNull(),
  purpose: text("purpose").notNull(),
  status: text("status").$type<ApplicationStatus>().notNull().default("submitted"),
  score: integer("score").notNull(),
  grade: text("grade").notNull(),
  suggestedLimit: integer("suggested_limit").notNull(),
  recommendation: text("recommendation").$type<"approve" | "review" | "reject">().notNull(),
  snapshot: text("snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
  approvedLimit: integer("approved_limit"),
  decisionNote: text("decision_note"),
  decidedBy: text("decided_by"),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
  autoDecided: integer("auto_decided", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export type CreditLineStatus = "active" | "frozen" | "closed";

export const creditLines = sqliteTable("credit_lines", {
  id: id(),
  companyId: text("company_id").notNull(),
  applicationId: text("application_id"),
  limitAmount: integer("limit_amount").notNull(),
  grade: text("grade").notNull(),
  score: integer("score").notNull(),
  feeRate: real("fee_rate").notNull(),
  termMonths: integer("term_months").notNull(),
  status: text("status").$type<CreditLineStatus>().notNull().default("active"),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  partner: text("partner").notNull().default("제휴 캐피탈"),
});

export type PaymentStatus = "requested" | "approved" | "paid" | "rejected";

export const paymentRequests = sqliteTable("payment_requests", {
  id: id(),
  companyId: text("company_id").notNull(),
  creditLineId: text("credit_line_id"),
  provider: text("provider").notNull(),
  category: text("category").$type<"llm" | "gpu">().notNull(),
  invoiceNo: text("invoice_no").notNull(),
  billingMonth: text("billing_month").notNull(),
  amount: integer("amount").notNull(),
  dueDate: text("due_date").notNull(),
  memo: text("memo"),
  status: text("status").$type<PaymentStatus>().notNull().default("requested"),
  requestedBy: text("requested_by").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  paidBy: text("paid_by"),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  feeAmount: integer("fee_amount"),
  revenueShare: real("revenue_share"),
  rejectReason: text("reject_reason"),
  createdAt: createdAt(),
});

export type RepaymentStatus = "scheduled" | "paid" | "overdue";

export const repayments = sqliteTable("repayments", {
  id: id(),
  companyId: text("company_id").notNull(),
  creditLineId: text("credit_line_id").notNull(),
  paymentRequestId: text("payment_request_id").notNull(),
  seq: integer("seq").notNull(),
  dueMonth: text("due_month").notNull(),
  expectedAmount: integer("expected_amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  revenueShare: real("revenue_share").notNull(),
  status: text("status").$type<RepaymentStatus>().notNull().default("scheduled"),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
});

export const alertAcks = sqliteTable(
  "alert_acks",
  {
    id: id(),
    companyId: text("company_id").notNull(),
    alertKey: text("alert_key").notNull(),
    note: text("note"),
    ackBy: text("ack_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("alert_acks_company_key").on(t.companyId, t.alertKey)],
);

export const auditLogs = sqliteTable("audit_logs", {
  id: id(),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull(),
  companyId: text("company_id"),
  action: text("action").notNull(),
  detail: text("detail").notNull(),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type CreditLine = typeof creditLines.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type Repayment = typeof repayments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
