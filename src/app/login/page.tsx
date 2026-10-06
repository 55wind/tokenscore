import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { demoLogin } from "@/app/actions/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Brand />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold">로그인</h1>
        <p className="mt-1 text-ink-soft">회사, 사용자, 관리자 계정 모두 여기서 로그인합니다.</p>

        <div className="mt-6 rounded-xl bg-surface p-5 shadow-elev-md">
          <LoginForm />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">데모 계정으로 바로 들어가기</h2>
          <p className="mt-1 text-sm text-ink-soft">비밀번호는 모두 {DEMO_PASSWORD}입니다.</p>
          <ul className="mt-3 flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-elev-sm">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <form action={demoLogin} className="flex items-center justify-between gap-3 px-4 py-3">
                  <input type="hidden" name="email" value={a.email} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {a.label} <span className="font-normal text-ink-soft">{a.name}</span>
                    </p>
                    <p className="truncate text-xs text-ink-soft">{a.email}</p>
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    들어가기
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
