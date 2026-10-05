import type { Role } from "@/lib/db/schema";

export const DEMO_PASSWORD = "demo1234";

/** 로그인 화면과 역할 전환 메뉴에 보이는 데모 계정. 비밀번호는 모두 demo1234 */
export const DEMO_ACCOUNTS: { email: string; role: Role; name: string; label: string; summary: string }[] = [
  {
    email: "ceo@replylab.ai",
    role: "company",
    name: "한지수",
    label: "회사",
    summary: "리플라이랩 대표. 데이터를 연동하고 한도를 신청하며, 구성원의 결제 요청을 승인합니다.",
  },
  {
    email: "dev@replylab.ai",
    role: "user",
    name: "서도윤",
    label: "사용자",
    summary: "리플라이랩 ML 엔지니어. AI 비용을 확인하고 GPU·LLM 청구서 결제를 요청합니다.",
  },
  {
    email: "admin@tokenscore.kr",
    role: "admin",
    name: "강민서",
    label: "관리자",
    summary: "TokenScore 여신심사역. 신청을 심사하고 선결제를 집행하며 포트폴리오 위험을 봅니다.",
  },
];

export const ROLE_LABEL: Record<Role, string> = { company: "회사", user: "사용자", admin: "관리자" };
