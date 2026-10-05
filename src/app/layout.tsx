import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TokenScore", template: "%s · TokenScore" },
  description: "AI 기업의 토큰·GPU 사용 데이터로 신용을 평가하고 컴퓨트 비용을 먼저 내주는 금융 플랫폼 (공모전 데모)",
};

export const viewport: Viewport = {
  themeColor: "#f1f3ee",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
