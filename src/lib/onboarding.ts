const KEY = "commute-level:onboarded";

/** 코치마크 투어를 마쳤는지. 저장 자체가 막힌 환경(프라이빗 모드 등)에서는 매번 뜨는 걸 막기 위해
 * 읽기 실패를 "이미 봤음"으로 처리해요. */
export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) != null;
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* noop */
  }
}
