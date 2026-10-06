"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, NAV, type Portal } from "./nav-config";

/** 휴대폰 하단 탭바. 엄지가 닿는 곳에 자주 쓰는 화면을 둡니다. lg 이상에서는 사이드바가 대신합니다. */
export function MobileTabs({ portal, counts }: { portal: Portal; counts: Record<string, number> }) {
  const pathname = usePathname();
  const root = `/${portal}`;
  const items = NAV[portal].groups.flatMap((g) => g.items).filter((i) => MOBILE_TABS[portal].includes(i.href));
  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      data-portal-tabs={portal}
    >
      <ul className="mx-auto grid max-w-[560px]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = item.href === root ? pathname === root : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = item.countKey ? counts[item.countKey] ?? 0 : 0;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active ? "text-primary" : "text-ink-soft",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors duration-150", active && "bg-primary-soft")}>
                  <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="truncate px-1">{item.label}</span>
                {count > 0 && (
                  <span className="num absolute top-2 left-1/2 ml-3 min-w-5 rounded-full bg-primary px-1.5 text-center text-[10px] leading-5 text-white">
                    {count}
                    <span className="sr-only">건</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
