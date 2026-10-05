"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { seedDatabase } from "@/lib/db/seed";
import type { ActionResult } from "@/lib/action-result";
import type { Grade, ScoreConfig } from "@/lib/scoring/types";
import { DomainError, decideApplication, setLineStatus } from "@/lib/services/credit";
import { executeByAdmin, markRepaymentPaid, rejectPayment, runCollection } from "@/lib/services/payments";
import { acknowledgeAlert } from "@/lib/services/alerts";
import { saveScoreConfig } from "@/lib/services/scoring";
import { logAudit } from "@/lib/services/audit";
import { run } from "@/lib/services/run";
import { krw } from "@/lib/format";

/** 관리자 처리는 회사·사용자 화면에도 영향을 주므로 전체를 다시 그립니다. */
const done = () => revalidatePath("/", "layout");

const digits = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/[^0-9]/g, ""));

export async function approveApplicationAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  const approvedLimit = digits(formData.get("approvedLimit"));
  const note = String(formData.get("note") ?? "").trim();
  if (!approvedLimit || approvedLimit < 1_000_000) return { ok: false, message: "승인 한도는 100만원 이상이어야 합니다." };
  return run(async () => {
    await decideApplication(admin, String(formData.get("id")), {
      decision: "approve",
      approvedLimit,
      note: note || "제안 한도 검토 후 승인합니다.",
    });
    done();
  }, `${krw(approvedLimit)} 한도를 승인했습니다.`);
}

export async function rejectApplicationAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 4) return { ok: false, message: "거절 사유를 4자 이상 적어 주세요. 신청 기업에 그대로 보입니다." };
  return run(async () => {
    await decideApplication(admin, String(formData.get("id")), { decision: "reject", note });
    done();
  }, "신청을 거절했습니다.");
}

export async function setLineStatusAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  const status = formData.get("status") === "frozen" ? "frozen" : "active";
  return run(async () => {
    await setLineStatus(admin, String(formData.get("lineId")), status);
    done();
  }, status === "frozen" ? "한도를 정지했습니다." : "한도 정지를 풀었습니다.");
}

export async function executePaymentAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  return run(async () => {
    await executeByAdmin(admin, String(formData.get("id")));
    done();
  }, "공급사에 결제를 집행했습니다. 상환 일정이 만들어졌습니다.");
}

export async function rejectPaymentAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 4) return { ok: false, message: "반려 사유를 4자 이상 적어 주세요." };
  return run(async () => {
    await rejectPayment(admin, String(formData.get("id")), reason);
    done();
  }, "결제 요청을 반려했습니다.");
}

export async function runCollectionAction(): Promise<ActionResult> {
  const admin = await requireUser("admin");
  let summary = { processed: 0, collected: 0, overdue: 0 };
  const result = await run(async () => {
    summary = await runCollection(admin);
    done();
  }, "");
  if (!result?.ok) return result;
  if (!summary.processed) return { ok: true, message: "처리할 상환 건이 없습니다." };
  return {
    ok: true,
    message: `상환 ${summary.processed}건을 처리했습니다. 회수 ${krw(summary.collected)}${summary.overdue ? `, 연체 ${summary.overdue}건` : ""}.`,
  };
}

export async function markRepaymentPaidAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  return run(async () => {
    await markRepaymentPaid(admin, String(formData.get("id")));
    done();
  }, "입금을 확인했습니다.");
}

export async function acknowledgeAlertAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  return run(async () => {
    await acknowledgeAlert(admin, String(formData.get("companyId")), String(formData.get("key")), String(formData.get("note") ?? "").trim());
    done();
  }, "경보를 확인 처리했습니다.");
}

const pctNum = z.coerce.number().finite();

