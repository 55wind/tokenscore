/** 서버 액션 결과. 입력값 오류이면 field에 문제가 된 입력 이름을 담아 폼이 그 필드 옆에 오류를 보여 줍니다. */
export type ActionResult = { ok: boolean; message: string; field?: string } | null;
