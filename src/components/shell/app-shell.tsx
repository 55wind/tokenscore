import { LogOutIcon, RepeatIcon } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { demoLogin, logout } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import type { User } from "@/lib/db/schema";
import { NavLinks } from "./nav-links";
import { SkipLink } from "./skip-link";
import { MobileNav } from "./mobile-nav";
import { MobileTabs } from "./mobile-tabs";
import { NAV, type Portal } from "./nav-config";

function AccountFooter({ user, orgName, portal }: { user: User; orgName: string; portal: Portal }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="px-1">
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {orgName} {user.title}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <RepeatIcon data-icon="inline-start" />
              다른 역할로 보기
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            <DropdownMenuLabel>데모 계정 전환</DropdownMenuLabel>
            <DropdownMenuGroup>
              {DEMO_ACCOUNTS.map((a) => (
                <DropdownMenuItem key={a.email} asChild disabled={a.email === user.email}>
                  <form action={demoLogin} className="w-full">
                    <input type="hidden" name="email" value={a.email} />
                    <button type="submit" className="flex w-full flex-col items-start text-left">
                      <span className="font-medium">
                        {a.name} ({a.label})
                      </span>
                      <span className="text-xs text-muted-foreground">{a.email}</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logout} className="w-full">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOutIcon />
                  로그아웃
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {portal !== "admin" && (
        <p className="px-1 text-xs leading-snug text-sidebar-foreground/70">모든 기업·수치는 공모전 시연용 가상 데이터입니다.</p>
      )}
    </div>
  );
}

export function AppShell({
  portal,
  user,
  orgName,
  counts = {},
  children,
}: {
  portal: Portal;
  user: User;
  orgName: string;
  counts?: Record<string, number>;
  children: React.ReactNode;
}) {
  const footer = <AccountFooter user={user} orgName={orgName} portal={portal} />;
  return (
    <div data-portal={portal} className="min-h-dvh lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <SkipLink />
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center justify-between px-4">
          <Brand tone={portal === "admin" ? "light" : "ink"} />
          <span className="rounded-[5px] border border-sidebar-border px-2 text-xs leading-5 font-medium text-sidebar-foreground/70">
            {NAV[portal].title}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <NavLinks portal={portal} counts={counts} />
        </div>
        <div className="border-t border-sidebar-border p-3">{footer}</div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas px-4 lg:hidden">
          <Brand />
          <MobileNav portal={portal} counts={counts} footer={footer} />
        </header>
        <MobileTabs portal={portal} counts={counts} />
        <main id="main" tabIndex={-1} className="mx-auto w-full outline-none max-w-[1200px] px-4 pt-6 pb-28 lg:pb-16 sm:px-6 lg:px-10 lg:pt-9">{children}</main>
      </div>
    </div>
  );
}
