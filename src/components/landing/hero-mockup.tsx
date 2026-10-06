import { CheckIcon, CpuIcon, ReceiptTextIcon } from "lucide-react";
import { ScoreMeter } from "@/components/score-meter";
import { krw, pct } from "@/lib/format";
import { planRepayment } from "@/lib/scoring/engine";
import type { ScoreConfig, ScoreResult } from "@/lib/scoring/types";

/**
 * 히어로 오른쪽: 실제 계산된 리플라이랩 데이터로 그린 제품 화면 목업.
 * 큰 창 하나 위에 '한도 승인', '대신 결제한 청구서', '학습용 GPU 제외' 카드가 겹쳐 떠 있습니다.
 */
export function HeroMockup({
  result,
  config,
  excludedTraining,
}: {
  result: ScoreResult;
  config: ScoreConfig;
  excludedTraining: number;
}) {
  const k = result.kpis;
  // 발표 시나리오의 첫 청구서: KT클라우드 680만원을 4개월로 나눠 갚는 경우
  const bill = 6_800_000;
  const plan = planRepayment(bill, result.feeRate, k.avgRevenue3, 4);
  return (
    <div className="relative mx-auto w-full max-w-[560px] pb-20 sm:pb-16" aria-hidden>
      {/* 바탕 패널 */}
      <div className="absolute inset-x-0 top-8 bottom-8 rounded-4xl bg-gradient-to-br from-sky to-sky-strong sm:top-10 lg:-inset-x-6" />

      {/* 메인 창 */}
      <div className="relative mx-4 mt-0 rounded-2xl bg-surface p-5 shadow-elev-lg sm:mx-8 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-soft">리플라이랩 TokenScore</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-[44px] leading-none font-extrabold tracking-[-0.04em] text-ink">{result.score}</span>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">{result.grade}등급</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-ink-soft">Compute Pay 한도</p>
            <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-ink">{krw(result.limit.amount)}</p>
          </div>
        </div>
        <ScoreMeter className="mt-5" score={result.score} grade={result.grade} cutoffs={config.cutoffs} size="sm" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: "토큰 100만 개당", value: krw(k.revenuePerMTokens ?? 0) },
            { label: "GPU 1시간당", value: krw(k.revenuePerGpuHour ?? 0) },
            { label: "컴퓨트 1원당", value: `${k.computeEfficiency.toFixed(2)}원` },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-surface-soft px-3 py-2.5">
              <p className="text-[11px] font-medium text-ink-soft">{m.label} 매출</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-16 items-end gap-1.5">
          {result.monthly.map((m) => {
            const max = Math.max(...result.monthly.map((x) => x.revenue));
            return (
              <div key={m.month} className="flex flex-1 flex-col justify-end gap-0.5">
                <div className="rounded-t-sm bg-chart-4/80" style={{ height: `${(m.revenue / max) * 56}px` }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 떠 있는 카드 1: 승인 알림 */}
      <div className="absolute -top-2 right-0 w-[230px] rounded-2xl bg-surface p-4 shadow-elev-md motion-safe:animate-[float-y_6s_ease-in-out_infinite] sm:-right-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-positive text-white">
            <CheckIcon className="size-5" strokeWidth={3} />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">한도 승인 완료</p>
            <p className="text-xs text-ink-soft">
              {krw(result.limit.amount)}, 수수료 {pct(result.feeRate)}
            </p>
          </div>
        </div>
      </div>

      {/* 떠 있는 카드 2: 대신 결제한 청구서 */}
      <div className="absolute bottom-0 left-0 w-[250px] rounded-2xl bg-navy p-4 text-white shadow-elev-lg motion-safe:animate-[float-y_7s_ease-in-out_infinite_1s] sm:-left-4 lg:-left-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
          <ReceiptTextIcon className="size-4" /> KT클라우드 9월 청구서
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-[-0.02em]">{krw(bill)}</p>
        <p className="mt-1 text-xs text-white/70">
          TokenScore가 대신 결제했어요. 매달 {krw(plan.monthly)}씩 상환
        </p>
      </div>

      {/* 떠 있는 칩: 심사 제외 */}
      <div className="absolute top-[44%] -right-1 hidden items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs font-bold text-ink shadow-elev-md sm:flex lg:-right-8">
        <CpuIcon className="size-4 text-chart-3" />
        학습용 GPU {krw(excludedTraining)} 제외
      </div>
    </div>
  );
}
