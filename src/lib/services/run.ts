import "server-only";
import type { ActionResult } from "@/lib/action-result";
import { DomainError } from "./credit";

/** 서버 액션 공통 처리: 업무 규칙 오류는 사용자에게 그대로 보여 주고, 나머지는 숨깁니다. */
export async function run(fn: () => Promise<void>, success: string): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true, message: success };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
