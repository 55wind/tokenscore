import { cn } from "@/lib/utils";

/**
 * 숫자 줄: 카드를 여러 개 늘어놓는 대신 세로 구분선으로 나눈 한 줄.
 * 첫 칸이 가장 중요한 숫자입니다.
 */
export function StatRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl bg-surface px-5 py-4 shadow-elev-sm sm:flex sm:flex-wrap sm:gap-0 sm:divide-x sm:divide-line sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "ink",
  lead = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "ink" | "money" | "compute" | "risk";
  lead?: boolean;
}) {
  return (
    <div className={cn("min-w-0 sm:flex-1 sm:px-5", lead && "col-span-2 sm:flex-[1.4]")}>
      <p className="text-[12.5px] font-medium text-ink-soft">{label}</p>
      <p
        className={cn(
          "mt-1 font-[720] tracking-[-0.02em] text-ink",
          lead ? "text-[28px] leading-tight" : "text-[20px] leading-snug",
          tone === "money" && "text-money-strong",
          tone === "compute" && "text-compute",
          tone === "risk" && "text-risk",
        )}
      >
        {value}
      </p>
      {sub && <div className="mt-0.5 text-[12.5px] text-ink-soft">{sub}</div>}
    </div>
  );
}

/** 한도 사용률 같은 단일 비율 미터. 바탕은 같은 색의 옅은 단계입니다. */
export function UsageMeter({
  value,
  max,
  tone = "money",
  label,
  className,
}: {
  value: number;
  max: number;
  tone?: "money" | "compute" | "risk";
  label: string;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const fill = tone === "money" ? "bg-money" : tone === "compute" ? "bg-compute-fill" : "bg-risk";
  const track = tone === "money" ? "bg-money-soft" : tone === "compute" ? "bg-compute-soft" : "bg-risk-soft";
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2 w-full overflow-hidden rounded-full", track, className)}
    >
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

/** 표 안 숫자 셀 */
export function Num({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("num whitespace-nowrap", className)}>{children}</span>;
}

/** 이전 기간 대비 변화. up이 좋은 지표인지에 따라 색이 바뀝니다. */
export function Delta({ ratio, goodWhenUp, className }: { ratio: number; goodWhenUp: boolean; className?: string }) {
  if (!Number.isFinite(ratio)) return null;
  const up = ratio > 0.0005;
  const down = ratio < -0.0005;
  const good = (up && goodWhenUp) || (down && !goodWhenUp);
  const bad = (up && !goodWhenUp) || (down && goodWhenUp);
  return (
    <span className={cn("num text-[12.5px] font-medium", good && "text-money", bad && "text-risk", !up && !down && "text-ink-soft", className)}>
      {up ? "▲" : down ? "▼" : "–"} {Math.abs(ratio * 100).toFixed(1)}%
    </span>
  );
}
