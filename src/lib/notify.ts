import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

/**
 * 아침 알림 동의 템플릿 코드.
 *
 * 앱인토스 콘솔 > 스마트 발송 > 알림 동의 템플릿에서 만든 코드를 넣어주세요.
 * 비어 있으면 알림 받기 카드 자체가 뜨지 않아, 코드 없이도 앱은 그대로 동작해요.
 * - 콘솔: https://console-apps-in-toss.toss.im
 */
const NOTIFY_TEMPLATE_CODE = "";

const DONE_KEY = "commute-level:notify-asked";

/** 토스 앱(WebView) 안인지 */
function isInTossApp(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView != null
  );
}

/** 알림 받기 카드를 보여줄 수 있는 상태인지 (토스 앱 + 템플릿 코드 있음 + 아직 안 물어봄) */
export function canAskNotify(): boolean {
  if (!isInTossApp() || NOTIFY_TEMPLATE_CODE === "") return false;
  try {
    return localStorage.getItem(DONE_KEY) == null;
  } catch {
    return false;
  }
}

/** 알림 동의 화면을 띄우고, 한 번 물어본 사실을 기록해요. (거절해도 다시 조르지 않아요) */
export function askNotify(): Promise<void> {
  try {
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    // 저장 실패해도 동의 요청은 진행해요
  }
  return new Promise((resolve) => {
    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: NOTIFY_TEMPLATE_CODE },
        onEvent: () => {
          resolve();
          cleanup();
        },
        onError: () => {
          resolve();
          cleanup();
        },
      });
    } catch {
      resolve();
    }
  });
}
