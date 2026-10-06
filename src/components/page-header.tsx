import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  tag,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** 제목 위 알약 태그 (선택). 제목을 되풀이하지 말고 맥락을 더할 때만 씁니다. */
  tag?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {tag && (
          <span className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/40 bg-surface px-3 text-xs font-bold text-primary">
            {tag}
          </span>
        )}
        <h1 className="text-[clamp(1.625rem,1.2rem+1.4vw,2.25rem)] leading-tight font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-[68ch] text-sm text-ink-soft sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 카드 없이 쓰는 구획 제목. 카드 안 제목은 CardTitle을 씁니다. */
export function SectionTitle({ children, aside, className }: { children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">{children}</h2>
      {aside && <div className="text-sm text-ink-soft">{aside}</div>}
    </div>
  );
}
