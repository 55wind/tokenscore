import Link from "next/link";
import { desc } from "drizzle-orm";
import { ReceiptTextIcon } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Num } from "@/components/metrics";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo, krw, pct } from "@/lib/format";
import { monthLabel, shortMonthLabel } from "@/lib/months";
import { planRepayment } from "@/lib/scoring/engine";
import { getCompanyScore } from "@/lib/services/scoring";
import { getNameMaps } from "@/lib/services/admin-queries";
import { executePaymentAction, rejectPaymentAction } from "../actions";
import { ConfirmAction } from "../_components/confirm-action";

export const metadata = { title: "선결제 집행" };

export default async function PaymentsPage() {
  await requireUser("admin");
  const [payments, lines, names] = await Promise.all([
    db.select().from(s.paymentRequests).orderBy(desc(s.paymentRequests.createdAt)),
    db.select().from(s.creditLines),
    getNameMaps(),
  ]);
  const queue = payments.filter((p) => p.status === "approved");
  const waiting = payments.filter((p) => p.status === "requested");
  const history = payments.filter((p) => p.status === "paid" || p.status === "rejected");

  const previews = await Promise.all(
    queue.map(async (p) => {
      const line = lines.find((l) => l.id === p.creditLineId) ?? null;
      const { result } = await getCompanyScore(p.companyId);
      const plan = line ? planRepayment(p.amount, line.feeRate, result.kpis.avgRevenue3, line.termMonths) : null;
      return { p, line, plan, grade: result.status === "scored" ? result.grade : null };
    }),
  );

  return (
    <>
      <PageHeader
        title="선결제 집행"
        description="회사가 승인한 청구서를 공급사에 대신 결제합니다. 집행하면 수수료를 더한 금액이 매출연동 상환 일정으로 잡힙니다."
      />

      <SectionTitle aside={`${queue.length}건, ${krw(queue.reduce((a, p) => a + p.amount, 0))}`}>집행 대기</SectionTitle>
      {queue.length === 0 ? (
        <Empty className="border border-line bg-surface">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptTextIcon />
            </EmptyMedia>
            <EmptyTitle>집행할 결제가 없습니다</EmptyTitle>
            <EmptyDescription>회사가 구성원의 결제 요청을 승인하면 여기에 올라옵니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {previews.map(({ p, line, plan, grade }) => {
            const company = names.company.get(p.companyId) ?? p.companyId;
            const frozen = line?.status !== "active";
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>
                    <Link href={`/admin/companies/${p.companyId}`} className="underline-offset-4 hover:underline">
                      {company}
                    </Link>
                    <span className="font-normal text-ink-soft"> {p.provider}</span>
                  </CardTitle>
                  <CardDescription className="num">
                    {p.invoiceNo}, {monthLabel(p.billingMonth, true)} 청구, 납기 {p.dueDate}
                  </CardDescription>
                  <CardAction>{frozen ? <Badge variant="risk">한도 정지</Badge> : grade && <Badge variant="neutral">현재 {grade}등급</Badge>}</CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="num text-3xl leading-tight font-semibold tracking-[-0.03em]">{krw(p.amount)}</p>
                  {plan && (
                    <dl className="grid grid-cols-2 gap-y-2 text-sm">
                      <dt className="text-ink-soft">수수료 ({pct(line!.feeRate)})</dt>
                      <dd className="num text-right">{krw(plan.fee)}</dd>
                      <dt className="text-ink-soft">상환 총액</dt>
                      <dd className="num text-right font-medium">{krw(plan.total)}</dd>
                      <dt className="text-ink-soft">월 상환 ({plan.termMonths}개월)</dt>
                      <dd className="num text-right">{krw(plan.monthly)}</dd>
                      <dt className="text-ink-soft">최근 매출 대비</dt>
                      <dd className="num text-right">{pct(plan.revenueShare)}</dd>
                    </dl>
                  )}
                  <p className="text-xs text-ink-soft">
                    요청 {names.user.get(p.requestedBy) ?? "-"}, 회사 승인 {p.approvedBy ? (names.user.get(p.approvedBy) ?? "-") : "-"} ({dateKo(p.approvedAt)})
                    {p.memo ? `. 메모: ${p.memo}` : ""}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
                  <ConfirmAction
                    action={executePaymentAction}
                    hidden={{ id: p.id }}
                    triggerLabel="집행"
                    triggerVariant="default"
                    triggerSize="default"
                    title={`${p.provider}에 ${krw(p.amount)}을 결제할까요?`}
                    description={
                      plan
                        ? `${company}의 한도에서 나가며, 수수료 포함 ${krw(plan.total)}을 ${plan.termMonths}개월 동안 매달 약 ${krw(plan.monthly)}씩 매출에서 회수합니다.`
                        : "한도 정보를 확인할 수 없습니다."
                    }
                    confirmLabel="집행"
                  />
                  <ConfirmAction
                    action={rejectPaymentAction}
                    hidden={{ id: p.id }}
                    triggerLabel="반려"
                    triggerVariant="ghost"
                    triggerSize="default"
                    title="결제 요청을 반려할까요?"
                    description="반려하면 잡아 둔 한도가 풀리고, 회사와 요청한 구성원 화면에 사유가 보입니다."
                    confirmLabel="반려"
                    confirmVariant="destructive"
                    reason={{ name: "reason", label: "반려 사유", placeholder: "예: 청구서 금액이 공급사 청구 데이터와 다릅니다." }}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {waiting.length > 0 && (
        <>
          <SectionTitle className="mt-9" aside={`${waiting.length}건`}>
            회사 승인 대기
          </SectionTitle>
          <p className="-mt-1 mb-3 text-sm text-ink-soft">구성원이 요청했고 아직 회사가 승인하지 않은 청구서입니다. 운영사는 처리할 수 없습니다.</p>
          <Card className="py-0">
            <PaymentTable rows={waiting} names={names} />
          </Card>
        </>
      )}

      <SectionTitle className="mt-9" aside={`${history.length}건`}>
        처리 내역
      </SectionTitle>
      <Card className="py-0">
        <PaymentTable rows={history} names={names} showPaid />
      </Card>
    </>
  );
}

function PaymentTable({
  rows,
  names,
  showPaid = false,
}: {
  rows: (typeof s.paymentRequests.$inferSelect)[];
  names: Awaited<ReturnType<typeof getNameMaps>>;
  showPaid?: boolean;
}) {
  if (!rows.length) return <p className="p-4 text-sm text-ink-soft">내역이 없습니다.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">기업</TableHead>
          <TableHead>공급사</TableHead>
          <TableHead>청구월</TableHead>
          <TableHead className="text-right">금액</TableHead>
          {showPaid && <TableHead className="text-right">수수료</TableHead>}
          <TableHead>{showPaid ? "처리일" : "요청일"}</TableHead>
          <TableHead className="pr-4">상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="pl-4 font-medium">{names.company.get(p.companyId) ?? p.companyId}</TableCell>
            <TableCell>
              {p.provider}
              {p.rejectReason && <span className="block max-w-[30ch] text-xs whitespace-normal text-ink-soft">{p.rejectReason}</span>}
            </TableCell>
            <TableCell>
              <Num>{shortMonthLabel(p.billingMonth)}</Num>
            </TableCell>
            <TableCell className="text-right">
              <Num>{krw(p.amount)}</Num>
            </TableCell>
            {showPaid && (
              <TableCell className="text-right">
                <Num className="text-ink-soft">{p.feeAmount ? krw(p.feeAmount) : "-"}</Num>
              </TableCell>
            )}
            <TableCell>
              <Num className="text-ink-soft">{dateKo(showPaid ? (p.paidAt ?? p.createdAt) : p.createdAt)}</Num>
            </TableCell>
            <TableCell className="pr-4">
              <StatusBadge kind="payment" status={p.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

