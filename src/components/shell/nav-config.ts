import {
  BanknoteArrowUpIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CalendarClockIcon,
  ChartColumnStackedIcon,
  ClipboardCheckIcon,
  GaugeIcon,
  LandmarkIcon,
  PiggyBankIcon,
  PlugIcon,
  ReceiptTextIcon,
  ScrollTextIcon,
  SendIcon,
  SirenIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

export type Portal = "company" | "user" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  countKey?: string;
}

export const NAV: Record<Portal, { title: string; groups: { label?: string; items: NavItem[] }[] }> = {
  company: {
    title: "회사",
    groups: [
      {
        items: [
          { href: "/company", label: "개요", icon: GaugeIcon },
          { href: "/company/costs", label: "AI 비용", icon: ChartColumnStackedIcon },
          { href: "/company/connections", label: "데이터 연동", icon: PlugIcon },
        ],
      },
      {
        label: "금융",
        items: [
          { href: "/company/score", label: "TokenScore 리포트", icon: WalletCardsIcon },
          { href: "/company/credit", label: "한도 신청", icon: BanknoteArrowUpIcon },
          { href: "/company/pay", label: "Compute Pay", icon: ReceiptTextIcon, countKey: "pay" },
          { href: "/company/repayments", label: "상환", icon: CalendarClockIcon },
        ],
      },
      {
        label: "더 보기",
        items: [
          { href: "/company/programs", label: "정부 지원 매칭", icon: LandmarkIcon },
          { href: "/company/members", label: "구성원", icon: UsersIcon },
        ],
      },
    ],
  },
  user: {
    title: "사용자",
    groups: [
      {
        items: [
          { href: "/user", label: "AI 비용", icon: ChartColumnStackedIcon },
          { href: "/user/savings", label: "절감 제안", icon: PiggyBankIcon },
          { href: "/user/requests", label: "결제 요청", icon: SendIcon, countKey: "requests" },
        ],
      },
    ],
  },
  admin: {
    title: "관리자",
    groups: [
      {
        items: [
          { href: "/admin", label: "포트폴리오", icon: BriefcaseBusinessIcon },
          { href: "/admin/reviews", label: "심사", icon: ClipboardCheckIcon, countKey: "reviews" },
          { href: "/admin/companies", label: "기업", icon: Building2Icon },
        ],
      },
      {
        label: "운영",
        items: [
          { href: "/admin/payments", label: "선결제 집행", icon: ReceiptTextIcon, countKey: "payments" },
          { href: "/admin/repayments", label: "상환 관리", icon: CalendarClockIcon },
          { href: "/admin/alerts", label: "조기 경보", icon: SirenIcon, countKey: "alerts" },
        ],
      },
      {
        label: "설정",
        items: [
          { href: "/admin/model", label: "심사 모델", icon: SlidersHorizontalIcon },
          { href: "/admin/audit", label: "감사 로그", icon: ScrollTextIcon },
        ],
      },
    ],
  },
};
