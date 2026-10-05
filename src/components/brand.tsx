import { cn } from "@/lib/utils";

/** 워드마크. 눈금 네 개는 TokenScore 미터에서 가져온 표식입니다. */
export function Brand({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 16 16" aria-hidden className="size-4 shrink-0">
        <rect x="1" y="9" width="2" height="6" rx="1" fill={tone === "light" ? "#7fd1a8" : "var(--money)"} />
        <rect x="5" y="6" width="2" height="9" rx="1" fill={tone === "light" ? "#7fd1a8" : "var(--money)"} />
        <rect x="9" y="3" width="2" height="12" rx="1" fill={tone === "light" ? "#7fd1a8" : "var(--money)"} />
        <rect x="13" y="1" width="2" height="14" rx="1" fill={tone === "light" ? "#e4ebe5" : "var(--line-strong)"} />
      </svg>
      <span className="text-[15px] font-[750] tracking-[-0.02em]">TokenScore</span>
    </span>
  );
}
