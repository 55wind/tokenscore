import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { ConnectionCategory, User } from "@/lib/db/schema";
import { DomainError } from "./credit";
import { logAudit } from "./audit";

/** 연동할 수 있는 데이터 원천 목록 (기획안 4-2 ①~④) */
export const PROVIDER_CATALOG: { provider: string; category: ConnectionCategory; via: string }[] = [
  { provider: "OpenAI", category: "llm", via: "Usage·Costs API (조직 관리자 키)" },
  { provider: "Anthropic", category: "llm", via: "Admin API 사용량·비용 리포트" },
  { provider: "Upstage", category: "llm", via: "콘솔 빌링 내보내기" },
  { provider: "네이버클라우드", category: "gpu", via: "빌링 API + 서버 모니터링" },
  { provider: "KT클라우드", category: "gpu", via: "K GPUaaS 사용 내역" },
  { provider: "NHN클라우드", category: "gpu", via: "빌링 API + 인스턴스 사용 기록" },
  { provider: "엘리스클라우드", category: "gpu", via: "제휴 데이터 피드" },
  { provider: "gcube", category: "gpu", via: "제휴 데이터 피드" },
  { provider: "토스페이먼츠", category: "pg", via: "정산 내역 API" },
  { provider: "나이스페이", category: "pg", via: "정산 내역 API" },
  { provider: "기업은행", category: "bank", via: "오픈뱅킹 (상환 계좌)" },
  { provider: "신한은행", category: "bank", via: "오픈뱅킹 (상환 계좌)" },
  { provider: "국민은행", category: "bank", via: "오픈뱅킹 (상환 계좌)" },
  { provider: "하나은행", category: "bank", via: "오픈뱅킹 (상환 계좌)" },
  { provider: "우리은행", category: "bank", via: "오픈뱅킹 (상환 계좌)" },
  { provider: "카카오뱅크", category: "bank", via: "오픈뱅킹 (상환 계좌)" },
];

export const CATEGORY_LABEL: Record<ConnectionCategory, string> = {
  llm: "LLM API 빌링",
  gpu: "GPU 클라우드 사용 기록",
  pg: "PG 매출",
  bank: "계좌",
};

export async function connectProvider(user: User, provider: string) {
  if (!user.companyId) throw new DomainError("소속 회사가 없습니다.");
  const item = PROVIDER_CATALOG.find((p) => p.provider === provider);
  if (!item) throw new DomainError("지원하지 않는 공급사입니다.");
  const now = new Date();
  const account = item.category === "bank" ? `${provider.replace("은행", "")} ***-***-${String(now.getTime()).slice(-6)}` : null;
  await db
    .insert(s.connections)
    .values({
      id: crypto.randomUUID(),
      companyId: user.companyId,
      provider,
      category: item.category,
      status: "connected",
      consentAt: now,
      lastSyncAt: now,
      account,
    })
    .onConflictDoUpdate({
      target: [s.connections.companyId, s.connections.provider],
      set: { status: "connected", consentAt: now, lastSyncAt: now, ...(account ? { account } : {}) },
    });
  await logAudit(user, user.companyId, "데이터 연동", `${provider} (${CATEGORY_LABEL[item.category]}) 정보 제공 동의 및 연결`);
}

export async function syncProvider(user: User, provider: string) {
  if (!user.companyId) throw new DomainError("소속 회사가 없습니다.");
  await db
    .update(s.connections)
    .set({ lastSyncAt: new Date() })
    .where(and(eq(s.connections.companyId, user.companyId), eq(s.connections.provider, provider)));
}

export async function disconnectProvider(user: User, provider: string) {
  if (!user.companyId) throw new DomainError("소속 회사가 없습니다.");
  await db
    .update(s.connections)
    .set({ status: "disconnected" })
    .where(and(eq(s.connections.companyId, user.companyId), eq(s.connections.provider, provider)));
  await logAudit(user, user.companyId, "연동 해제", `${provider} 동의 철회`);
}
