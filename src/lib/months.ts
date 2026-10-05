/** YYYY-MM 문자열 기반 월 계산. 시간대 영향을 받지 않도록 Date를 쓰지 않습니다. */

export function toYm(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

export function addMonths(ym: string, n: number) {
  const { year, month } = parseYm(ym);
  const idx = year * 12 + (month - 1) + n;
  return toYm(Math.floor(idx / 12), (idx % 12) + 1);
}

/** end를 포함해 거꾸로 count개월, 오래된 달부터 정렬 */
export function monthsEnding(end: string, count: number) {
  return Array.from({ length: count }, (_, i) => addMonths(end, i - count + 1));
}

export function daysInMonth(ym: string) {
  const { year, month } = parseYm(ym);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthDiff(from: string, to: string) {
  const a = parseYm(from);
  const b = parseYm(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/** 오늘 기준 마지막으로 마감된 달 */
export function lastClosedMonth(today = new Date()) {
  return addMonths(toYm(today.getFullYear(), today.getMonth() + 1), -1);
}

export function currentMonth(today = new Date()) {
  return toYm(today.getFullYear(), today.getMonth() + 1);
}

export function monthLabel(ym: string, withYear = false) {
  const { year, month } = parseYm(ym);
  return withYear ? `${year}년 ${month}월` : `${month}월`;
}

export function shortMonthLabel(ym: string) {
  const { year, month } = parseYm(ym);
  return `${String(year).slice(2)}.${String(month).padStart(2, "0")}`;
}
