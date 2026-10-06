import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  ArrowUpRightIcon,
  BanknoteArrowUpIcon,
  CalendarClockIcon,
  GaugeIcon,
  LandmarkIcon,
  PlugZapIcon,
  ReceiptTextIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { ScoreMeter, GradeMark } from "@/components/score-meter";
import { Stat, StatRow, Num } from "@/components/metrics";
import { RevenueComputeChart } from "@/components/charts";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { krw, num, pct } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { getCompanyScore } from "@/lib/services/scoring";
import { getLineSummary } from "@/lib/services/credit";

export const metadata = { title: "개요" };

export default async function CompanyHome() {
  const { company } = await requireCompanyMember("company");
  const [{ result, bridge, asOf, data, config }, line, requests, nextRepayments, applications] = await Promise.all([
    getCompanyScore(company.id),
    getLineSummary(company.id),
    db
      .select()
      .from(s.paymentRequests)
      .where(and(eq(s.paymentRequests.companyId, company.id), eq(s.paymentRequests.status, "requested"))),
    db
      .select()
      .from(s.repayments)
      .where(and(eq(s.repayments.companyId, company.id), inArray(s.repayments.status, ["scheduled", "overdue"])))
      .orderBy(asc(s.repayments.dueMonth)),
    db.select().from(s.applications).where(and(eq(s.applications.companyId, company.id), eq(s.applications.status, "submitted"))),
  ]);
  const users = requests.length ? await db.select().from(s.users).where(eq(s.users.companyId, company.id)) : [];
  const scored = result.status === "scored";
  const k = result.kpis;
  const connected = data.connections.filter((c) => c.status === "connected").length;
  const bankMissing = !data.connections.some((c) => c.category === "bank" && c.status === "connected");
  const overdue = nextRepayments.filter((r) => r.status === "overdue");
  const dueMonth = nextRepayments[0]?.dueMonth;
  const dueThisCycle = nextRepayments.filter((r) => r.dueMonth === dueMonth).reduce((a, r) => a + r.expectedAmount - r.paidAmount, 0);

  return (
    <>
      <PageHeader
        title={company.name}
        description={`${company.industry}. ${monthLabel(asOf, true)}까지 마감된 공급사 청구 데이터와 PG 매출로 계산했습니다.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/company/score">TokenScore 리포트</Link>
          </Button>
        }
      />

      {bridge && (
        <Alert className="mb-6">
          <LandmarkIcon />
          <AlertTitle>
            {bridge.program.name} 지원이 {monthLabel(bridge.program.endMonth)}에 끝납니다
          </AlertTitle>
          <AlertDescription>
            지금 정부 지원으로 쓰는 GPU {krw(bridge.governmentCovered)}어치를 다음 달부터 직접 내야 합니다. 다음 달 컴퓨트 비용은{" "}
            <strong className="font-semibold text-ink">{krw(bridge.projectedNext)}</strong>로 늘어날 전망입니다.
            {line ? " 승인된 한도로 늘어난 청구서를 대신 결제할 수 있습니다." : " 지원이 끝나기 전에 Compute Pay 한도를 받아 두세요."}
          </AlertDescription>
          {!line && (
            <AlertAction>
              <Button asChild size="sm">
                <Link href="/company/credit">한도 신청</Link>
              </Button>
            </AlertAction>
          )}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>TokenScore</CardTitle>
            <CardDescription>공급사 청구 데이터와 PG 매출로 매긴 신용점수입니다.</CardDescription>
            <CardAction>
              <GradeMark grade={scored ? result.grade : "-"} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {scored ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-6xl leading-none font-medium tracking-[-0.04em] text-ink">{result.score}</span>
                  <span className="text-lg text-ink-soft">/ 1000점</span>
                </p>
                <ScoreMeter score={result.score} grade={result.grade} cutoffs={config.cutoffs} />
                <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {result.subScores.map((sub) => (
                    <li key={sub.key} className="flex items-center justify-between gap-3 border-b border-line/70 py-2">
                      <span className="text-ink-soft">{sub.label}</span>
                      <Num className="font-semibold text-ink">{sub.score}</Num>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xl font-semibold text-ink">평가 보류</p>
                <p className="text-ink-soft">{result.insufficientReason}</p>
                <p className="text-ink-soft">무료 크레딧과 자체 신고 데이터는 심사에 쓰지 않습니다. 유료 결제가 3개월 이상 쌓이면 바로 점수가 나옵니다.</p>
                <ScoreMeter score={0} grade="E" cutoffs={config.cutoffs} muted />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 한도 카드: 화면의 두 번째 중심. 파란 면 위 흰 글자로 띄웁니다. */}
        <section
          aria-labelledby="limit-title"
          className="relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#2457cc] to-navy p-6 text-white shadow-elev-md"
        >
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <h2 id="limit-title" className="text-lg font-bold">
                Compute Pay 한도
              </h2>
              <p className="mt-1 text-sm text-white/75">
                {line ? `${line.line.partner} 제휴, ${line.line.grade}등급, 수수료 ${pct(line.line.feeRate)}` : "LLM·GPU 청구서를 먼저 내주고, 매출이 들어오면 나눠서 갚습니다."}
              </p>
            </div>
            {line && <StatusBadge kind="line" status={line.line.status} />}
          </div>
          <div className="relative mt-6 flex flex-1 flex-col">
            {line ? (
              <>
                <p className="text-sm text-white/75">남은 한도</p>
                <p className="text-[clamp(2rem,1.4rem+2vw,2.75rem)] leading-tight font-extrabold tracking-[-0.03em]">{krw(line.available)}</p>
                <div
                  role="meter"
                  aria-label="한도 사용률"
                  aria-valuemin={0}
                  aria-valuemax={line.limit}
                  aria-valuenow={line.inUse}
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20"
                >
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, line.utilization * 100)}%` }} />
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  {[
                    ["승인 한도", line.limit],
                    ["사용 중", line.inUse],
                    ["갚을 금액", line.outstanding],
                  ].map(([k2, v]) => (
                    <div key={k2 as string} className="rounded-2xl bg-white/10 px-3 py-2.5">
                      <dt className="text-xs text-white/70">{k2}</dt>
                      <dd className="num mt-0.5 font-bold">{krw(v as number)}</dd>
                    </div>
                  ))}
                </dl>
                <Button asChild className="mt-6 self-start rounded-full bg-white px-5 font-bold text-primary hover:bg-white/90">
                  <Link href="/company/pay">청구서 결제하기</Link>
                </Button>
              </>
            ) : applications.length ? (
              <>
                <p className="text-2xl font-extrabold">심사 중</p>
                <p className="mt-2 text-white/80">
                  {krw(applications[0].requestedAmount)} 신청을 심사하고 있습니다. 공급사 데이터 검증이 끝나면 결과를 알려 드립니다.
                </p>
              </>
            ) : scored ? (
              <>
                <p className="text-sm text-white/75">지금 받을 수 있는 한도</p>
                <p className="text-[clamp(2rem,1.4rem+2vw,2.75rem)] leading-tight font-extrabold tracking-[-0.03em]">{krw(result.limit.amount)}</p>
                <p className="mt-3 text-sm text-white/75">
                  최근 3개월 평균 유료 컴퓨트 {krw(k.avgCompute3)} × 3 × 등급계수 {num(result.coefficient, 2)}
                </p>
                <Button asChild className="mt-auto self-start rounded-full bg-white px-5 font-bold text-primary hover:bg-white/90">
                  <Link href="/company/credit">한도 신청</Link>
                </Button>
              </>
            ) : (
              <p className="text-white/80">점수가 나오면 한도를 신청할 수 있습니다.</p>
            )}
          </div>
        </section>
      </div>

      <QuickTiles
        tiles={[
          { href: "/company/connections", label: "데이터 연동", sub: `${data.connections.length}곳 중 ${connected}곳 연결`, icon: PlugZapIcon, tone: "sky" },
          { href: "/company/score", label: "TokenScore", sub: scored ? `${result.score}점 ${result.grade}등급` : "평가 보류", icon: GaugeIcon, tone: "navy" },
          { href: "/company/credit", label: "한도 신청", sub: line ? "한도 사용 중" : scored ? `${krw(result.limit.amount)} 가능` : "점수 필요", icon: BanknoteArrowUpIcon, tone: "blue" },
          { href: "/company/pay", label: "Compute Pay", sub: requests.length ? `승인 대기 ${requests.length}건` : "대기 없음", icon: ReceiptTextIcon, tone: "mint" },
          { href: "/company/repayments", label: "상환", sub: dueMonth ? `${monthLabel(dueMonth)} ${krw(dueThisCycle)}` : "예정 없음", icon: CalendarClockIcon, tone: overdue.length ? "coral" : "white" },
          { href: "/company/programs", label: "정부 지원", sub: bridge ? "졸업 브릿지 대상" : "매칭 보기", icon: LandmarkIcon, tone: "white" },
        ]}
      />

      <StatRow className="mt-5">
        <Stat lead label="월 매출 (최근 3개월 평균)" value={krw(k.avgRevenue3)} tone="money" sub={`매출 월 성장률 ${pct(k.revenueGrowth)}`} />
        <Stat label="유료 컴퓨트 비용" value={krw(k.avgCompute3)} tone="compute" sub="토큰 + 추론 GPU" />
        <Stat label="컴퓨트 1원당 매출" value={`${num(k.computeEfficiency, 2)}원`} />
        {k.revenuePerMTokens !== null && <Stat label="토큰 100만 개당 매출" value={krw(k.revenuePerMTokens)} />}
        {k.revenuePerGpuHour !== null && <Stat label="추론 GPU 1시간당 매출" value={krw(k.revenuePerGpuHour)} />}
      </StatRow>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>매출과 유료 컴퓨트</CardTitle>
            <CardDescription>두 선의 간격이 벌어질수록 컴퓨트를 돈으로 잘 바꾸고 있다는 뜻입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueComputeChart data={result.monthly.map((m) => ({ month: m.month, revenue: m.revenue, compute: m.computeCost }))} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card size="sm">
            <CardHeader>
              <CardTitle>처리할 일</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {requests.length > 0 && (
                <TodoRow
                  href="/company/pay"
                  title={`결제 요청 ${requests.length}건`}
                  body={requests
                    .slice(0, 2)
                    .map((r) => `${users.find((u) => u.id === r.requestedBy)?.name ?? "구성원"}님 ${r.provider} ${krw(r.amount)}`)
                    .join(", ")}
                />
              )}
              {overdue.length > 0 && (
                <TodoRow href="/company/repayments" title={`연체 ${overdue.length}건`} tone="risk" body="매출 계좌 잔액을 확인하고 상환 일정을 조정하세요." />
              )}
              {bankMissing && (
                <TodoRow href="/company/connections" title="상환 계좌 연결" body="한도를 받으려면 매출이 들어오는 계좌를 연결해야 합니다." />
              )}
              {!requests.length && !overdue.length && !bankMissing && <p className="text-ink-soft">지금 처리할 일이 없습니다.</p>}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>다음 상환</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {dueMonth ? (
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-soft">{monthLabel(dueMonth, true)} 매출에서 자동 차감</span>
                  <Num className="text-lg font-semibold">{krw(dueThisCycle)}</Num>
                </div>
              ) : (
                <p className="text-ink-soft">예정된 상환이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>데이터 연동</CardTitle>
              <CardAction>
                <Link href="/company/connections" className="text-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  관리
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm text-ink-soft">
              공급사 {data.connections.length}곳 중 <span className="num font-semibold text-ink">{connected}</span>곳이 연결되어 있습니다.
            </CardContent>
          </Card>
        </div>
      </div>

      <SectionTitle className="mt-9">심사에 반영되지 않은 사용</SectionTitle>
      <p className="max-w-[72ch] text-sm text-ink-soft">
        학습용 GPU, 정부 지원과 무료 크레딧 사용분, 기업이 직접 신고한 데이터는 한도 계산에서 뺍니다. 매출과 직접 이어지는 유료 추론 사용만 봅니다.
        {result.flags.length > 0 && " 이번 달 반영 내역:"}
      </p>
      {result.flags.length > 0 && (
        <ul className="mt-2 flex max-w-[72ch] flex-col gap-1 text-sm">
          {result.flags.map((f) => (
            <li key={f.message} className="flex gap-2">
              <span aria-hidden className={f.severity === "critical" ? "text-risk" : f.severity === "warning" ? "text-caution" : "text-ink-soft"}>
                •
              </span>
              {f.message}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** 처리할 일 한 줄. 모든 줄이 같은 모양의 링크라서 누를 수 있다는 것이 한눈에 보입니다. */
function TodoRow({ href, title, body, tone }: { href: string; title: string; body: string; tone?: "risk" }) {
  return (
    <Link
      href={href}
      className="group -mx-2 flex items-start justify-between gap-3 rounded-md px-2 py-2 outline-none hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>
        <span className={tone === "risk" ? "font-semibold text-risk" : "font-semibold"}>{title}</span>
        <span className="block text-ink-soft">{body}</span>
      </span>
      <ArrowUpRightIcon aria-hidden className="mt-1 size-4 shrink-0 text-ink-soft group-hover:text-ink" />
    </Link>
  );
}

const TILE_TONE = {
  sky: "bg-gradient-to-br from-sky to-sky-strong text-ink",
  navy: "bg-navy text-white",
  blue: "bg-gradient-to-br from-primary to-primary-strong text-white",
  mint: "bg-gradient-to-br from-mint to-[#d5f2e8] text-ink",
  coral: "bg-gradient-to-br from-coral to-[#b52a2a] text-white",
  white: "bg-surface text-ink",
} as const;

/** 바로 가기 타일: 각 화면의 지금 상태를 한 줄로 보여 주는 색 타일. */
function QuickTiles({
  tiles,
}: {
  tiles: { href: string; label: string; sub: string; icon: LucideIcon; tone: keyof typeof TILE_TONE }[];
}) {
  return (
    <nav aria-label="바로 가기" className="mt-5">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => {
          const Icon = t.icon;
          const dark = t.tone === "navy" || t.tone === "blue" || t.tone === "coral";
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "group flex h-full min-h-[132px] flex-col justify-between rounded-2xl p-4 shadow-elev-sm outline-none transition-transform duration-200 ease-(--ease-out) hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  TILE_TONE[t.tone],
                )}
              >
                <span className={cn("grid size-10 place-items-center rounded-xl", dark ? "bg-white/15" : "bg-surface shadow-elev-sm")}>
                  <Icon aria-hidden className={cn("size-5", !dark && "text-primary")} strokeWidth={2.2} />
                </span>
                <span>
                  <span className="block text-base font-extrabold tracking-[-0.01em]">{t.label}</span>
                  <span className={cn("mt-0.5 block text-xs font-medium", dark ? "text-white/80" : "text-ink-soft")}>{t.sub}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
