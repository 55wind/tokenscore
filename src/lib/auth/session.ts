import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/db/schema";

export const SESSION_COOKIE = "ts_session";
const MAX_AGE_SEC = 60 * 60 * 12;

export interface SessionPayload {
  uid: string;
  role: Role;
  exp: number;
}

function secret() {
  return process.env.SESSION_SECRET ?? "tokenscore-demo-secret-change-me";
}

function sign(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeSession(uid: string, role: Role) {
  const payload: SessionPayload = { uid, role, exp: Date.now() + MAX_AGE_SEC * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { value: `${data}.${sign(data)}`, maxAge: MAX_AGE_SEC };
}

export function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [data, sig] = value.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : role === "company" ? "/company" : "/user";
}
