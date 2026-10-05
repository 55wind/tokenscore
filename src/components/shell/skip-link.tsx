/** 키보드 사용자가 메뉴를 건너뛰고 본문으로 바로 가는 링크 (WCAG 2.4.1). 포커스를 받을 때만 보입니다. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed top-3 left-3 z-50 -translate-y-16 rounded-md bg-ink px-3 py-2 text-[13px] font-semibold text-white shadow-elev-md transition-transform duration-150 focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      본문으로 건너뛰기
    </a>
  );
}
