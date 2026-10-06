import { asc, eq } from "drizzle-orm";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Num, Stat, StatRow } from "@/components/metrics";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo, krw, pct } from "@/lib/format";
import { currentMonth, monthLabel, shortMonthLabel } from "@/lib/months";
import { TriangleAlertIcon } from "lucide-react";

export const metadata = { title: "상환" };

export default async function RepaymentsPage() {
  const { company } = await requireCompanyMember("company");
  const [rows, payments] = await Promise.all([
    db.select().from(s.repayments).where(eq(s.repayments.companyId, company.id)).orderBy(asc(s.repayments.dueMonth), asc(s.repayments.seq)),
    db.select().from(s.paymentRequests).where(eq(s.paymentRequests.companyId, company.id)),
  ]);
  const thisMonth = currentMonth();
  const payment = (id: string) => payments.find((p) => p.id === id);
  const remaining = rows.reduce((a, r) => a + r.expectedAmount - r.paidAmount, 0);
  const repaid = rows.reduce((a, r) => a + r.paidAmount, 0);
  const overdue = rows.filter((r) => r.status === "overdue");
  const overdueAmount = overdue.reduce((a, r) => a + r.expectedAmount - r.paidAmount, 0);
  const thisCycle = rows.filter((r) => r.dueMonth === thisMonth && r.status !== "paid");
  const months = [...new Set(rows.map((r) => r.dueMonth))];

  return (
    <>
      <PageHeader
        title="상환"
        description="결제한 청구서마다 수수료를 더해 기간으로 나눈 금액을, 매달 들어오는 매출에서 자동으로 빼 갑니다. 매출 대비 비율은 결제할 때 정해집니다."
      />

      {overdue.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlertIcon />
          <AlertTitle>연체 {overdue.length}건, {krw(overdueAmount)}</AlertTitle>
          <AlertDescription>
            매출 계좌 잔액이 부족해 일부만 빠져나갔습니다. 연체가 이어지면 한도가 정지될 수 있습니다. 상환 일정 조정이 필요하면 운영사에 문의하세요.
          </AlertDescription>
        </Alert>
      )}

      <StatRow className="mb-7">
        <Stat lead label="남은 상환액" value={krw(remaining)} sub="수수료 포함" />
        <Stat label={`${monthLabel(thisMonth)} 빠져나갈 금액`} value={krw(thisCycle.reduce((a, r) => a + r.expectedAmount - r.paidAmount, 0))} />
        <Stat label="지금까지 갚은 금액" value={krw(repaid)} tone="money" />
        <Stat label="연체" value={krw(overdueAmount)} tone={overdueAmount ? "risk" : "ink"} />
      </StatRow>

      <SectionTitle>월별 일정</SectionTitle>
      {months.length ? (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">상환월</TableHead>
                  <TableHead>청구서</TableHead>
                  <TableHead>회차</TableHead>
                  <TableHead className="text-right">매출 대비</TableHead>
                  <TableHead className="text-right">상환액</TableHead>
                  <TableHead className="text-right">빠져나간 금액</TableHead>
                  <TableHead className="pr-5">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const p = payment(r.paymentRequestId);
                  const firstOfMonth = i === 0 || rows[i - 1].dueMonth !== r.dueMonth;
                  return (
                    <TableRow key={r.id} className={r.dueMonth === thisMonth ? "bg-primary-soft" : undefined}>
                      <TableCell className="pl-5 font-medium">{firstOfMonth ? shortMonthLabel(r.dueMonth) : ""}</TableCell>
                      <TableCell>
                        {p?.provider}
                        <span className="block text-xs text-ink-soft">
                          {p ? `${shortMonthLabel(p.billingMonth)} 사용분, ${krw(p.amount)}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="num">
                        {r.seq}/{rows.filter((x) => x.paymentRequestId === r.paymentRequestId).length}
                      </TableCell>
                      <TableCell className="num text-right">{pct(r.revenueShare)}</TableCell>
                      <TableCell className="num text-right">{krw(r.expectedAmount)}</TableCell>
                      <TableCell className="num text-right">
                        <Num>{krw(r.paidAmount)}</Num>
                        {r.paidAt && <span className="block text-xs text-ink-soft">{dateKo(r.paidAt)}</span>}
                      </TableCell>
                      <TableCell className="pr-5">
                        <StatusBadge kind="repayment" status={r.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-ink-soft">아직 상환할 금액이 없습니다. Compute Pay로 청구서를 결제하면 일정이 생깁니다.</p>
      )}
    </>
  );
}
