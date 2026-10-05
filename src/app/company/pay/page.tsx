import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Stat, StatRow, UsageMeter } from "@/components/metrics";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo, krw, pct } from "@/lib/format";
import { shortMonthLabel } from "@/lib/months";
import { getLineSummary } from "@/lib/services/credit";
import { PaymentDecision } from "./payment-decision";

export const metadata = { title: "Compute Pay" };

export default async function PayPage() {
  const { company } = await requireCompanyMember("company");
  const [line, payments, members] = await Promise.all([
    getLineSummary(company.id),
    db.select().from(s.paymentRequests).where(eq(s.paymentRequests.companyId, company.id)).orderBy(desc(s.paymentRequests.createdAt)),
    db.select().from(s.users).where(eq(s.users.companyId, company.id)),
  ]);
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? "-";
  const requested = payments.filter((p) => p.status === "requested");
  const inFlight = payments.filter((p) => p.status === "approved");
  const history = payments.filter((p) => p.status === "paid" || p.status === "rejected");

  return (
    <>
      <PageHeader
        title="Compute Pay"
        description="구성원이 올린 LLM·GPU 청구서를 승인하면 TokenScore가 공급사에 대신 결제합니다. 결제한 금액은 다음 달부터 매출에서 나눠 갚습니다."
      />

      {line ? (
        <StatRow className="mb-7">
          <Stat lead label="남은 한도" value={krw(line.available)} tone="money" sub={<UsageMeter className="mt-2 max-w-[240px]" value={line.inUse} max={line.limit} label="한도 사용률" />} />
          <Stat label="승인 한도" value={krw(line.limit)} />
          <Stat label="집행 대기" value={krw(line.pendingExecution)} tone="compute" sub="회사 승인 후 운영사 집행 전" />
          <Stat label="갚을 금액" value={krw(line.outstanding)} sub="수수료 포함" />
        </StatRow>
      ) : (
        <Card className="mb-7">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px]">
              <span className="font-semibold">아직 승인된 한도가 없습니다.</span>{" "}
              <span className="text-ink-soft">구성원의 결제 요청은 쌓이지만, 한도가 승인돼야 결제할 수 있습니다.</span>
            </p>
            <Button asChild>
              <Link href="/company/credit">한도 신청</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <SectionTitle aside={requested.length ? `${requested.length}건` : undefined}>승인을 기다리는 요청</SectionTitle>
      {requested.length ? (
        <div className="flex flex-col gap-3">
          {requested.map((p) => {
            const tooBig = line ? p.amount > line.available : true;
            return (
              <Card key={p.id} size="sm">
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[16px] font-semibold">{p.provider}</span>
                      <span className="num text-[20px] font-[720]">{krw(p.amount)}</span>
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">
                      {nameOf(p.requestedBy)}님 요청, {shortMonthLabel(p.billingMonth)} 사용분, 청구서 {p.invoiceNo}, 납부 기한 {p.dueDate}
                    </p>
                    {p.memo && <p className="mt-1 text-[13px]">{p.memo}</p>}
                    {tooBig && (
                      <p className="mt-1 text-[12.5px] font-medium text-risk">
                        {line ? `남은 한도 ${krw(line.available)}보다 큰 금액이라 승인할 수 없습니다.` : "한도가 승인되면 결제할 수 있습니다."}
                      </p>
                    )}
                  </div>
                  <PaymentDecision id={p.id} provider={p.provider} amount={p.amount} canApprove={!tooBig && line?.line.status === "active"} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className="rounded-xl border border-dashed border-line-strong py-10">
          <EmptyHeader>
            <EmptyTitle>승인할 요청이 없습니다</EmptyTitle>
            <EmptyDescription>구성원이 사용자 화면에서 청구서 결제를 요청하면 여기에 나타납니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {inFlight.length > 0 && (
        <>
          <SectionTitle className="mt-9">집행 대기</SectionTitle>
          <Card className="py-0">
            <CardContent className="overflow-x-auto px-0">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">공급사</TableHead>
                    <TableHead>청구서</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>승인</TableHead>
                    <TableHead className="pr-5">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inFlight.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-5 font-medium">{p.provider}</TableCell>
                      <TableCell className="text-ink-soft">
                        {p.invoiceNo}, {shortMonthLabel(p.billingMonth)}
                      </TableCell>
                      <TableCell className="num text-right">{krw(p.amount)}</TableCell>
                      <TableCell className="text-ink-soft">
                        {nameOf(p.approvedBy)}, {dateKo(p.approvedAt)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <StatusBadge kind="payment" status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <SectionTitle className="mt-9">결제 내역</SectionTitle>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          {history.length ? (
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">공급사</TableHead>
                  <TableHead>사용월</TableHead>
                  <TableHead className="text-right">결제 금액</TableHead>
                  <TableHead className="text-right">수수료</TableHead>
                  <TableHead className="text-right">매출 대비 상환율</TableHead>
                  <TableHead>결제일</TableHead>
                  <TableHead className="pr-5">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5 font-medium">
                      {p.provider}
                      <span className="block text-[12px] font-normal text-ink-soft">{p.invoiceNo}</span>
                    </TableCell>
                    <TableCell>{shortMonthLabel(p.billingMonth)}</TableCell>
                    <TableCell className="num text-right">{krw(p.amount)}</TableCell>
                    <TableCell className="num text-right">{p.feeAmount ? krw(p.feeAmount) : "-"}</TableCell>
                    <TableCell className="num text-right">{p.revenueShare ? pct(p.revenueShare) : "-"}</TableCell>
                    <TableCell>{p.paidAt ? dateKo(p.paidAt) : "-"}</TableCell>
                    <TableCell className="pr-5">
                      <StatusBadge kind="payment" status={p.status} />
                      {p.rejectReason && <span className="block text-[12px] text-ink-soft">{p.rejectReason}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-5 py-6 text-[13.5px] text-ink-soft">아직 결제한 청구서가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
