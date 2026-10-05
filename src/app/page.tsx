import Link from "next/link";
import { Brand } from "@/components/brand";
import { SkipLink } from "@/components/shell/skip-link";
import { ScoreMeter } from "@/components/score-meter";
import { Button } from "@/components/ui/button";
import { demoLogin } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { krw, num } from "@/lib/format";
import { getCompanyScore } from "@/lib/services/scoring";

export const dynamic = "force-dynamic";

const FLOW = [
  { title: "연동", body: "LLM 빌링, GPU 클라우드 사용 기록, PG 매출, 계좌를 동의를 받아 연결합니다." },
  { title: "평가", body: "학습용·무료 사용분을 걷어내고, 추론 컴퓨트가 매출로 바뀌는 효율로 점수를 매깁니다." },
  { title: "금융", body: "한도 안에서 LLM·GPU 청구서를 공급사에 대신 결제합니다." },
  { title: "상환", body: "매출이 들어오면 정해진 비율만큼 3~6개월에 나눠 자동으로 갚습니다." },
];

export default async function Landing() {
  const { result, bridge, config } = await getCompanyScore("replylab");
  const k = result.kpis;
  const lastMonth = result.monthly[result.monthly.length - 1];

  return (
    <div className="min-h-dvh">
      <SkipLink />
      <header className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
        <Brand />
        <Button asChild variant="outline" size="sm">
          <Link href="/login">로그인</Link>
        </Button>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-[1120px] px-4 pb-20 outline-none sm:px-6">
        <section className="grid items-center gap-10 pt-10 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-16">
          <div>
            <h1 className="text-[clamp(32px,5vw,50px)] leading-[1.15] font-[800] tracking-[-0.035em] text-ink">
              재무제표 대신,
              <br />
              AI가 일한 기록으로 심사합니다
            </h1>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-soft">
              TokenScore는 AI 기업이 쓰는 LLM 토큰과 GPU를 공급사 청구 데이터로 확인해 신용을 평가합니다. 그리고 한도 안에서 다음 달 컴퓨트 청구서를 먼저 내 드립니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/login">데모 시작하기</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#roles">역할별 화면 보기</a>
              </Button>
            </div>
          </div>

          {/* 가장 특징적인 것: 실제 계산된 심사 결과 한 장 */}
          <figure className="rounded-2xl bg-surface p-5 shadow-elev-lg sm:p-7">
            <figcaption className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] text-ink-soft">심사 리포트 예시</p>
                <p className="text-[17px] font-[700]">리플라이랩, AI 고객상담 SaaS</p>
              </div>
              <p className="shrink-0 text-right whitespace-nowrap">
                <span className="block text-[44px] leading-none font-[800] tracking-[-0.04em]">{result.score}</span>
                <span className="text-[13px] font-semibold text-money">{result.grade}등급</span>
              </p>
            </figcaption>
            <ScoreMeter className="mt-5" score={result.score} grade={result.grade} cutoffs={config.cutoffs} />
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-[13.5px]">
              <div>
                <dt className="text-ink-soft">토큰 100만 개당 매출</dt>
                <dd className="text-[19px] font-[700]">{krw(k.revenuePerMTokens ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">추론 GPU 1시간당 매출</dt>
                <dd className="text-[19px] font-[700]">{krw(k.revenuePerGpuHour ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">한도에서 뺀 학습용 GPU</dt>
                <dd className="text-[19px] font-[700] text-compute">{krw(lastMonth.excluded.training + lastMonth.excluded.ambiguous)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">정부 지원 GPU (지표 제외)</dt>
                <dd className="text-[19px] font-[700] text-compute">{krw(lastMonth.excluded.government)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-[13px] text-ink-soft">Compute Pay 한도</p>
                <p className="text-[30px] leading-tight font-[800] tracking-[-0.03em] whitespace-nowrap text-money-strong">{krw(result.limit.amount)}</p>
              </div>
              <p className="text-[12.5px] text-ink-soft sm:max-w-[26ch] sm:text-right">
                평균 유료 컴퓨트 {krw(k.avgCompute3)} × 3 × 계수 {num(result.coefficient, 1)}
                {bridge && `. 정부 지원 종료 후 예상 비용 ${krw(bridge.projectedNext)}`}
              </p>
            </div>
          </figure>
        </section>

        <section aria-labelledby="flow" className="border-t border-line py-14">
          <h2 id="flow" className="text-[22px] font-[740]">
            서비스 흐름
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="num text-[13px] font-semibold text-money">{i + 1}단계</span>
                <span className="text-[17px] font-[700]">{step.title}</span>
                <p className="text-[14px] text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="roles" aria-labelledby="roles-title" className="border-t border-line py-14">
          <h2 id="roles-title" className="text-[22px] font-[740]">
            역할별로 들어가 보기
          </h2>
          <p className="mt-2 text-ink-soft">모든 기업과 수치는 시연용 가상 데이터입니다. 비밀번호는 demo1234입니다.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {DEMO_ACCOUNTS.map((a) => (
              <form key={a.email} action={demoLogin} className="flex flex-col justify-between gap-5 rounded-xl bg-surface p-5 shadow-elev-sm">
                <input type="hidden" name="email" value={a.email} />
                <div>
                  <p className="text-[18px] font-[740]">{a.label}</p>
                  <p className="mt-1 text-[13.5px] text-ink-soft">{a.summary}</p>
                </div>
                <Button type="submit" variant={a.role === "company" ? "default" : "outline"} className="self-start">
                  {a.name}님 계정으로 들어가기
                </Button>
              </form>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-[12.5px] text-ink-soft">
        TokenScore 핀테크 공모전 데모. 서비스명은 가칭이며 실제 금융상품이 아닙니다.
      </footer>
    </div>
  );
}
