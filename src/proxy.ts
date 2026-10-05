import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession, homeFor } from "@/lib/auth/session";

const PORTALS = { "/admin": "admin", "/company": "company", "/user": "user" } as const;

/**
 * 낙관적 접근 제어: 쿠키만 보고 빠르게 돌려보냅니다.
 * 실제 권한 확인은 각 페이지와 서버 액션의 requireUser()가 다시 합니다.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  const portal = (Object.keys(PORTALS) as (keyof typeof PORTALS)[]).find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!portal) return NextResponse.next();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  if (PORTALS[portal] !== session.role) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/company/:path*", "/user/:path*", "/login"],
};
