import "server-only";
import { db, schema as s } from "@/lib/db";

export async function logAudit(
  actor: { id: string; name: string } | null,
  companyId: string | null,
  action: string,
  detail: string,
) {
  await db.insert(s.auditLogs).values({
    id: crypto.randomUUID(),
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "시스템",
    companyId,
    action,
    detail,
  });
}
