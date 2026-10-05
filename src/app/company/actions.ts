"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireCompanyMember } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { db, schema as s } from "@/lib/db";
import { DEMO_PASSWORD } from "@/lib/demo-accounts";
import type { ActionResult } from "@/lib/action-result";
import { submitApplication, DomainError } from "@/lib/services/credit";
import { approveByCompany, rejectPayment } from "@/lib/services/payments";
import { connectProvider, disconnectProvider, syncProvider } from "@/lib/services/connections";
import { logAudit } from "@/lib/services/audit";
import { run } from "@/lib/services/run";
import { krw } from "@/lib/format";

const done = () => revalidatePath("/company", "layout");

export async function connectAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await requireCompanyMember("company");
  const provider = String(formData.get("provider") ?? "");
  return run(async () => {
    await connectProvider(user, provider);
    done();
  }, `${provider} 데이터를 연결했습니다.`);
}

export async function syncAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await requireCompanyMember("company");
  const provider = String(formData.get("provider") ?? "");
  return run(async () => {
    await syncProvider(user, provider);
    done();
  }, `${provider} 데이터를 다시 불러왔습니다.`);
}

export async function disconnectAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await requireCompanyMember("company");
  const provider = String(formData.get("provider") ?? "");
  return run(async () => {
    await disconnectProvider(user, provider);
    done();
  }, `${provider} 연결을 해제했습니다.`);
}

const ApplySchema = z.object({
  requestedAmount: z.coerce.number().int().min(1_000_000, { error: "100만원 이상 신청하세요." }),
  termMonths: z.coerce.number().int().min(3).max(6),
  purpose: z.string().trim().min(4, { error: "자금 용도를 적어 주세요." }).max(200),
});

export async function applyAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await requireCompanyMember("company");
  const parsed = ApplySchema.safeParse({
    requestedAmount: String(formData.get("requestedAmount") ?? "").replace(/[^0-9]/g, ""),
    termMonths: formData.get("termMonths"),
    purpose: formData.get("purpose"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  let auto = false;
  const result = await run(async () => {
    auto = (await submitApplication(user, parsed.data)).auto;
    done();
    revalidatePath("/admin", "layout");
  }, "한도를 신청했습니다. 심사 결과는 이 화면과 알림으로 알려 드립니다.");
  if (result?.ok && auto) return { ok: true, message: `${krw(parsed.data.requestedAmount)} 한도가 자동 승인되었습니다.` };
  return result;
}

export async function approvePaymentAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await requireCompanyMember("company");
  return run(async () => {
    await approveByCompany(user, String(formData.get("id")));
    done();
    revalidatePath("/admin", "layout");
    revalidatePath("/user", "layout");
  }, "결제를 승인했습니다. TokenScore가 공급사에 대신 결제합니다.");
}

export async function rejectPaymentAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await requireCompanyMember("company");
  return run(async () => {
    await rejectPayment(user, String(formData.get("id")), String(formData.get("reason") ?? ""));
    done();
    revalidatePath("/user", "layout");
  }, "결제 요청을 반려했습니다.");
}

const InviteSchema = z.object({
  name: z.string().trim().min(2, { error: "이름을 입력하세요." }),
  email: z.email({ error: "이메일 형식이 아닙니다." }).trim().toLowerCase(),
  title: z.string().trim().max(30).default(""),
});

export async function inviteMemberAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user, company } = await requireCompanyMember("company");
  const parsed = InviteSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), title: formData.get("title") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  return run(async () => {
    const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, parsed.data.email)).limit(1);
    if (exists) throw new DomainError("이미 가입된 이메일입니다.");
    await db.insert(s.users).values({
      id: crypto.randomUUID(),
      email: parsed.data.email,
      name: parsed.data.name,
      title: parsed.data.title,
      role: "user",
      companyId: company.id,
      passwordHash: hashPassword(DEMO_PASSWORD),
    });
    await logAudit(user, company.id, "구성원 초대", `${parsed.data.name} (${parsed.data.email})`);
    done();
  }, `${parsed.data.name}님을 초대했습니다. 임시 비밀번호는 ${DEMO_PASSWORD}입니다.`);
}
