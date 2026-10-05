import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-[720] text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-[68ch] text-[14.5px] text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 카드 없이 쓰는 구획 제목. 카드 안 제목은 CardTitle을 씁니다. */
export function SectionTitle({ children, aside, className }: { children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-[16px] font-[680] text-ink">{children}</h2>
      {aside && <div className="text-[13px] text-ink-soft">{aside}</div>}
    </div>
  );
}
