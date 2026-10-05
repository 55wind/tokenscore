import { desc, eq } from "drizzle-orm";
import { SendIcon } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Num, UsageMeter } from "@/components/metrics";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import type { PaymentRequest, Repayment } from "@/lib/db/schema";
import { dateKo, krw, pct } from "@/lib/format";
import { addMonths, lastClosedMonth, monthLabel } from "@/lib/months";
import { getLineSummary } from "@/lib/services/credit";
import { cn } from "@/lib/utils";
import { RequestForm, type ProviderOption } from "./request-form";

export const metadata = { title: "결제 요청" };

const STEPS = ["요청", "회사 승인", "운영사 집행", "상환 일정"];

function progressOf(p: PaymentRequest) {
  if (p.status === "requested") return 1;
  if (p.status === "approved") return 2;
  if (p.status === "paid") return 4;
  return 0;
}

function Steps({ p }: { p: PaymentRequest }) {
  if (p.status === "rejected") return null;
  const done = progressOf(p);
  return (
    <ol aria-label="진행 단계" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px]">
      {STEPS.map((label, i) => {
        const state = i < done ? "done" : i === done ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className={cn("h-px w-3", i <= done ? "bg-money" : "bg-line-strong")} />}
            <span
              className={cn(
                "inline-flex items-center gap-1",
                state === "done" && "text-money-strong",
                state === "current" && "font-semibold text-ink",
                state === "todo" && "text-ink-soft",
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  state === "done" && "bg-money",
                  state === "current" && "bg-ink",
                  state === "todo" && "bg-line-strong",
                )}
              />
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function statusText(p: PaymentRequest, repayments: Repayment[]) {
  if (p.status === "requested") return "회사 대표·재무 담당자의 승인을 기다리고 있습니다.";
  if (p.status === "approved") return "한도에서 차감되었습니다. 운영사가 공급사에 대신 결제합니다.";
  if (p.status === "rejected") return p.rejectReason ? `반려 사유: ${p.rejectReason}` : "반려되었습니다.";
  const rows = repayments.filter((r) => r.paymentRequestId === p.id);
  const paid = rows.filter((r) => r.status === "paid").length;
  return `${dateKo(p.paidAt)} 결제 완료. ${rows.length}개월간 매출의 약 ${pct(p.revenueShare ?? 0)}씩 상환 (${paid}/${rows.length}회차 완료)${
    p.feeAmount ? `, 수수료 ${krw(p.feeAmount)}` : ""
  }`;
}

function RequestList({
  items,
  repayments,
  names,
  showRequester,
}: {
  items: PaymentRequest[];
  repayments: Repayment[];
  names: Map<string, string>;
  showRequester: boolean;
}) {
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-elev-sm">
      {items.map((p) => (
        <li key={p.id} className="flex flex-col gap-2.5 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-ink">{p.provider}</p>
              <StatusBadge kind="payment" status={p.status} />
            </div>
            <p className="text-[12.5px] text-ink-soft">
              {monthLabel(p.billingMonth, true)} 청구, {p.invoiceNo}
              {showRequester && `, ${names.get(p.requestedBy) ?? "구성원"}님 요청`}
            </p>
            {p.memo && <p className="text-[13px] text-ink-soft">{p.memo}</p>}
            <Steps p={p} />
            <p className={cn("text-[12.5px]", p.status === "rejected" ? "text-ink" : "text-ink-soft")}>{statusText(p, repayments)}</p>
          </div>
          <div className="shrink-0 sm:text-right">
            <Num className="text-[17px] font-[700]">{krw(p.amount)}</Num>
            <p className="text-[12px] text-ink-soft">납부 기한 {p.dueDate.replaceAll("-", ". ")}.</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function RequestsPage() {
  const { user, company } = await requireCompanyMember("user");
  const [summary, connections, requests, repayments, members] = await Promise.all([
    getLineSummary(company.id),
    db.select().from(s.connections).where(eq(s.connections.companyId, company.id)),
    db.select().from(s.paymentRequests).where(eq(s.paymentRequests.companyId, company.id)).orderBy(desc(s.paymentRequests.createdAt)),
    db.select().from(s.repayments).where(eq(s.repayments.companyId, company.id)),
    db.select({ id: s.users.id, name: s.users.name }).from(s.users).where(eq(s.users.companyId, company.id)),
  ]);

  const providers: ProviderOption[] = connections
    .filter((c) => c.status === "connected" && (c.category === "llm" || c.category === "gpu"))
    .map((c) => ({ provider: c.provider, category: c.category as "llm" | "gpu" }));
  const billingMonth = lastClosedMonth();
  const dueDate = `${addMonths(billingMonth, 1)}-10`;
  const names = new Map(members.map((m) => [m.id, m.name]));
  const mine = requests.filter((r) => r.requestedBy === user.id);
  const others = requests.filter((r) => r.requestedBy !== user.id);

  return (
    <>
      <PageHeader
        title="결제 요청"
        description="곧 나올 LLM·GPU 청구서를 Compute Pay로 결제해 달라고 회사에 요청합니다. 회사가 승인하면 TokenScore가 공급사에 대신 내고, 회사는 매출이 들어올 때 나눠서 갚습니다."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>새 결제 요청</CardTitle>
            <CardDescription>청구서 정보를 적어 주세요. 10만원 이상부터 요청할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {providers.length ? (
              <RequestForm providers={providers} defaultBillingMonth={billingMonth} defaultDueDate={dueDate} />
            ) : (
              <p className="text-[13.5px] text-ink-soft">연동된 LLM·GPU 공급사가 없습니다. 회사 담당자에게 데이터 연동을 요청하세요.</p>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="self-start">
          <CardHeader>
            <CardTitle>회사 Compute Pay 한도</CardTitle>
            <CardDescription>
              {summary ? `${summary.line.grade}등급, ${summary.line.partner} 제휴` : "아직 승인된 한도가 없습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-[13.5px]">
            {summary ? (
              <>
                <div>
                  <p className="text-[12.5px] text-ink-soft">남은 한도</p>
                  <p className="text-[26px] leading-tight font-[760] tracking-[-0.03em] text-money-strong">{krw(summary.available)}</p>
                </div>
                <UsageMeter value={summary.inUse} max={summary.limit} label="한도 사용률" />
                <p className="text-ink-soft">
                  승인 한도 <Num className="font-medium text-ink">{krw(summary.limit)}</Num> 중{" "}
                  <Num className="font-medium text-ink">{krw(summary.inUse)}</Num>을 쓰고 있습니다.
                  {summary.line.status !== "active" && " 지금은 한도가 정지되어 승인이 막혀 있습니다."}
                </p>
              </>
            ) : (
              <p className="text-ink-soft">요청은 지금 보낼 수 있습니다. 회사가 한도를 받은 뒤에 승인할 수 있습니다.</p>
            )}
            <p className="text-ink-soft">요청 금액이 남은 한도보다 크면 회사가 승인할 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>

      <SectionTitle className="mt-9" aside={mine.length ? `${mine.length}건` : undefined}>
        내 요청
      </SectionTitle>
      {mine.length ? (
        <RequestList items={mine} repayments={repayments} names={names} showRequester={false} />
      ) : (
        <Empty className="rounded-xl bg-surface shadow-elev-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SendIcon />
            </EmptyMedia>
            <EmptyTitle>아직 보낸 요청이 없습니다</EmptyTitle>
            <EmptyDescription>이번 달 GPU·LLM 청구서가 나오면 위 양식으로 결제를 요청하세요.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {others.length > 0 && (
        <>
          <SectionTitle className="mt-9" aside={`${others.length}건`}>
            팀의 다른 요청
          </SectionTitle>
          <RequestList items={others} repayments={repayments} names={names} showRequester />
        </>
      )}
    </>
  );
}
