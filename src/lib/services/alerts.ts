import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { Company, User } from "@/lib/db/schema";
import { krw, pct } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { getCompanyScore } from "./scoring";
import { getLineSummary } from "./credit";
import { logAudit } from "./audit";

export type AlertSeverity = "info" | "warning" | "critical";

export interface CompanyAlert {
  key: string;
  companyId: string;
  companyName: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  acked: { note: string | null; at: Date } | null;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * 조기 경보는 저장하지 않고 원천 데이터에서 매번 계산합니다.
 * 데이터가 바뀌면 경보도 바로 따라 바뀝니다. '확인 처리'만 저장합니다.
 */
export async function computeAlerts(company: Company): Promise<CompanyAlert[]> {
  const [{ result, bridge }, summary, repayments, acks] = await Promise.all([
    getCompanyScore(company.id),
    getLineSummary(company.id),
    db.select().from(s.repayments).where(eq(s.repayments.companyId, company.id)),
    db.select().from(s.alertAcks).where(eq(s.alertAcks.companyId, company.id)),
  ]);
  const alerts: Omit<CompanyAlert, "acked">[] = [];
  const add = (key: string, severity: AlertSeverity, title: string, detail: string) =>
    alerts.push({ key, companyId: company.id, companyName: company.name, severity, title, detail });

  for (const f of result.flags) {
    if (f.message.includes("사용량이")) add("usage-drop", "critical", "사용량 급감", f.message);
    else if (f.message.includes("매출이")) add("revenue-drop", "critical", "매출 급감", f.message);
    else if (f.message.includes("매출보다 큽니다")) add("burn", "critical", "컴퓨트 비용이 매출 초과", f.message);
    else if (f.message.includes("의존도")) add("concentration", "warning", "공급사 집중", f.message);
    else if (f.message.includes("자체 신고")) add("self-reported", "warning", "검증 안 된 데이터", f.message);
    else if (f.message.includes("판별")) add("ambiguous", "info", "워크로드 판별 필요", f.message);
  }
  const overdue = repayments.filter((r) => r.status === "overdue");
  if (overdue.length) {
    const amount = overdue.reduce((a, r) => a + r.expectedAmount - r.paidAmount, 0);
    add("overdue", "critical", "상환 연체", `${overdue.length}건, 미회수 ${krw(amount)}`);
  }
  if (summary && summary.utilization >= 0.85)
    add("utilization", "warning", "한도 소진 임박", `한도의 ${pct(summary.utilization, 0)}를 쓰고 있습니다. 남은 한도 ${krw(summary.available)}`);
  if (bridge)
    add(
      "bridge",
      "info",
      "정부 지원 종료 예정",
      `${bridge.program.name}이 ${monthLabel(bridge.program.endMonth, true)}에 끝납니다. 다음 달 컴퓨트 비용이 ${krw(bridge.projectedNext)}로 늘어날 전망입니다.`,
    );

  return alerts
    .map((a) => {
      const ack = acks.find((x) => x.alertKey === a.key);
      return { ...a, acked: ack ? { note: ack.note, at: ack.createdAt } : null };
    })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export async function computeAllAlerts() {
  const companies = await db.select().from(s.companies);
  const all = await Promise.all(companies.map((c) => computeAlerts(c)));
  return all.flat().sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export async function acknowledgeAlert(admin: User, companyId: string, alertKey: string, note: string) {
  await db
    .insert(s.alertAcks)
    .values({ id: crypto.randomUUID(), companyId, alertKey, note: note || null, ackBy: admin.id })
    .onConflictDoUpdate({
      target: [s.alertAcks.companyId, s.alertAcks.alertKey],
      set: { note: note || null, ackBy: admin.id, createdAt: new Date() },
    });
  await logAudit(admin, companyId, "경보 확인", `${alertKey}${note ? `: ${note}` : ""}`);
}
