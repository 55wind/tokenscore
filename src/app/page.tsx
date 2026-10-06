import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  Building2Icon,
  CalendarCheckIcon,
  CheckIcon,
  CodeXmlIcon,
  GaugeIcon,
  LandmarkIcon,
  PlugZapIcon,
  ShieldHalfIcon,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { SkipLink } from "@/components/shell/skip-link";
import { Button } from "@/components/ui/button";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { Marquee } from "@/components/landing/marquee";
import { Reveal } from "@/components/landing/reveal";
import { ScoreOrbit } from "@/components/landing/score-orbit";
import { SectionHeading } from "@/components/landing/section-heading";
import { ScoreMeter } from "@/components/score-meter";
import { demoLogin } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { krw, pct } from "@/lib/format";
import { planRepayment } from "@/lib/scoring/engine";
import { getCompanyScore } from "@/lib/services/scoring";
import { PROVIDER_CATALOG } from "@/lib/services/connections";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** 기획안 2장 '문제 정의'의 근거 수치 */
const PROBLEMS = [
  { big: "30~60%", unit: "", title: "매출보다 먼저 나가는 컴퓨트", body: "AI 스타트업은 매출의 30~60%를 토큰·GPU에 씁니다. 일반 SaaS는 5~15%입니다.", tone: "navy" },
  { big: "담보", unit: "·재무제표", title: "은행 심사의 벽", body: "유형자산과 재무 실적이 부족한 응용기업은 기존 대출 심사를 통과하기 어렵습니다.", tone: "white" },
  { big: "167", unit: "억원", title: "한시적인 정부 GPU 지원", body: "NIPA 고성능 컴퓨팅 지원처럼 기간이 끝나면 유료 GPU로 넘어가며 비용이 갑자기 늘어납니다.", tone: "sky" },
  { big: "10곳", unit: "가까이", title: "이미 시작한 해외", body: "2026년 6~9월 중국 은행 10곳 가까이가 '토큰 대출'을 출시했습니다. 국내에는 아직 없습니다.", tone: "mint" },
] as const;

const STEPS = [
  { title: "연동", body: "LLM 빌링, GPU 클라우드 사용 기록, PG 매출, 계좌를 동의를 받아 연결해요.", icon: PlugZapIcon },
  { title: "평가", body: "학습용·무료 사용분을 걷어내고 추론 컴퓨트의 효율로 점수와 한도를 매겨요.", icon: GaugeIcon },
  { title: "선결제", body: "한도 안에서 다음 달 LLM·GPU 청구서를 공급사에 대신 내 드려요.", icon: BanknoteIcon },
  { title: "상환", body: "매출이 들어오면 정해진 비율만큼 3~6개월에 나눠 자동으로 갚아요.", icon: CalendarCheckIcon },
];

const ROLE_STYLE = {
  company: { icon: Building2Icon, card: "bg-gradient-to-br from-primary to-primary-strong text-white", sub: "text-white/80", chip: "bg-white/15 text-white" },
  user: { icon: CodeXmlIcon, card: "bg-gradient-to-br from-mint to-[#d5f2e8] text-ink", sub: "text-ink-soft", chip: "bg-white/70 text-mint-strong" },
  admin: { icon: ShieldHalfIcon, card: "bg-navy text-white", sub: "text-white/75", chip: "bg-white/10 text-white" },
} as const;

const ROLE_FEATURES = {
  company: ["TokenScore 리포트", "한도 신청", "Compute Pay 승인", "상환·지원사업"],
  user: ["AI 비용 대시보드", "절감 제안", "청구서 결제 요청"],
  admin: ["심사 큐", "선결제 집행", "조기 경보", "심사 모델"],
} as const;

