import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { GradeMark, ScoreMeter } from "@/components/score-meter";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo, dateTimeKo, krw, pct } from "@/lib/format";
import { monthsEnding } from "@/lib/months";
import { getCompanyScore } from "@/lib/services/scoring";
import { getNameMaps } from "@/lib/services/admin-queries";
import { DecisionForm } from "../../_components/decision-form";
import { RecommendationBadge } from "../../_components/recommendation-badge";
import { CompanyProfile, FlagList, LimitFormula, MonthlyTable, ScoreBreakdown, WorkloadTable } from "../../_components/score-sections";

export const metadata = { title: "심사 상세" };

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const [app] = await db.select().from(s.applications).where(eq(s.applications.id, id)).limit(1);
  if (!app) notFound();
  const [[company], score, names] = await Promise.all([
    db.select().from(s.companies).where(eq(s.companies.id, app.companyId)).limit(1),
    getCompanyScore(app.companyId),
    getNameMaps(),
  ]);
  if (!company) notFound();
  const { result, config, data, asOf } = score;
  const scored = result.status === "scored";
  const months3 = monthsEnding(asOf, 3);
  const scoreChanged = scored && result.score !== app.score;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin/reviews">
          <ChevronLeftIcon data-icon="inline-start" />
          심사 목록
        </Link>
      </Button>
      <PageHeader
        title={`${company.name} 한도 신청`}
        description={`${dateKo(app.createdAt)} 신청. 용도: ${app.purpose}`}
        actions={<StatusBadge kind="application" status={app.status} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>현재 TokenScore</CardTitle>
            <CardDescription>
              {scoreChanged
                ? `신청 시점 ${app.grade}등급 ${app.score}점에서 최신 데이터로 다시 계산했습니다.`
                : "최신 공급사 데이터로 다시 계산한 결과입니다."}
            </CardDescription>
            <CardAction className="flex items-center gap-2">
              <RecommendationBadge value={scored ? result.recommendation : "review"} />
              <GradeMark grade={scored ? result.grade : "-"} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {scored ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-6xl leading-none font-medium tracking-[-0.04em]">{result.score}</span>
                  <span className="text-ink-soft">/ 1000점, 등급계수 {result.coefficient}, 수수료 {pct(result.feeRate)}</span>
                </p>
                <ScoreMeter score={result.score} grade={result.grade} cutoffs={config.cutoffs} />
              </>
            ) : (
              <p className="text-ink-soft">{result.insufficientReason}</p>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-ink-soft">신청 금액</dt>
                <dd className="num text-xl font-semibold">{krw(app.requestedAmount)}</dd>
                <dd className="text-xs text-ink-soft">{app.termMonths}개월 상환</dd>
              </div>
              <div>
                <dt className="text-ink-soft">산정 한도 (현재)</dt>
                <dd className={`num text-xl font-semibold ${app.requestedAmount > result.limit.amount ? "text-risk" : "text-ink"}`}>
                  {krw(result.limit.amount)}
                </dd>
                <dd className="text-xs text-ink-soft">
                  {app.requestedAmount > result.limit.amount && <span className="font-semibold text-risk">신청액보다 적음. </span>}
                  신청 시 {krw(app.suggestedLimit)}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-ink-soft">최근 3개월 평균</dt>
                <dd className="num font-medium">매출 {krw(result.kpis.avgRevenue3)}</dd>
                <dd className="num font-medium">컴퓨트 {krw(result.kpis.avgCompute3)}</dd>
              </div>
            </dl>
            <LimitFormula result={result} config={config} />
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>심사 결정</CardTitle>
            <CardDescription>
              {app.status === "submitted" ? "결정은 감사 로그에 남고, 승인하면 기존 한도는 새 한도로 바뀝니다." : "이미 처리된 신청입니다."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {app.status === "submitted" ? (
              <DecisionForm
                applicationId={app.id}
                defaultLimit={Math.min(app.requestedAmount, result.limit.amount || app.suggestedLimit)}
                suggestedLimit={result.limit.amount}
                requestedAmount={app.requestedAmount}
                companyName={company.name}
              />
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink-soft">결과</dt>
                <dd>
                  <StatusBadge kind="application" status={app.status} />
                </dd>
                {app.approvedLimit && (
                  <>
                    <dt className="text-ink-soft">승인 한도</dt>
                    <dd className="num font-semibold">{krw(app.approvedLimit)}</dd>
                  </>
                )}
                <dt className="text-ink-soft">처리</dt>
                <dd>{app.autoDecided ? "자동 승인" : app.decidedBy ? (names.user.get(app.decidedBy) ?? "심사역") : "-"}</dd>
                <dt className="text-ink-soft">일시</dt>
                <dd className="num">{dateTimeKo(app.decidedAt)}</dd>
                <dt className="text-ink-soft">메모</dt>
                <dd>{app.decisionNote ?? "-"}</dd>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <SectionTitle className="mt-9">확인할 점</SectionTitle>
      <FlagList flags={result.flags} />

      <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ScoreBreakdown result={result} />
        <CompanyProfile company={company} govPrograms={data.govPrograms} investments={data.investments} connections={data.connections} />
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <WorkloadTable result={result} months={months3} />
        <MonthlyTable result={result} />
      </div>
    </>
  );
}
