"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import type { ActionResult } from "@/lib/action-result";
import { DomainError } from "@/lib/services/credit";
import { createPaymentRequest } from "@/lib/services/payments";
import { run } from "@/lib/services/run";
import { krw } from "@/lib/format";

const RequestSchema = z.object({
  provider: z.string().trim().min(1, { error: "공급사를 고르세요." }),
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/, { error: "청구 월을 고르세요." }),
  amount: z.coerce.number().int().min(100_000, { error: "10만원 이상 청구서만 요청할 수 있습니다." }).max(10_000_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "납부 기한을 고르세요." }),
  invoiceNo: z.string().trim().max(40).optional(),
  memo: z.string().trim().max(200, { error: "메모는 200자 이내로 적어 주세요." }).optional(),
});

export async function createPaymentAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user, company } = await requireCompanyMember("user");
  const parsed = RequestSchema.safeParse({
    provider: formData.get("provider"),
    billingMonth: formData.get("billingMonth"),
    amount: String(formData.get("amount") ?? "").replace(/[^0-9]/g, ""),
    dueDate: formData.get("dueDate"),
    invoiceNo: formData.get("invoiceNo") ?? undefined,
    memo: formData.get("memo") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  const input = parsed.data;

  return run(async () => {
    // 구분(LLM/GPU)은 클라이언트가 아니라 회사의 연동 정보로 정합니다.
    const [conn] = await db
      .select()
      .from(s.connections)
      .where(and(eq(s.connections.companyId, company.id), eq(s.connections.provider, input.provider)))
      .limit(1);
    if (!conn || conn.status !== "connected" || (conn.category !== "llm" && conn.category !== "gpu"))
      throw new DomainError("연동된 LLM·GPU 공급사의 청구서만 요청할 수 있습니다.");
    await createPaymentRequest(user, { ...input, category: conn.category });
    revalidatePath("/user", "layout");
    revalidatePath("/company", "layout");
    revalidatePath("/admin", "layout");
  }, `${input.provider} ${krw(input.amount)} 결제를 요청했습니다. 회사 승인 후 운영사가 대신 결제합니다.`);
}
