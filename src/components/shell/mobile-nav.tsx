"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "@/components/brand";
import { NavLinks } from "./nav-links";
import { NAV, type Portal } from "./nav-config";

export function MobileNav({ portal, counts, footer }: { portal: Portal; counts: Record<string, number>; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="메뉴 열기">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" data-portal={portal} className="w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-sidebar-border px-4 py-4">
          <SheetTitle className="text-sidebar-foreground">
            <Brand tone={portal === "admin" ? "light" : "ink"} />
          </SheetTitle>
          <SheetDescription className="text-sidebar-foreground/70">{NAV[portal].title} 화면</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks portal={portal} counts={counts} onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-sidebar-border p-3">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}
