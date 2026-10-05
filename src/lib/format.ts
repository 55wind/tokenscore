const nf = new Intl.NumberFormat("ko-KR");

/** 4,500만원 / 1억 2,300만원 / 5,333원 */
export function krw(value: number) {
  const n = Math.round(value);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const man = Math.round((abs % 100_000_000) / 10_000);
    return `${sign}${nf.format(eok)}억${man ? ` ${nf.format(man)}만` : ""}원`;
  }
  if (abs >= 10_000) return `${sign}${nf.format(Math.round(abs / 10_000))}만원`;
  return `${sign}${nf.format(abs)}원`;
}

/** 차트 축처럼 좁은 곳: 4,500만 / 1.2억 */
export function krwShort(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(abs >= 1_000_000_000 ? 0 : 1)}억`;
  if (abs >= 10_000) return `${sign}${nf.format(Math.round(abs / 10_000))}만`;
  return `${sign}${nf.format(Math.round(abs))}`;
}

/** 원 단위 그대로: 45,000,000원 */
export function won(value: number) {
  return `${nf.format(Math.round(value))}원`;
}

export function num(value: number, digits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

/** 0.082 → 8.2% */
export function pct(ratio: number, digits = 1) {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** 0.082 → +8.2% */
export function signedPct(ratio: number, digits = 1) {
  const v = (ratio * 100).toFixed(digits);
  return `${ratio > 0 ? "+" : ""}${v}%`;
}

/** 토큰 수(100만 단위) → 31.2억 토큰 / 4,200만 토큰 */
export function tokens(tokensM: number) {
  const t = tokensM * 1_000_000;
  if (t >= 100_000_000) return `${num(t / 100_000_000, 1)}억 토큰`;
  return `${num(Math.round(t / 10_000))}만 토큰`;
}

export function hours(h: number) {
  return `${num(Math.round(h))}시간`;
}

export function dateKo(value: Date | string | number | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

export function dateTimeKo(value: Date | string | number | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dateKo(d)} ${hh}:${mm}`;
}
