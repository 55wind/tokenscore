import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { Role } from "@/lib/db/schema";
import { SESSION_COOKIE, decodeSession, encodeSession, homeFor } from "./session";

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [user] = await db.select().from(s.users).where(eq(s.users.id, session.uid)).limit(1);
  return user ?? null;
});

/** 로그인과 역할을 확인합니다. 다른 역할이면 그 역할의 홈으로 보냅니다. */
export async function requireUser(role?: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}

/** 회사·사용자 포털용: 소속 회사까지 함께 돌려줍니다. */
export async function requireCompanyMember(role: "company" | "user") {
  const user = await requireUser(role);
  if (!user.companyId) redirect("/login");
  const [company] = await db.select().from(s.companies).where(eq(s.companies.id, user.companyId)).limit(1);
  if (!company) redirect("/login");
  return { user, company };
}

export async function startSession(userId: string, role: Role) {
  const jar = await cookies();
  const { value, maxAge } = encodeSession(userId, role);
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
