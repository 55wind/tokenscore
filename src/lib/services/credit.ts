import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { CreditLine, PaymentRequest, Repayment, User } from "@/lib/db/schema";
import { gradeAtLeast } from "@/lib/scoring/config";
import { krw } from "@/lib/format";
import { getCompanyScore } from "./scoring";
import { logAudit } from "./audit";

export class DomainError extends Error {}

export async function getActiveLine(companyId: string) {
  const [line] = await db
    .select()
    .from(s.creditLines)
    .where(and(eq(s.creditLines.companyId, companyId), inArray(s.creditLines.status, ["active", "frozen"])))
    .orderBy(desc(s.creditLines.approvedAt))
    .limit(1);
  return line ?? null;
}

/**
 * 한도 사용 현황.
 * 결제된 건은 아직 갚지 않은 비율만큼, 집행 대기(approved) 건은 전액을 사용 중으로 봅니다.
 */
export function lineUsage(line: CreditLine, payments: PaymentRequest[], repayments: Repayment[]) {
  let inUse = 0;
  let outstanding = 0;
  let pendingExecution = 0;
  for (const p of payments) {
    if (p.creditLineId !== line.id) continue;
    if (p.status === "approved") {
      inUse += p.amount;
      pendingExecution += p.amount;
    }
    if (p.status === "paid") {
      const rows = repayments.filter((r) => r.paymentRequestId === p.id);
      const total = rows.reduce((a, r) => a + r.expectedAmount, 0);
      const remaining = rows.reduce((a, r) => a + (r.expectedAmount - r.paidAmount), 0);
      outstanding += remaining;
      inUse += total > 0 ? Math.round((p.amount * remaining) / total) : p.amount;
    }
  }
  const available = Math.max(0, line.limitAmount - inUse);
  return { limit: line.limitAmount, inUse, available, outstanding, pendingExecution, utilization: line.limitAmount ? inUse / line.limitAmount : 0 };
}

export async function getLineSummary(companyId: string) {
  const line = await getActiveLine(companyId);
  if (!line) return null;
  const [payments, repayments] = await Promise.all([
    db.select().from(s.paymentRequests).where(eq(s.paymentRequests.companyId, companyId)),
    db.select().from(s.repayments).where(eq(s.repayments.companyId, companyId)),
  ]);
  return { line, ...lineUsage(line, payments, repayments) };
}

/* ---------- 한도 신청 ---------- */

export async function submitApplication(
  user: User,
  input: { requestedAmount: number; termMonths: number; purpose: string },
) {
  if (!user.companyId) throw new DomainError("소속 회사가 없습니다.");
  const companyId = user.companyId;
  const pending = await db
    .select({ id: s.applications.id })
    .from(s.applications)
    .where(and(eq(s.applications.companyId, companyId), eq(s.applications.status, "submitted")));
  if (pending.length) throw new DomainError("심사 중인 신청이 있습니다. 결과가 나온 뒤 다시 신청하세요.");

  const { data, result, config, asOf } = await getCompanyScore(companyId);
  if (!data.connections.some((c) => c.category === "bank" && c.status === "connected"))
    throw new DomainError("상환 계좌를 먼저 연결하세요. 데이터 연동 화면에서 계좌를 연결할 수 있습니다.");
  if (result.status === "insufficient_data") throw new DomainError(result.insufficientReason ?? "데이터가 부족합니다.");

  const id = crypto.randomUUID();
  const auto =
    result.recommendation === "approve" &&
    config.autoApproveGrade !== null &&
    gradeAtLeast(result.grade, config.autoApproveGrade) &&
    input.requestedAmount <= result.limit.amount;

  await db.insert(s.applications).values({
    id,
    companyId,
    requestedAmount: input.requestedAmount,
    termMonths: input.termMonths,
    purpose: input.purpose,
    status: "submitted",
    score: result.score,
    grade: result.grade,
    suggestedLimit: result.limit.amount,
    recommendation: result.recommendation,
    snapshot: { kpis: result.kpis, limit: result.limit, asOfMonth: asOf, flags: result.flags },
  });
  await logAudit(user, companyId, "한도 신청", `${krw(input.requestedAmount)}, ${input.termMonths}개월`);

  if (auto) {
    await decideApplication(null, id, {
      decision: "approve",
      approvedLimit: input.requestedAmount,
      note: `${result.grade}등급 자동 승인 (신청 금액이 산정 한도 이내)`,
      auto: true,
    });
  }
  return { id, auto };
}

export async function decideApplication(
  admin: User | null,
  applicationId: string,
  input: { decision: "approve" | "reject"; approvedLimit?: number; note: string; auto?: boolean },
) {
  const [app] = await db.select().from(s.applications).where(eq(s.applications.id, applicationId)).limit(1);
  if (!app) throw new DomainError("신청을 찾을 수 없습니다.");
  if (app.status !== "submitted") throw new DomainError("이미 처리된 신청입니다.");
  const now = new Date();

  if (input.decision === "reject") {
    await db
      .update(s.applications)
      .set({ status: "rejected", decisionNote: input.note, decidedBy: admin?.id ?? null, decidedAt: now })
      .where(eq(s.applications.id, applicationId));
    await logAudit(admin, app.companyId, "한도 거절", input.note);
    return;
  }

  const limit = input.approvedLimit ?? app.suggestedLimit;
  if (!limit || limit <= 0) throw new DomainError("승인 한도를 입력하세요.");
  const config = (await getCompanyScore(app.companyId)).config;
  const grade = app.grade as keyof typeof config.feeRates;

  await db.transaction(async (tx) => {
    await tx
      .update(s.applications)
      .set({
        status: "approved",
        approvedLimit: limit,
        decisionNote: input.note,
        decidedBy: admin?.id ?? null,
        decidedAt: now,
        autoDecided: input.auto ?? false,
      })
      .where(eq(s.applications.id, applicationId));
    // 새 한도가 생기면 이전 한도는 닫습니다. 남은 상환 일정은 그대로 유지됩니다.
    await tx
      .update(s.creditLines)
      .set({ status: "closed" })
      .where(and(eq(s.creditLines.companyId, app.companyId), inArray(s.creditLines.status, ["active", "frozen"])));
    await tx.insert(s.creditLines).values({
      id: crypto.randomUUID(),
      companyId: app.companyId,
      applicationId,
      limitAmount: limit,
      grade: app.grade,
      score: app.score,
      feeRate: config.feeRates[grade],
      termMonths: app.termMonths,
      status: "active",
      approvedAt: now,
      expiresAt: new Date(now.getTime() + 365 * 86_400_000),
      partner: "누리캐피탈",
    });
    await tx.update(s.companies).set({ status: "active" }).where(eq(s.companies.id, app.companyId));
  });
  await logAudit(admin, app.companyId, input.auto ? "한도 자동 승인" : "한도 승인", `${app.grade}등급 ${app.score}점, 한도 ${krw(limit)}. ${input.note}`);
}

export async function setLineStatus(admin: User, lineId: string, status: "active" | "frozen") {
  const [line] = await db.select().from(s.creditLines).where(eq(s.creditLines.id, lineId)).limit(1);
  if (!line) throw new DomainError("한도를 찾을 수 없습니다.");
  await db.update(s.creditLines).set({ status }).where(eq(s.creditLines.id, lineId));
  await db
    .update(s.companies)
    .set({ status: status === "frozen" ? "watch" : "active" })
    .where(eq(s.companies.id, line.companyId));
  await logAudit(admin, line.companyId, status === "frozen" ? "한도 정지" : "한도 정지 해제", `한도 ${krw(line.limitAmount)}`);
}
