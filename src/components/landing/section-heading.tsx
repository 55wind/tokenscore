import { cn } from "@/lib/utils";

/** 구획 머리: 알약 태그 + 두 줄 굵은 제목 + 오른쪽 행동 버튼 (모바일에서는 아래로). */
export function SectionHeading({
  tag,
  title,
  description,
  action,
  align = "left",
  tone = "light",
  id,
  className,
}: {
  tag: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  id?: string;
  className?: string;
}) {
  const center = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        !center && "md:flex-row md:items-end md:justify-between",
        center && "items-center text-center",
        className,
      )}
    >
      <div className={cn("max-w-[720px]", center && "flex flex-col items-center")}>
        <span
          className={cn(
            "inline-flex h-8 items-center rounded-full border px-4 text-sm font-semibold",
            tone === "dark" ? "border-white/30 text-white" : "border-primary/40 bg-surface text-primary",
          )}
        >
          {tag}
        </span>
        <h2
          id={id}
          className={cn(
            "mt-5 text-[clamp(1.75rem,1.2rem+2.2vw,2.75rem)] leading-[1.2] font-extrabold tracking-[-0.03em]",
            tone === "dark" ? "text-white" : "text-ink",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className={cn("mt-4 max-w-[56ch] text-lg", tone === "dark" ? "text-white/75" : "text-ink-soft")}>{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
