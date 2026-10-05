"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { endSession, startSession } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/session";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

export type LoginState = { error?: string; email?: string } | undefined;

const LoginSchema = z.object({
  email: z.email({ error: "이메일 형식이 아닙니다." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "비밀번호를 입력하세요." }),
});

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const [user] = await db.select().from(s.users).where(eq(s.users.email, parsed.data.email)).limit(1);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "이메일 또는 비밀번호가 맞지 않습니다.", email };
  }
  await startSession(user.id, user.role);
  redirect(homeFor(user.role));
}

/** 데모 계정으로 바로 들어갑니다. 발표 중 역할을 빠르게 바꿀 때 씁니다. */
export async function demoLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  if (!DEMO_ACCOUNTS.some((a) => a.email === email)) redirect("/login");
  const [user] = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
  if (!user) redirect("/login");
  await startSession(user.id, user.role);
  redirect(homeFor(user.role));
}

export async function logout() {
  await endSession();
  redirect("/login");
}