const ModelSchema = z
  .object({
    weights: z.object({
      efficiency: pctNum.min(0),
      growth: pctNum.min(0),
      stability: pctNum.min(0),
      business: pctNum.min(0),
      concentration: pctNum.min(0),
    }),
    cutoffs: z.object({ A: pctNum, B: pctNum, C: pctNum, D: pctNum }),
    coefficients: z.object({ A: pctNum, B: pctNum, C: pctNum, D: pctNum, E: pctNum }),
    feeRates: z.object({ A: pctNum, B: pctNum, C: pctNum, D: pctNum, E: pctNum }),
    bonus: z.object({ govProgram: pctNum.min(0).max(100), investment: pctNum.min(0).max(100) }),
    computeMultiple: pctNum.gt(0).max(12),
    revenueMultiple: pctNum.gt(0).max(12),
    rejectBelow: pctNum.min(0).max(1000),
    minPaidMonths: pctNum.int().min(1).max(12),
    autoApproveGrade: z.enum(["none", "A", "B", "C", "D", "E"]),
  })
  .superRefine((v, ctx) => {
    const sum = Object.values(v.weights).reduce((a, b) => a + b, 0);
    if (sum <= 0) ctx.addIssue({ code: "custom", message: "가중치 합이 0보다 커야 합니다." });
    if (Object.values(v.weights).some((w) => w <= 0)) ctx.addIssue({ code: "custom", message: "모든 가중치는 0보다 커야 합니다." });
    const { A, B, C, D } = v.cutoffs;
    if (!(A > B && B > C && C > D && D > 0 && A <= 1000))
      ctx.addIssue({ code: "custom", message: "등급 기준점은 A > B > C > D 순서로, 0~1000점 사이여야 합니다." });
    if (Object.values(v.coefficients).some((c) => c <= 0 || c > 1.5))
      ctx.addIssue({ code: "custom", message: "등급계수는 0보다 크고 1.5 이하여야 합니다." });
    if (Object.values(v.feeRates).some((f) => f < 0 || f > 20))
      ctx.addIssue({ code: "custom", message: "수수료율은 0~20% 사이여야 합니다." });
  });

export async function saveModelAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireUser("admin");
  const g = (k: string) => formData.get(k);
  const parsed = ModelSchema.safeParse({
    weights: {
      efficiency: g("w.efficiency"),
      growth: g("w.growth"),
      stability: g("w.stability"),
      business: g("w.business"),
      concentration: g("w.concentration"),
    },
    cutoffs: { A: g("cut.A"), B: g("cut.B"), C: g("cut.C"), D: g("cut.D") },
    coefficients: { A: g("coef.A"), B: g("coef.B"), C: g("coef.C"), D: g("coef.D"), E: g("coef.E") },
    feeRates: { A: g("fee.A"), B: g("fee.B"), C: g("fee.C"), D: g("fee.D"), E: g("fee.E") },
    bonus: { govProgram: g("bonus.govProgram"), investment: g("bonus.investment") },
    computeMultiple: g("computeMultiple"),
    revenueMultiple: g("revenueMultiple"),
    rejectBelow: g("rejectBelow"),
    minPaidMonths: g("minPaidMonths"),
    autoApproveGrade: g("autoApproveGrade") ?? "none",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  const v = parsed.data;
  const wSum = Object.values(v.weights).reduce((a, b) => a + b, 0);
  const toRate = (r: Record<Grade, number>) =>
    Object.fromEntries(Object.entries(r).map(([k, x]) => [k, Math.round(x * 10) / 1000])) as Record<Grade, number>;
  const config: ScoreConfig = {
    // 화면에서는 % 단위로 받고, 합이 1이 되도록 정규화해서 저장합니다.
    weights: {
      efficiency: v.weights.efficiency / wSum,
      growth: v.weights.growth / wSum,
      stability: v.weights.stability / wSum,
      business: v.weights.business / wSum,
      concentration: v.weights.concentration / wSum,
    },
    bonus: v.bonus,
    cutoffs: v.cutoffs,
    coefficients: v.coefficients,
    feeRates: toRate(v.feeRates),
    computeMultiple: v.computeMultiple,
    revenueMultiple: v.revenueMultiple,
    autoApproveGrade: v.autoApproveGrade === "none" ? null : v.autoApproveGrade,
    rejectBelow: v.rejectBelow,
    minPaidMonths: v.minPaidMonths,
  };
  return run(async () => {
    await saveScoreConfig(config);
    await logAudit(
      admin,
      null,
      "심사 모델 변경",
      `A ${v.cutoffs.A}·B ${v.cutoffs.B}·C ${v.cutoffs.C}·D ${v.cutoffs.D}점, 자동 승인 ${config.autoApproveGrade ? `${config.autoApproveGrade}등급 이상` : "사용 안 함"}`,
    );
    done();
  }, "심사 모델을 저장했습니다. 모든 기업의 점수를 새 기준으로 다시 계산했습니다.");
}

export async function resetDemoAction(): Promise<ActionResult> {
  const admin = await requireUser("admin");
  return run(async () => {
    if (process.env.ALLOW_DEMO_RESET === "false") throw new DomainError("이 환경에서는 데모 초기화를 막아 두었습니다.");
    await seedDatabase(db);
    await logAudit(admin, null, "데모 데이터 초기화", "모든 기업·신청·결제·상환 데이터를 처음 상태로 되돌렸습니다.");
    done();
  }, "데모 데이터를 처음 상태로 되돌렸습니다.");
}
