"use client";

import { useState } from "react";
import { PauseIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 끝없이 흐르는 띠. 같은 내용을 두 번 이어 붙여 -50%만큼 움직입니다.
 * 5초 넘게 움직이는 콘텐츠라 멈춤 버튼을 둡니다 (WCAG 2.2.2). 복제본은 스크린리더에서 숨깁니다.
 */
export function Marquee({
  children,
  label,
  duration = 40,
  reverse = false,
  className,
  trackClassName,
  showControl = true,
}: {
  children: React.ReactNode;
  label: string;
  duration?: number;
  reverse?: boolean;
  className?: string;
  trackClassName?: string;
  showControl?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]" aria-label={label} role="region">
        <div
          className={cn("flex w-max motion-safe:animate-[marquee-x_var(--marquee-duration)_linear_infinite]", trackClassName)}
          style={
            {
              "--marquee-duration": `${duration}s`,
              animationDirection: reverse ? "reverse" : undefined,
              animationPlayState: paused ? "paused" : "running",
            } as React.CSSProperties
          }
        >
          <div className="flex shrink-0 items-center">{children}</div>
          <div className="flex shrink-0 items-center" aria-hidden>
            {children}
          </div>
        </div>
      </div>
      {showControl && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="mx-auto mt-4 flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-elev-sm outline-none hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hidden"
        >
          {paused ? <PlayIcon aria-hidden className="size-3.5" /> : <PauseIcon aria-hidden className="size-3.5" />}
          {paused ? "다시 흐르게 하기" : "멈추고 모두 보기"}
        </button>
      )}
    </div>
  );
}
