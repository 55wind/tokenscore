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
            {/* 크게 쓰는 건 핵심 몇 단어뿐. 설명은 보통 크기 부연으로 둡니다. */}
            <h1 className="text-5xl font-medium tracking-[-0.03em] text-ink">
              컴퓨트 청구서로 매기는
              <br />
              AI 기업 신용점수
            </h1>
            <p className="mt-5 max-w-[44ch] text-lg text-ink-soft">
              LLM 토큰과 GPU 사용량을 공급사 청구 데이터로 확인해 점수와 한도를 냅니다. 한도 안에서는 다음 달 청구서를 먼저 결제해 드립니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/login">데모 계정으로 시작</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#roles">역할별 화면 보기</a>
              </Button>
            </div>
          </div>

          {/* 가장 특징적인 것: 실제 계산된 심사 결과 한 장 */}
          <figure className="rounded-xl bg-surface p-5 shadow-elev-sm sm:p-7">
            <figcaption className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-ink-soft">심사 리포트 예시</p>
                <p className="text-lg font-semibold">리플라이랩, AI 고객상담 SaaS</p>
              </div>
              <p className="shrink-0 text-right whitespace-nowrap">
                <span className="block text-6xl leading-none font-medium tracking-[-0.04em]">{result.score}</span>
                <span className="text-sm font-semibold text-primary">{result.grade}등급</span>
              </p>
            </figcaption>
            <ScoreMeter className="mt-5" score={result.score} grade={result.grade} cutoffs={config.cutoffs} />
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-ink-soft">토큰 100만 개당 매출</dt>
                <dd className="text-lg font-semibold">{krw(k.revenuePerMTokens ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">추론 GPU 1시간당 매출</dt>
                <dd className="text-lg font-semibold">{krw(k.revenuePerGpuHour ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">한도에서 뺀 학습용 GPU</dt>
                <dd className="text-lg font-semibold text-ink">{krw(lastMonth.excluded.training + lastMonth.excluded.ambiguous)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">정부 지원 GPU (지표 제외)</dt>
                <dd className="text-lg font-semibold text-ink">{krw(lastMonth.excluded.government)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-sm text-ink-soft">Compute Pay 한도</p>
                <p className="text-3xl leading-tight font-semibold tracking-[-0.03em] whitespace-nowrap text-ink">{krw(result.limit.amount)}</p>
              </div>
              <p className="text-xs text-ink-soft sm:max-w-[26ch] sm:text-right">
                평균 유료 컴퓨트 {krw(k.avgCompute3)} × 3 × 계수 {num(result.coefficient, 1)}
                {bridge && `. 정부 지원 종료 후 예상 비용 ${krw(bridge.projectedNext)}`}
              </p>
            </div>
          </figure>
        </section>

        <section aria-labelledby="flow" className="border-t border-line py-14">
          <h2 id="flow" className="text-xl font-semibold">
            서비스 흐름
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="num text-sm font-semibold text-ink-soft">{i + 1}단계</span>
                <span className="text-lg font-semibold">{step.title}</span>
                <p className="text-sm text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="roles" aria-labelledby="roles-title" className="border-t border-line py-14">
          <h2 id="roles-title" className="text-xl font-semibold">
            역할별로 들어가 보기
          </h2>
          <p className="mt-2 text-ink-soft">모든 기업과 수치는 시연용 가상 데이터입니다. 비밀번호는 demo1234입니다.</p>
          {/* 같은 무게의 카드 세 장 대신, 한 면 위의 목록으로 둡니다. */}
          <ul className="mt-6 divide-y divide-line rounded-xl bg-surface shadow-elev-sm">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <form action={demoLogin} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <input type="hidden" name="email" value={a.email} />
                  <div className="max-w-[60ch]">
                    <p className="text-lg font-semibold">{a.label}</p>
                    <p className="mt-1 text-sm text-ink-soft">{a.summary}</p>
                  </div>
                  <Button type="submit" variant={a.role === "company" ? "default" : "outline"} className="shrink-0 self-start sm:self-auto">
                    {a.name}님 계정으로 들어가기
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-xs text-ink-soft">
        TokenScore 핀테크 공모전 데모. 서비스명은 가칭이며 실제 금융상품이 아닙니다.
      </footer>
    </div>
  );
}