export default async function Landing() {
  const { result, bridge, config } = await getCompanyScore("replylab");
  const k = result.kpis;
  const lastMonth = result.monthly[result.monthly.length - 1];
  const plan = planRepayment(6_800_000, result.feeRate, k.avgRevenue3, 4);

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <SkipLink />
      {/* 바탕의 옅은 빛 번짐: 정보는 없고 면의 깊이만 줍니다 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 size-[620px] rounded-full bg-sky-strong/70 blur-[120px]" />
        <div className="absolute top-[38%] -right-48 size-[560px] rounded-full bg-mint blur-[120px]" />
        <div className="absolute bottom-[8%] -left-32 size-[520px] rounded-full bg-sky blur-[110px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Brand />
          </Link>
          <nav aria-label="랜딩 메뉴" className="hidden items-center gap-1 md:flex">
            {[
              ["#why", "왜 필요한가요"],
              ["#how", "심사 방식"],
              ["#process", "이용 과정"],
              ["#roles", "역할별 화면"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft outline-none hover:bg-surface-strong hover:text-ink focus-visible:ring-2 focus-visible:ring-ring">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4 shadow-glow">
              <a href="#roles">데모 시작</a>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {/* 1. 히어로 */}
        <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-20 lg:pb-28">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
            <span className="inline-flex h-8 items-center gap-2 rounded-full bg-sky px-4 text-sm font-bold text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              AI 응용기업 전용 컴퓨트 금융
            </span>
            <h1 className="mt-6 text-[clamp(2.375rem,1.4rem+4.2vw,4.25rem)] leading-[1.1] font-extrabold tracking-[-0.04em] text-ink">
              AI가 일한 기록으로
              <br />
              <span className="text-primary">신용</span>을 증명하세요
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg text-ink-soft">
              LLM 토큰과 GPU 사용량을 공급사 청구 데이터로 확인해 TokenScore와 한도를 냅니다. 한도 안에서는 다음 달 컴퓨트 청구서를 먼저 결제해 드려요.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-bold shadow-glow">
                <a href="#roles">
                  데모로 둘러보기 <ArrowRightIcon data-icon="inline-end" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-surface px-7 text-base font-bold">
                <a href="#how">심사 방식 보기</a>
              </Button>
            </div>
            <ul className="mt-9 grid gap-x-6 gap-y-2 text-sm font-semibold text-ink sm:grid-cols-3">
              {["공급사 청구 데이터만", "학습용 GPU 자동 제외", "수일 안에 자동 심사"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-positive/15 text-positive">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
            <HeroMockup result={result} config={config} excludedTraining={lastMonth.excluded.training + lastMonth.excluded.ambiguous} />
            <p className="sr-only">
              예시 기업 리플라이랩은 TokenScore {result.score}점 {result.grade}등급으로 Compute Pay 한도 {krw(result.limit.amount)}를 받았습니다.
            </p>
          </div>
        </section>

        {/* 2. 연동 공급사 */}
        <section aria-labelledby="providers" className="pb-20">
          <Reveal className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <h2 id="providers" className="text-center text-xl font-extrabold tracking-[-0.02em] text-ink sm:text-2xl">
              이런 곳의 청구 데이터를 연동해요
            </h2>
            <div className="mt-8 rounded-3xl bg-surface py-6 shadow-elev-sm">
              <Marquee label="연동 공급사 목록" duration={36}>
                {PROVIDER_CATALOG.map((p) => (
                  <span key={p.provider} className="mx-3 inline-flex items-center gap-2 rounded-full bg-surface-soft px-5 py-3 text-base font-bold whitespace-nowrap text-ink">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        p.category === "llm" ? "bg-chart-1" : p.category === "gpu" ? "bg-chart-2" : p.category === "pg" ? "bg-chart-4" : "bg-chart-3",
                      )}
                    />
                    {p.provider}
                  </span>
                ))}
              </Marquee>
            </div>
            <p className="mt-3 text-center text-sm text-ink-soft">
              <span className="mr-3 inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-1" />LLM API</span>
              <span className="mr-3 inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-2" />GPU 클라우드</span>
              <span className="mr-3 inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-4" />PG 매출</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-3" />상환 계좌</span>
            </p>
          </Reveal>
        </section>

        {/* 3. 문제 정의 */}
        <section id="why" aria-labelledby="why-title" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              id="why-title"
              tag="왜 필요한가요"
              title={
                <>
                  AI 기업의 성장은
                  <br />
                  재무제표보다 사용 로그에 먼저 보여요
                </>
              }
              action={
                <Button asChild size="lg" className="h-12 rounded-full px-6 font-bold shadow-glow">
                  <a href="#how">
                    어떻게 보는지 <ArrowRightIcon data-icon="inline-end" />
                  </a>
                </Button>
              }
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <article
                  className={cn(
                    "flex h-full flex-col justify-between gap-10 rounded-3xl p-7 shadow-elev-sm transition-transform duration-200 ease-(--ease-out) hover:-translate-y-1",
                    p.tone === "navy" && "bg-navy text-white",
                    p.tone === "white" && "bg-surface text-ink",
                    p.tone === "sky" && "bg-gradient-to-br from-sky to-sky-strong text-ink",
                    p.tone === "mint" && "bg-gradient-to-br from-mint to-[#d5f2e8] text-ink",
                  )}
                >
                  <p className="text-[44px] leading-none font-extrabold tracking-[-0.04em]">
                    {p.big}
                    <span className="ml-1 text-lg font-bold tracking-normal opacity-70">{p.unit}</span>
                  </p>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-[-0.02em]">{p.title}</h3>
                    <p className={cn("mt-2 text-sm", p.tone === "navy" ? "text-white/75" : "text-ink-soft")}>{p.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 4. 심사 방식: 궤도 */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-20 py-20">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
            <Reveal>
              <SectionHeading
                id="how-title"
                tag="심사 방식"
                title={
                  <>
                    많이 쓴 기업이 아니라
                    <br />
                    <span className="text-primary">잘 쓰는</span> 기업을 찾아요
                  </>
                }
                description="토큰과 GPU는 비용입니다. 그래서 사용량이 아니라 컴퓨트가 매출로 바뀌는 효율을 봅니다. 점수 지표 다섯 가지와 데이터 정제 원칙 세 가지로 심사해요."
              />
              <dl className="mt-10 grid grid-cols-3 gap-3">
                {[
                  { k: "A등급 한도 계수", v: "1.0" },
                  { k: "최소 유료 데이터", v: "3개월" },
                  { k: "수수료", v: "1.8~4.5%" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl bg-surface p-4 shadow-elev-sm">
                    <dt className="text-xs font-semibold text-ink-soft">{s.k}</dt>
                    <dd className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-ink">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={120}>
              <ScoreOrbit />
            </Reveal>
          </div>
        </section>

        {/* 5. 이용 과정 */}
        <section id="process" aria-labelledby="process-title" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              id="process-title"
              tag="이용 과정"
              align="center"
              title={
                <>
                  연동부터 상환까지,
                  <br />네 단계면 충분해요
                </>
              }
            />
          </Reveal>
          <ol className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal as="li" key={s.title} delay={i * 110} className="relative">
                  <div className="flex h-full flex-col rounded-3xl bg-surface p-6 shadow-elev-sm">
                    <div className="flex items-center justify-between">
                      <span className="grid size-[60px] place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-strong text-white shadow-glow">
                        <Icon className="size-7" strokeWidth={2.2} />
                      </span>
                      <span className="num text-sm font-extrabold text-primary">STEP {String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.02em] text-ink">{s.title}</h3>
                    <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
                    <div className="mt-6 flex-1 rounded-2xl bg-surface-soft p-4 text-sm">
                      {i === 0 && (
                        <ul className="flex flex-col gap-2">
                          {["Anthropic", "NHN클라우드", "토스페이먼츠"].map((n) => (
                            <li key={n} className="flex items-center justify-between font-semibold text-ink">
                              {n}
                              <span className="flex items-center gap-1 text-xs text-positive">
                                <CheckIcon className="size-3.5" strokeWidth={3} />
                                연결됨
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {i === 1 && (
                        <div>
                          <p className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-[-0.03em] text-ink">{result.score}</span>
                            <span className="text-sm font-bold text-primary">{result.grade}등급</span>
                          </p>
                          <ScoreMeter className="mt-3" score={result.score} grade={result.grade} cutoffs={config.cutoffs} size="sm" />
                        </div>
                      )}
                      {i === 2 && (
                        <div>
                          <p className="text-xs font-semibold text-ink-soft">KT클라우드 9월 청구서</p>
                          <p className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-ink">{krw(6_800_000)}</p>
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold text-positive shadow-elev-sm">
                            <CheckIcon className="size-3.5" strokeWidth={3} /> 대신 결제 완료
                          </p>
                        </div>
                      )}
                      {i === 3 && (
                        <div>
                          <p className="text-xs font-semibold text-ink-soft">매달 매출의 {pct(plan.revenueShare)}</p>
                          <div className="mt-3 flex gap-1.5">
                            {[1, 2, 3, 4].map((n) => (
                              <div key={n} className={cn("h-10 flex-1 rounded-lg", n === 1 ? "bg-primary" : "bg-sky-strong")} />
                            ))}
                          </div>
                          <p className="mt-2 text-sm font-bold text-ink">{krw(plan.monthly)} × 4회</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </section>

        {/* 6. 큰 문구 띠 */}
        <section aria-label="TokenScore 원칙" className="my-10 overflow-hidden bg-gradient-to-br from-primary to-primary-strong py-14 text-white">
          <Marquee label="TokenScore 원칙" duration={50} showControl={false}>
            {["Compute to Credit", "토큰", "GPU", "매출", "신용"].map((w) => (
              <span
                key={w}
                className="mx-6 flex items-center gap-12 text-[clamp(3rem,2rem+5vw,6.5rem)] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.75)]"
              >
                {w}
                <span className="text-[0.4em] text-white/80 [-webkit-text-stroke:0]">✦</span>
              </span>
            ))}
          </Marquee>
          <Marquee label="TokenScore 원칙" duration={46} reverse showControl={false} className="mt-4">
            {["공급사 청구 데이터", "추론 컴퓨트 효율", "매출연동 상환", "졸업 브릿지"].map((w) => (
              <span key={w} className="mx-6 flex items-center gap-12 text-[clamp(2.5rem,1.6rem+4.5vw,5.5rem)] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap text-white/20">
                {w}
                <span className="text-[0.4em] text-white/60">✦</span>
              </span>
            ))}
          </Marquee>
          <p className="mx-auto mt-10 max-w-[1200px] px-4 text-center text-lg font-semibold text-white sm:px-6">
            {bridge
              ? `리플라이랩은 정부 GPU 지원이 끝나 다음 달 컴퓨트 비용이 ${krw(bridge.projectedNext)}로 늘어날 전망입니다. TokenScore 한도 ${krw(result.limit.amount)}로 끊김 없이 이어 갑니다.`
              : `TokenScore 한도 ${krw(result.limit.amount)}로 다음 달 청구서를 준비합니다.`}
          </p>
        </section>

        {/* 7. 역할별 화면 */}
        <section id="roles" aria-labelledby="roles-title" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              id="roles-title"
              tag="역할별 화면"
              title={
                <>
                  회사, 사용자, 관리자
                  <br />세 자리에서 직접 써 보세요
                </>
              }
              description="모든 기업과 수치는 시연용 가상 데이터예요. 비밀번호는 demo1234입니다."
              action={
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-surface px-6 font-bold">
                  <Link href="/login">이메일로 로그인</Link>
                </Button>
              }
            />
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {DEMO_ACCOUNTS.map((a, i) => {
              const s = ROLE_STYLE[a.role];
              const Icon = s.icon;
              return (
                <Reveal key={a.email} delay={i * 100}>
                  <form
                    action={demoLogin}
                    className={cn("flex h-full flex-col justify-between gap-10 rounded-3xl p-7 shadow-elev-md transition-transform duration-200 ease-(--ease-out) hover:-translate-y-1", s.card)}
                  >
                    <input type="hidden" name="email" value={a.email} />
                    <div>
                      <div className="flex items-start justify-between">
                        <span className={cn("grid size-14 place-items-center rounded-2xl", s.chip)}>
                          <Icon className="size-7" strokeWidth={2.2} />
                        </span>
                        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", s.chip)}>{a.name}</span>
                      </div>
                      <h3 className="mt-8 text-3xl font-extrabold tracking-[-0.03em]">{a.label}</h3>
                      <p className={cn("mt-3 text-sm", s.sub)}>{a.summary}</p>
                      <ul className="mt-6 flex flex-wrap gap-2">
                        {ROLE_FEATURES[a.role].map((f) => (
                          <li key={f} className={cn("rounded-full px-3 py-1.5 text-xs font-bold", s.chip)}>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className={cn(
                        "h-12 w-full rounded-full text-base font-bold",
                        a.role === "user" ? "bg-ink text-white hover:bg-ink/85" : "bg-white text-ink hover:bg-white/90",
                      )}
                    >
                      {a.label} 화면으로 들어가기 <ArrowRightIcon data-icon="inline-end" />
                    </Button>
                  </form>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* 8. 마지막 행동 */}
        <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-primary via-[#2457cc] to-navy px-6 py-16 text-center text-white shadow-elev-lg sm:px-12">
              <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full bg-white/15 blur-3xl" />
              <div aria-hidden className="absolute -bottom-32 -left-16 size-80 rounded-full bg-chart-1/40 blur-3xl" />
              <LandmarkIcon aria-hidden className="relative mx-auto size-10 text-white/80" />
              <h2 className="relative mt-5 text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] leading-tight font-extrabold tracking-[-0.03em]">
                다음 달 컴퓨트 청구서,
                <br />
                미리 준비하세요
              </h2>
              <p className="relative mx-auto mt-4 max-w-[48ch] text-white/85">
                연동 한 번이면 점수와 한도가 나옵니다. 리플라이랩처럼 정부 지원이 끝나는 달에도 서비스가 멈추지 않게 해 드려요.
              </p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-full bg-white px-7 text-base font-bold text-primary hover:bg-white/90">
                  <a href="#roles">데모로 둘러보기</a>
                </Button>
                <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-7 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                  <Link href="/login">로그인</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Brand />
            <p className="mt-3 text-lg font-bold tracking-[-0.02em] text-ink">AI가 일한 기록으로 신용을 증명합니다.</p>
            <p className="mt-1 text-sm text-ink-soft">AI 응용기업을 위한 컴퓨트 비용 선결제 금융 (핀테크 공모전 데모)</p>
          </div>
          <p className="max-w-[48ch] text-xs text-ink-soft md:text-right">
            서비스명 TokenScore는 가칭이며 실제 금융상품이 아닙니다. 화면의 모든 기업, 인물, 수치는 시연용 가상 데이터입니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
