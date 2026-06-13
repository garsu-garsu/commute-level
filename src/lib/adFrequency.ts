/**
 * 광고 노출 빈도 제한 (하루 1회 등)
 * 사용자 거부감을 줄이기 위해 전면형 광고처럼 자주 띄우면 안 되는 광고에 사용해요.
 */

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function storageKey(adKey: string): string {
  return `ad-shown:${adKey}`;
}

/** 오늘 이 광고를 아직 노출하지 않았으면 true */
export function canShowToday(adKey: string): boolean {
  try {
    return localStorage.getItem(storageKey(adKey)) !== todayKey();
  } catch {
    // localStorage 접근 불가 환경에서는 노출을 막아 안전하게 처리
    return false;
  }
}

/** 오늘 노출했음을 기록 */
export function markShownToday(adKey: string): void {
  try {
    localStorage.setItem(storageKey(adKey), todayKey());
  } catch {
    // 무시
  }
}
