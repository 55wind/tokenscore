import "server-only";
import { and, eq, inArray, lte } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { User } from "@/lib/db/schema";
import { addMonths, currentMonth } from "@/lib/months";
import { planRepayment } from "@/lib/scoring/engine";
import { krw, pct } from "@/lib/format";
import { DomainError, getActiveLine, getLineSummary } from "./credit";
import { getCompanyScore } from "./scoring";
import { logAudit } from "./audit";

/* ---------- 결제 요청 흐름 ----------
 * 사용자(구성원)가 청구서 결제를 요청  → requested
 * 회사(대표·재무)가 한도 안에서 승인  → approved (한도 차감, 집행 대기)
 * 관리자(운영사)가 공급사에 대신 결제 → paid (상환 일정 생성)
 */

export async function createPaymentRequest(
  user: User,
  input: { provider: string; category: "llm" | "gpu"; billingMonth: string; amount: number; dueDate: string; invoiceNo?: string; memo?: string },
) {
  if (!user.companyId) throw new DomainError("소속 회사가 없습니다.");
  if (input.amount < 100_000) throw new DomainError("10만원 이상 청구서만 요청할 수 있습니다.");
  const id = crypto.randomUUID();
  const invoiceNo = input.invoiceNo?.trim() || `INV-${input.billingMonth.replace("-", "")}-${id.slice(0, 5).toUpperCase()}`;
  await db.insert(s.paymentRequests).values({
    id,
    companyId: user.companyId,
    creditLineId: null,
    provider: input.provider,
    category: input.category,
    invoiceNo,
    billingMonth: input.billingMonth,
    amount: input.amount,
    dueDate: input.dueDate,
    memo: input.memo?.trim() || null,
    status: "requested",
    requestedBy: user.id,
  });
  await logAudit(user, user.companyId, "결제 요청", `${input.provider} ${krw(input.amount)} (${invoiceNo})`);
  return id;
}

async function getPayment(id: string) {
  const [p] = await db.select().from(s.paymentRequests).where(eq(s.paymentRequests.id, id)).limit(1);
  if (!p) throw new DomainError("결제 요청을 찾을 수 없습니다.");
  return p;
}

export async function approveByCompany(user: User, paymentId: string) {
  const p = await getPayment(paymentId);
  if (p.companyId !== user.companyId) throw new DomainError("우리 회사의 요청이 아닙니다.");
  if (p.status !== "requested") throw new DomainError("이미 처리된 요청입니다.");
  const summary = await getLineSummary(p.companyId);
  if (!summary) throw new DomainError("승인된 Compute Pay 한도가 없습니다. 먼저 한도를 신청하세요.");
  if (summary.line.status !== "active") throw new DomainError("한도가 일시 정지되어 있습니다. 운영사에 문의하세요.");
  if (p.amount > summary.available)
    throw new DomainError(`남은 한도 ${krw(summary.available)}보다 큰 금액입니다.`);
  await db
    .update(s.paymentRequests)
    .set({ status: "approved", creditLineId: summary.line.id, approvedBy: user.id, approvedAt: new Date() })
    .where(eq(s.paymentRequests.id, paymentId));
  await logAudit(user, p.companyId, "결제 승인", `${p.provider} ${krw(p.amount)}, 운영사 집행 대기`);
}

export async function rejectPayment(actor: User, paymentId: string, reason: string) {
  const p = await getPayment(paymentId);
  const isCompany = actor.role === "company" && actor.companyId === p.companyId;
  const isAdmin = actor.role === "admin";
  if (!isCompany && !isAdmin) throw new DomainError("권한이 없습니다.");
  if (isCompany && p.status !== "requested") throw new DomainError("이미 처리된 요청입니다.");
  if (isAdmin && p.status !== "approved") throw new DomainError("집행 대기 중인 요청만 반려할 수 있습니다.");
  await db
    .update(s.paymentRequests)
    .set({ status: "rejected", rejectReason: reason || null })
    .where(eq(s.paymentRequests.id, paymentId));
  await logAudit(actor, p.companyId, "결제 반려", `${p.provider} ${krw(p.amount)}${reason ? `: ${reason}` : ""}`);
}

