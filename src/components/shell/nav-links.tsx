"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, type Portal } from "./nav-config";

export function NavLinks({ portal, counts, onNavigate }: { portal: Portal; counts: Record<string, number>; onNavigate?: () => void }) {
  const pathname = usePathname();
  const root = `/${portal}`;
  return (
    <nav aria-label={`${NAV[portal].title} 메뉴`} className="flex flex-col gap-5">
      {NAV[portal].groups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {group.label && <p className="px-2.5 pb-1 text-xs font-medium text-sidebar-foreground/70">{group.label}</p>}
          {group.items.map((item) => {
            const active = item.href === root ? pathname === root : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const count = item.countKey ? counts[item.countKey] ?? 0 : 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium text-sidebar-foreground/80 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                )}
              >
                <Icon aria-hidden className={cn("size-4 shrink-0 opacity-70", active && "text-sidebar-primary opacity-100")} />
                <span className="truncate">{item.label}</span>
                {count > 0 && (
                  <span className="num ml-auto min-w-5 rounded-[5px] bg-sidebar-primary px-1.5 text-center text-[11px] leading-5 font-semibold text-sidebar-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
