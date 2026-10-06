import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { GradeMark, ScoreMeter } from "@/components/score-meter";
import { Num, UsageMeter } from "@/components/metrics";
import { CostTrendChart, RevenueComputeChart } from "@/components/charts";
import { SeverityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo, krw, pct } from "@/lib/format";
import { monthLabel, monthsEnding, shortMonthLabel } from "@/lib/months";
import { getCompanyScore } from "@/lib/services/scoring";
import { getLineSummary } from "@/lib/services/credit";
import { computeAlerts } from "@/lib/services/alerts";
import { getNameMaps } from "@/lib/services/admin-queries";
import { setLineStatusAction } from "../../actions";
import { ConfirmAction } from "../../_components/confirm-action";
import { CompanyProfile, FlagList, LimitFormula, MonthlyTable, ScoreBreakdown, WorkloadTable } from "../../_components/score-sections";

export const metadata = { title: "기업 상세" };

export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const [company] = await db.select().from(s.companies).where(eq(s.companies.id, id)).limit(1);
  if (!company) notFound();

  const [score, line, alerts, payments, repayments, names] = await Promise.all([
    getCompanyScore(company.id),
    getLineSummary(company.id),
    computeAlerts(company),
    db.select().from(s.paymentRequests).where(eq(s.paymentRequests.companyId, company.id)).orderBy(desc(s.paymentRequests.createdAt)),
    db.select().from(s.repayments).where(eq(s.repayments.companyId, company.id)).orderBy(asc(s.repayments.dueMonth), asc(s.repayments.seq)),
    getNameMaps(),
  ]);
  const { result, config, data, asOf } = score;
  const scored = result.status === "scored";
  const trend = result.monthly.map((m) => ({
    month: m.month,
    llm: m.llmCost,
    inference: m.inferenceGpuCost,
    training: m.excluded.training + m.excluded.ambiguous,
  }));
  const openRepayments = repayments.filter((r) => r.status !== "paid");

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin/companies">
          <ChevronLeftIcon data-icon="inline-start" />
          기업 목록
        </Link>
      </Button>
      <PageHeader
        title={company.name}
        description={`${company.industry}. ${monthLabel(asOf, true)} 마감 데이터 기준입니다.`}
        actions={<StatusBadge kind="company" status={company.status} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>TokenScore</CardTitle>
            <CardDescription>{scored ? `등급계수 ${result.coefficient}, 수수료 ${pct(result.feeRate)}` : result.insufficientReason}</CardDescription>
            <CardAction>
              <GradeMark grade={scored ? result.grade : "-"} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {scored && (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-6xl leading-none font-medium tracking-[-0.04em]">{result.score}</span>
                  <span className="text-ink-soft">/ 1000점</span>
                </p>
                <ScoreMeter score={result.score} grade={result.grade} cutoffs={config.cutoffs} />
                <LimitFormula result={result} config={config} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compute Pay 한도</CardTitle>
            <CardDescription>
              {line ? `${line.line.partner} 제휴, 승인 당시 ${line.line.grade}등급 ${line.line.score}점, ${dateKo(line.line.approvedAt)} 승인` : "승인된 한도가 없습니다."}
            </CardDescription>
            {line && (
              <CardAction>
                <StatusBadge kind="line" status={line.line.status} />
              </CardAction>
            )}
          </CardHeader>
          {line && (
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-ink-soft">사용 중</p>
                <p className="num text-3xl leading-tight font-semibold tracking-[-0.03em]">
                  {krw(line.inUse)} <span className="text-lg font-medium text-ink-soft">/ {krw(line.limit)}</span>
                </p>
              </div>
              <UsageMeter value={line.inUse} max={line.limit} tone={line.utilization >= 0.85 ? "risk" : "money"} label="한도 사용률" />
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-ink-soft">남은 한도</dt>
                <dd className="num text-right font-medium">{krw(line.available)}</dd>
                <dt className="text-ink-soft">집행 대기</dt>
                <dd className="num text-right font-medium">{krw(line.pendingExecution)}</dd>
                <dt className="text-ink-soft">갚을 잔액 (수수료 포함)</dt>
                <dd className="num text-right font-medium">{krw(line.outstanding)}</dd>
              </dl>
              {line.line.status === "active" ? (
                <ConfirmAction
                  action={setLineStatusAction}
                  hidden={{ lineId: line.line.id, status: "frozen" }}
                  triggerLabel="한도 정지"
                  triggerVariant="destructive"
                  title={`${company.name}의 한도를 정지할까요?`}
                  description="정지하면 새 결제 승인과 집행이 막히고 기업 상태가 '관찰'로 바뀝니다. 이미 잡힌 상환 일정은 그대로 진행됩니다."
                  confirmLabel="한도 정지"
                  confirmVariant="destructive"
                />
              ) : (
                <ConfirmAction
                  action={setLineStatusAction}
                  hidden={{ lineId: line.line.id, status: "active" }}
                  triggerLabel="정지 해제"
                  title="한도 정지를 풀까요?"
                  description="기업이 다시 결제를 승인하고 집행받을 수 있습니다. 경보 원인이 해소되었는지 먼저 확인하세요."
                  confirmLabel="정지 해제"
                />
              )}
            </CardContent>
          )}
        </Card>
      </div>

      <SectionTitle className="mt-9" aside={alerts.length ? `${alerts.length}건` : undefined}>
        경보와 확인할 점
      </SectionTitle>
      {alerts.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {alerts.map((a) => (
            <li key={a.key} className="flex items-start gap-2">
              <SeverityBadge severity={a.severity} />
              <span>
                <span className="font-semibold">{a.title}</span> <span className="text-ink-soft">{a.detail}</span>
                {a.acked && <span className="block text-xs text-ink-soft">확인함{a.acked.note ? `: ${a.acked.note}` : ""}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <FlagList flags={result.flags} />
      )}

      <div className="mt-9 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>월별 컴퓨트 비용</CardTitle>
            <CardDescription>파란색은 학습·판별 불가 GPU로, 한도 계산에서 뺀 금액입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <CostTrendChart data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>매출과 유료 컴퓨트</CardTitle>
            <CardDescription>최근 12개월, 공급사 청구와 PG 정산 기준입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueComputeChart data={result.monthly.map((m) => ({ month: m.month, revenue: m.revenue, compute: m.computeCost }))} />
          </CardContent>
        </Card>
      </div>

      <SectionTitle className="mt-9" aside={`${payments.length}건`}>
        결제 요청
      </SectionTitle>
      <Card className="py-0">
        {payments.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">공급사</TableHead>
                <TableHead>청구월</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>요청</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="pr-4 text-right">상환 비율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-4">
                    <span className="font-medium">{p.provider}</span>
                    <span className="num block text-xs text-ink-soft">{p.invoiceNo}</span>
                  </TableCell>
                  <TableCell>
                    <Num>{shortMonthLabel(p.billingMonth)}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num className="font-medium">{krw(p.amount)}</Num>
                  </TableCell>
                  <TableCell className="text-ink-soft">{names.user.get(p.requestedBy) ?? "-"}</TableCell>
                  <TableCell>
                    <StatusBadge kind="payment" status={p.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Num className="text-ink-soft">{p.revenueShare ? `매출의 ${pct(p.revenueShare)}` : "-"}</Num>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-4 text-sm text-ink-soft">결제 요청이 없습니다.</p>
        )}
      </Card>

      <SectionTitle className="mt-9" aside={`남은 ${openRepayments.length}건`}>
        상환 일정
      </SectionTitle>
      <Card className="py-0">
        {repayments.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">만기</TableHead>
                <TableHead>회차</TableHead>
                <TableHead className="text-right">예정 금액</TableHead>
                <TableHead className="text-right">상환액</TableHead>
                <TableHead className="pr-4">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repayments.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-4">
                    <Num>{monthLabel(r.dueMonth, true)}</Num>
                  </TableCell>
                  <TableCell>
                    <Num className="text-ink-soft">{r.seq}회차</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num>{krw(r.expectedAmount)}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num className={r.status === "overdue" ? "text-risk" : undefined}>{krw(r.paidAmount)}</Num>
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge kind="repayment" status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-4 text-sm text-ink-soft">상환 일정이 없습니다.</p>
        )}
      </Card>

      <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ScoreBreakdown result={result} />
        <CompanyProfile company={company} govPrograms={data.govPrograms} investments={data.investments} connections={data.connections} />
      </div>
      <div className="mt-5 flex flex-col gap-5">
        <WorkloadTable result={result} months={monthsEnding(asOf, 3)} />
        <MonthlyTable result={result} />
      </div>
    </>
  );
}