/** 운영사가 공급사에 대신 결제하고, 매출연동 상환 일정을 만듭니다. */
export async function executeByAdmin(admin: User, paymentId: string) {
  const p = await getPayment(paymentId);
  if (p.status !== "approved") throw new DomainError("회사 승인이 끝난 요청만 집행할 수 있습니다.");
  const line = await getActiveLine(p.companyId);
  if (!line || line.id !== p.creditLineId) throw new DomainError("유효한 한도가 없습니다.");
  if (line.status !== "active") throw new DomainError("정지된 한도입니다. 정지를 풀거나 반려하세요.");

  const { result } = await getCompanyScore(p.companyId);
  const plan = planRepayment(p.amount, line.feeRate, result.kpis.avgRevenue3, line.termMonths);
  const thisMonth = currentMonth();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(s.paymentRequests)
      .set({ status: "paid", paidBy: admin.id, paidAt: now, feeAmount: plan.fee, revenueShare: plan.revenueShare })
      .where(eq(s.paymentRequests.id, paymentId));
    for (let seq = 1; seq <= plan.termMonths; seq++) {
      const expected = seq === plan.termMonths ? plan.total - plan.monthly * (plan.termMonths - 1) : plan.monthly;
      await tx.insert(s.repayments).values({
        id: crypto.randomUUID(),
        companyId: p.companyId,
        creditLineId: line.id,
        paymentRequestId: p.id,
        seq,
        dueMonth: addMonths(thisMonth, seq),
        expectedAmount: expected,
        revenueShare: plan.revenueShare,
        status: "scheduled",
      });
    }
  });
  await logAudit(
    admin,
    p.companyId,
    "선결제 집행",
    `${p.provider} ${krw(p.amount)} 결제, 수수료 ${krw(plan.fee)}, ${plan.termMonths}개월간 매출의 약 ${pct(plan.revenueShare)} 상환`,
  );
}

/* ---------- 상환 ---------- */

/**
 * 매출연동 자동 상환 실행 (월 마감 배치를 데모용으로 수동 실행).
 * 만기가 된 상환 건을 회차별로 처리합니다. 관찰 대상 기업은 최근 매출 기준으로 일부만 회수되고 연체로 남습니다.
 */
export async function runCollection(admin: User) {
  const thisMonth = currentMonth();
  const due = await db
    .select()
    .from(s.repayments)
    .where(and(inArray(s.repayments.status, ["scheduled", "overdue"]), lte(s.repayments.dueMonth, thisMonth)));
  if (!due.length) return { processed: 0, collected: 0, overdue: 0 };

  const companyIds = [...new Set(due.map((r) => r.companyId))];
  const companies = await db.select().from(s.companies).where(inArray(s.companies.id, companyIds));
  let collected = 0;
  let overdue = 0;
  for (const r of due) {
    const company = companies.find((c) => c.id === r.companyId);
    const remaining = r.expectedAmount - r.paidAmount;
    if (company?.status === "watch") {
      const partial = Math.round(remaining * 0.3);
      collected += partial;
      overdue++;
      await db
        .update(s.repayments)
        .set({ paidAmount: r.paidAmount + partial, status: "overdue" })
        .where(eq(s.repayments.id, r.id));
    } else {
      collected += remaining;
      await db
        .update(s.repayments)
        .set({ paidAmount: r.expectedAmount, status: "paid", paidAt: new Date() })
        .where(eq(s.repayments.id, r.id));
    }
  }
  await logAudit(admin, null, "자동 상환 실행", `${due.length}건 처리, 회수 ${krw(collected)}, 연체 ${overdue}건`);
  return { processed: due.length, collected, overdue };
}

export async function markRepaymentPaid(admin: User, repaymentId: string) {
  const [r] = await db.select().from(s.repayments).where(eq(s.repayments.id, repaymentId)).limit(1);
  if (!r) throw new DomainError("상환 건을 찾을 수 없습니다.");
  if (r.status === "paid") throw new DomainError("이미 상환된 건입니다.");
  await db
    .update(s.repayments)
    .set({ paidAmount: r.expectedAmount, status: "paid", paidAt: new Date() })
    .where(eq(s.repayments.id, repaymentId));
  await logAudit(admin, r.companyId, "상환 수기 확인", `${r.dueMonth} ${r.seq}회차 ${krw(r.expectedAmount - r.paidAmount)} 입금 확인`);
}
