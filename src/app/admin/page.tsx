import Link from "next/link";
import { desc } from "drizzle-orm";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Num, Stat, StatRow } from "@/components/metrics";
import { GradeExposureChart } from "@/components/charts";
import { GradeMark } from "@/components/score-meter";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateTimeKo, krw, pct } from "@/lib/format";
import { GRADES } from "@/lib/scoring/config";
import { getCompanyOverviews, getNameMaps } from "@/lib/services/admin-queries";

export const metadata = { title: "포트폴리오" };

export default async function AdminHome() {
  await requireUser("admin");
  const [overviews, names, recent] = await Promise.all([
    getCompanyOverviews(),
    getNameMaps(),
    db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(5),
  ]);

  const withLine = overviews.filter((o) => o.line && o.usage);
  const totalLimit = withLine.reduce((a, o) => a + o.line!.limitAmount, 0);
  const inUse = withLine.reduce((a, o) => a + o.usage!.inUse, 0);
  const outstanding = withLine.reduce((a, o) => a + o.usage!.outstanding, 0);
  const overdue = overviews.reduce((a, o) => a + o.overdueAmount, 0);
  const pending = overviews.reduce((a, o) => a + o.pendingApplications, 0);

  // 현재 점수 기준 등급별 익스포저: 승인 당시 등급이 아니라 지금의 위험을 봅니다.
  const exposure = GRADES.map((grade) => {
    const rows = withLine.filter((o) => o.result.status === "scored" && o.result.grade === grade);
    return { grade, exposure: rows.reduce((a, o) => a + o.usage!.inUse, 0), companies: rows.length };
  });
  const sorted = [...overviews].sort((a, b) => b.openAlerts - a.openAlerts || (b.usage?.inUse ?? 0) - (a.usage?.inUse ?? 0));

  return (
    <>
      <PageHeader
        title="포트폴리오"
        description="승인한 한도가 지금 어떤 위험 등급에 얼마나 나가 있는지 봅니다. 점수는 매일 최신 공급사 데이터로 다시 계산됩니다."
        actions={
          pending > 0 ? (
            <Button asChild>
              <Link href="/admin/reviews">심사 대기 {pending}건 보기</Link>
            </Button>
          ) : undefined
        }
      />

      <StatRow>
        <Stat lead label="사용 중 익스포저" value={krw(inUse)} tone="money" sub={`승인 한도 ${krw(totalLimit)}의 ${pct(totalLimit ? inUse / totalLimit : 0, 0)}`} />
        <Stat label="갚을 잔액 (수수료 포함)" value={krw(outstanding)} />
        <Stat
          label="연체 금액"
          value={krw(overdue)}
          tone={overdue > 0 ? "risk" : "ink"}
          sub={`잔액 대비 ${pct(outstanding ? overdue / outstanding : 0)}`}
        />
        <Stat label="심사 대기" value={`${pending}건`} />
      </StatRow>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader>
            <CardTitle>등급별 사용 중 한도</CardTitle>
            <CardDescription>현재 TokenScore 등급 기준입니다. D·E 등급으로 내려간 익스포저는 조기 경보에서 따로 봅니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <GradeExposureChart data={exposure} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 처리</CardTitle>
            <CardDescription>
              <Link href="/admin/audit" className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                감사 로그 전체 보기
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-line text-[13.5px]">
              {recent.map((log) => (
                <li key={log.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="min-w-0">
                    <span className="font-semibold">{log.action}</span>{" "}
                    <span className="text-ink-soft">
                      {log.companyId ? `${names.company.get(log.companyId) ?? log.companyId}, ` : ""}
                      {log.detail}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[12.5px] text-ink-soft">
                    {log.actorName} {dateTimeKo(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle className="mt-9" aside={`${overviews.length}곳`}>
        기업별 현황
      </SectionTitle>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">기업</TableHead>
              <TableHead>현재 등급</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">승인 한도</TableHead>
              <TableHead className="text-right">사용 중</TableHead>
              <TableHead className="text-right">연체</TableHead>
              <TableHead className="pr-4 text-right">경보</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((o) => (
              <TableRow key={o.company.id}>
                <TableCell className="pl-4">
                  <Link href={`/admin/companies/${o.company.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {o.company.name}
                  </Link>
                  <span className="block text-[12.5px] text-ink-soft">{o.company.industry}</span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <GradeMark grade={o.result.status === "scored" ? o.result.grade : "-"} />
                    <Num className="text-ink-soft">{o.result.status === "scored" ? `${o.result.score}점` : "평가 보류"}</Num>
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge kind="company" status={o.company.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Num>{o.line ? krw(o.line.limitAmount) : "-"}</Num>
                </TableCell>
                <TableCell className="text-right">
                  <Num>{o.usage ? krw(o.usage.inUse) : "-"}</Num>
                </TableCell>
                <TableCell className="text-right">
                  <Num className={o.overdueAmount > 0 ? "font-semibold text-risk" : "text-ink-soft"}>{o.overdueAmount > 0 ? krw(o.overdueAmount) : "없음"}</Num>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  {o.openAlerts > 0 ? (
                    o.alerts.some((a) => a.severity === "critical" && !a.acked) ? (
                      <Badge variant="risk">위험 {o.openAlerts}건</Badge>
                    ) : (
                      <Badge variant="caution">주의 {o.openAlerts}건</Badge>
                    )
                  ) : (
                    <span className="text-ink-soft">없음</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
