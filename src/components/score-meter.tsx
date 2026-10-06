import type { Grade, ScoreConfig } from "@/lib/scoring/types";
import { cn } from "@/lib/utils";

/**
 * TokenScore 미터: 큰 미터는 10점 단위 눈금 100개, 작은 미터는 20점 단위 50개.
 * 칸이 좁아도 눈금이 사라지지 않게 작은 화면에서는 간격을 1px로 줄입니다.
 * 토큰처럼 한 칸씩 쌓이는 계량기 모양으로 점수를 보여 주고, 등급 경계는 긴 눈금으로 표시합니다.
 * 페이지에 들어올 때 한 번만 왼쪽에서 오른쪽으로 차오릅니다.
 */
export function ScoreMeter({
  score,
  grade,
  cutoffs,
  size = "lg",
  muted = false,
  className,
}: {
  score: number;
  grade: Grade;
  cutoffs: ScoreConfig["cutoffs"];
  size?: "lg" | "sm";
  muted?: boolean;
  className?: string;
}) {
  const ticks = size === "lg" ? 100 : 50;
  const step = 1000 / ticks;
  const filled = Math.round(score / step);
  const boundaries = new Map<number, Grade>([
    [Math.round(cutoffs.D / step), "D"],
    [Math.round(cutoffs.C / step), "C"],
    [Math.round(cutoffs.B / step), "B"],
    [Math.round(cutoffs.A / step), "A"],
  ]);
  const gap = size === "lg" ? "gap-px sm:gap-[2px]" : "gap-px";
  const tone = muted ? "bg-ink-soft/50" : grade === "A" || grade === "B" ? "bg-primary" : grade === "C" ? "bg-caution" : "bg-risk";
  const h = size === "lg" ? "h-9" : "h-5";

  return (
    <div className={cn("w-full", className)}>
      <div
        role="meter"
        aria-label="TokenScore"
        aria-valuemin={0}
        aria-valuemax={1000}
        aria-valuenow={score}
        aria-valuetext={`${score}점, ${grade}등급`}
        className="relative"
      >
        {/* 바탕 눈금 */}
        <div className={cn("flex items-end", gap, h)}>
          {Array.from({ length: ticks }, (_, i) => (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-[1px] bg-line",
                boundaries.has(i) ? "h-full bg-line-strong" : size === "lg" ? "h-[70%]" : "h-[75%]",
              )}
            />
          ))}
        </div>
        {/* 채워진 눈금: 같은 모양을 겹치고 clip-path로 드러냅니다 */}
        <div
          aria-hidden
          className={cn("absolute inset-0 flex items-end motion-safe:animate-[meter-fill_900ms_var(--ease-out)_both]", gap, h)}
          style={{ clipPath: `inset(0 ${((ticks - filled) / ticks) * 100}% 0 0)` }}
        >
          {Array.from({ length: ticks }, (_, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-[1px]", tone, boundaries.has(i) ? "h-full" : size === "lg" ? "h-[70%]" : "h-[75%]")}
            />
          ))}
        </div>
      </div>
      {size === "lg" && (
        <div className="relative mt-2 h-4 text-xs font-medium text-ink-soft">
          <span className="absolute left-0">0</span>
          {[...boundaries.entries()].map(([pos, g]) => (
            <span key={g} className="num absolute -translate-x-1/2" style={{ left: `${(pos / ticks) * 100}%` }}>
              {g}
              <span className="hidden sm:inline"> {pos * step}</span>
            </span>
          ))}
          <span className="absolute right-0">1000</span>
        </div>
      )}
    </div>
  );
}

export function GradeMark({ grade, className }: { grade: string; className?: string }) {
  const tone =
    grade === "A" || grade === "B"
      ? "border-primary text-primary"
      : grade === "C"
        ? "border-caution text-caution"
        : grade === "-"
          ? "border-line-strong text-ink-soft"
          : "border-risk text-risk";
  return (
    <span
      className={cn(
        "inline-grid size-7 shrink-0 place-items-center rounded-[5px] border-[1.5px] text-sm font-semibold leading-none",
        tone,
        className,
      )}
    >
      <span aria-hidden>{grade}</span>
      <span className="sr-only">{grade === "-" ? "등급 없음" : `${grade}등급`}</span>
    </span>
  );
}
