import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Num } from "@/components/metrics";
import { GradeMark } from "@/components/score-meter";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { krw, num, pct } from "@/lib/format";
import { BUSINESS_MODEL_LABEL, getCompanyOverviews } from "@/lib/services/admin-queries";

export const metadata = { title: "기업" };

export default async function CompaniesPage() {
  await requireUser("admin");
  const [all, connections] = await Promise.all([getCompanyOverviews(), db.select().from(s.connections)]);
  const overviews = [...all].sort((a, b) => a.company.name.localeCompare(b.company.name, "ko"));

  return (
    <>
      <PageHeader title="기업" description="연동된 AI 기업 전체입니다. 점수는 최신 공급사 데이터 기준이며, 이름을 누르면 심사 근거와 거래 내역을 볼 수 있습니다." />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">기업</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>등급</TableHead>
              <TableHead className="text-right">월 매출</TableHead>
              <TableHead className="text-right">유료 컴퓨트</TableHead>
              <TableHead className="text-right">효율</TableHead>
              <TableHead className="text-right">한도 사용</TableHead>
              <TableHead>연동</TableHead>
              <TableHead className="pr-4">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overviews.map(({ company, result, line, usage }) => {
              const conns = connections.filter((c) => c.companyId === company.id);
              const on = conns.filter((c) => c.status === "connected").length;
              return (
                <TableRow key={company.id}>
                  <TableCell className="pl-4">
                    <Link href={`/admin/companies/${company.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {company.name}
                    </Link>
                    <span className="block text-[12.5px] text-ink-soft">{company.industry}</span>
                  </TableCell>
                  <TableCell className="text-ink-soft">{BUSINESS_MODEL_LABEL[company.model]}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <GradeMark grade={result.status === "scored" ? result.grade : "-"} />
                      <Num className="text-ink-soft">{result.status === "scored" ? result.score : "보류"}</Num>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num>{krw(result.kpis.avgRevenue3)}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num>{krw(result.kpis.avgCompute3)}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num className={result.kpis.computeEfficiency < 1.5 ? "text-risk" : undefined}>{num(result.kpis.computeEfficiency, 2)}배</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    {line && usage ? (
                      <>
                        <Num>{krw(usage.inUse)}</Num>
                        <span className="block text-[12.5px] text-ink-soft">
                          {krw(line.limitAmount)} 중 {pct(usage.utilization, 0)}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-soft">한도 없음</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Num className={on < conns.length ? "text-ink-soft" : undefined}>
                      {on}/{conns.length}
                    </Num>
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge kind="company" status={company.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

