import "server-only";
import { cache } from "react";
import { desc, inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { Company, CreditLine } from "@/lib/db/schema";
import { getCompanyScore } from "./scoring";
import { lineUsage } from "./credit";
import { computeAlerts } from "./alerts";

export const BUSINESS_MODEL_LABEL: Record<Company["model"], string> = {
  api: "API형",
  gpu: "직접 운영형",
  hybrid: "혼합형",
};

/** 관리자 화면 공통: 기업별 점수·한도·연체·경보를 한 번에 모읍니다. */
export const getCompanyOverviews = cache(async () => {
  const [companies, lines, payments, repayments, applications] = await Promise.all([
    db.select().from(s.companies),
    db
      .select()
      .from(s.creditLines)
      .where(inArray(s.creditLines.status, ["active", "frozen"]))
      .orderBy(desc(s.creditLines.approvedAt)),
    db.select().from(s.paymentRequests),
    db.select().from(s.repayments),
    db.select().from(s.applications),
  ]);

  return Promise.all(
    companies.map(async (company) => {
      const [{ result }, alerts] = await Promise.all([getCompanyScore(company.id), computeAlerts(company)]);
      const line: CreditLine | null = lines.find((l) => l.companyId === company.id) ?? null;
      const usage = line
        ? lineUsage(
            line,
            payments.filter((p) => p.companyId === company.id),
            repayments.filter((r) => r.companyId === company.id),
          )
        : null;
      const overdueRows = repayments.filter((r) => r.companyId === company.id && r.status === "overdue");
      return {
        company,
        result,
        line,
        usage,
        alerts,
        openAlerts: alerts.filter((a) => !a.acked && a.severity !== "info").length,
        overdueAmount: overdueRows.reduce((a, r) => a + r.expectedAmount - r.paidAmount, 0),
        overdueCount: overdueRows.length,
        pendingApplications: applications.filter((a) => a.companyId === company.id && a.status === "submitted").length,
      };
    }),
  );
});

export const getNameMaps = cache(async () => {
  const [companies, users] = await Promise.all([
    db.select({ id: s.companies.id, name: s.companies.name }).from(s.companies),
    db.select({ id: s.users.id, name: s.users.name }).from(s.users),
  ]);
  return {
    company: new Map(companies.map((c) => [c.id, c.name])),
    user: new Map(users.map((u) => [u.id, u.name])),
  };
});
