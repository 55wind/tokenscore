import { cn } from "@/lib/utils";

/** 워드마크. 그림 표식 없이 글자만 씁니다. */
export function Brand({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span className={cn("text-lg font-semibold tracking-[-0.02em]", tone === "light" ? "text-white" : "text-ink", className)}>
      TokenScore
    </span>
  );
}
