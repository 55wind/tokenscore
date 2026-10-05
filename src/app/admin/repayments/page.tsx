import Link from "next/link";
import { asc } from "drizzle-orm";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Num, Stat, StatRow } from "@/components/metrics";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import type { Repayment } from "@/lib/db/schema";
import { krw, pct } from "@/lib/format";
import { addMonths, currentMonth, monthLabel } from "@/lib/months";
import { getNameMaps } from "@/lib/services/admin-queries";
import { markRepaymentPaidAction, runCollectionAction } from "../actions";
import { InlineAction } from "../_components/confirm-action";

export const metadata = { title: "상환 관리" };

export default async function RepaymentsPage() {
  await requireUser("admin");
  const [rows, payments, names] = await Promise.all([
    db.select().from(s.repayments).orderBy(asc(s.repayments.dueMonth), asc(s.repayments.seq)),
    db.select().from(s.paymentRequests),
    getNameMaps(),
  ]);
  const thisMonth = currentMonth();
  const remaining = (r: Repayment) => r.expectedAmount - r.paidAmount;

  const due = rows.filter((r) => r.status !== "paid" && r.dueMonth <= thisMonth);
  const overdue = rows.filter((r) => r.status === "overdue");
  const dueThisMonth = rows.filter((r) => r.status === "scheduled" && r.dueMonth === thisMonth);
  const upcoming = rows.filter((r) => r.status === "scheduled" && r.dueMonth > thisMonth && r.dueMonth <= addMonths(thisMonth, 2));
  const collected = rows.reduce((a, r) => a + r.paidAmount, 0);
  const outstanding = rows.reduce((a, r) => a + remaining(r), 0);
  const overdueAmount = overdue.reduce((a, r) => a + remaining(r), 0);
  const provider = (r: Repayment) => payments.find((p) => p.id === r.paymentRequestId)?.provider ?? "-";

  return (
    <>
      <PageHeader
        title="상환 관리"
        description="상환은 매달 말 기업 매출 계좌에서 정해진 비율만큼 자동으로 빠져나갑니다. 데모에서는 월 마감 배치를 버튼으로 직접 돌립니다."
      />

      <StatRow>
        <Stat lead label={`${monthLabel(thisMonth)} 회수 예정`} value={krw(dueThisMonth.reduce((a, r) => a + remaining(r), 0))} tone="money" sub={`${dueThisMonth.length}건`} />
        <Stat label="연체" value={krw(overdueAmount)} tone={overdueAmount > 0 ? "risk" : "ink"} sub={`${overdue.length}건, 잔액 대비 ${pct(outstanding ? overdueAmount / outstanding : 0)}`} />
        <Stat label="갚을 잔액 전체" value={krw(outstanding)} />
        <Stat label="지금까지 회수" value={krw(collected)} />
      </StatRow>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>매출연동 자동 상환 실행</CardTitle>
          <CardDescription>
            {monthLabel(thisMonth, true)}까지 만기가 된 상환 {due.length}건을 처리합니다. 관찰 대상 기업은 매출이 줄어 일부만 회수되고 연체로 남습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InlineAction action={runCollectionAction} label="자동 상환 실행" variant="default" size="default" />
        </CardContent>
      </Card>

      <SectionTitle className="mt-9" aside={`${due.length}건`}>
        만기 도래·연체
      </SectionTitle>
      <Card className="py-0">
        {due.length ? (
          <RepaymentTable rows={due} names={names} provider={provider} withAction />
        ) : (
          <p className="p-4 text-[13.5px] text-ink-soft">만기가 된 미상환 건이 없습니다.</p>
        )}
      </Card>

      <SectionTitle className="mt-9" aside={`${upcoming.length}건`}>
        다음 두 달 예정
      </SectionTitle>
      <Card className="py-0">
        {upcoming.length ? (
          <RepaymentTable rows={upcoming} names={names} provider={provider} />
        ) : (
          <p className="p-4 text-[13.5px] text-ink-soft">예정된 상환이 없습니다.</p>
        )}
      </Card>
    </>
  );
}

function RepaymentTable({
  rows,
  names,
  provider,
  withAction = false,
}: {
  rows: Repayment[];
  names: Awaited<ReturnType<typeof getNameMaps>>;
  provider: (r: Repayment) => string;
  withAction?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">기업</TableHead>
          <TableHead>만기</TableHead>
          <TableHead>결제 건</TableHead>
          <TableHead className="text-right">예정</TableHead>
          <TableHead className="text-right">미회수</TableHead>
          <TableHead className="text-right">매출 대비</TableHead>
          <TableHead>상태</TableHead>
          {withAction && <TableHead className="pr-4" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="pl-4">
              <Link href={`/admin/companies/${r.companyId}`} className="font-medium underline-offset-4 hover:underline">
                {names.company.get(r.companyId) ?? r.companyId}
              </Link>
            </TableCell>
            <TableCell>
              <Num>{monthLabel(r.dueMonth, true)}</Num>
            </TableCell>
            <TableCell className="text-ink-soft">
              {provider(r)} {r.seq}회차
            </TableCell>
            <TableCell className="text-right">
              <Num>{krw(r.expectedAmount)}</Num>
            </TableCell>
            <TableCell className="text-right">
              <Num className={r.status === "overdue" ? "font-semibold text-risk" : undefined}>{krw(r.expectedAmount - r.paidAmount)}</Num>
            </TableCell>
            <TableCell className="text-right">
              <Num className="text-ink-soft">{pct(r.revenueShare)}</Num>
            </TableCell>
            <TableCell>
              <StatusBadge kind="repayment" status={r.status} />
            </TableCell>
            {withAction && (
              <TableCell className="pr-4 text-right">
                <InlineAction action={markRepaymentPaidAction} hidden={{ id: r.id }} label="입금 확인" />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
