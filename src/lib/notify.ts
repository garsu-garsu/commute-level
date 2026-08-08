import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

/**
 * 알림 슬롯 — 콘솔에 등록한 알림 동의 템플릿 코드와 1:1로 짝지어요.
 * 코드를 바꾸면 콘솔의 템플릿 코드도 같이 바꿔야 알림 동의 화면이 떠요.
 */
export const NOTIFY_SLOTS = [
  { code: "commute-level-am0630", label: "오전 6시 30분" },
  { code: "commute-level-am0700", label: "오전 7시" },
  { code: "commute-level-am0730", label: "오전 7시 30분" },
  { code: "commute-level-am0800", label: "오전 8시" },
  { code: "commute-level-am0830", label: "오전 8시 30분" },
] as const;

export type NotifySlotCode = (typeof NOTIFY_SLOTS)[number]["code"];

const AGREED_KEY = "commute-level:notify-agreed";

/** 토스 앱(WebView) 밖에서는 알림 동의 화면을 열 수 없어요. */
export function isNotifySupported(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView != null
    );
  } catch {
    return false;
  }
}

/** 동의한 슬롯 — 화면 표시용이에요. 실제 발송 대상은 토스가 관리해요. */
export function agreedSlot(): string | null {
  return localStorage.getItem(AGREED_KEY);
}

/** 알림 동의 화면을 열고 결과를 돌려줘요. */
export function requestNotify(code: NotifySlotCode): Promise<string> {
  return new Promise((resolve, reject) => {
    let cleanup: unknown;
    // 반환값이 함수라는 보장이 없어요 — 토스 앱 버전에 따라 아무것도 안 돌려줍니다.
    const done = (fn: () => void) => {
      fn();
      if (typeof cleanup === "function") cleanup();
    };
    try {
      cleanup = requestNotificationAgreement({
        options: { templateCode: code },
        onEvent: (result) => {
          if (result.type !== "agreementRejected") {
            localStorage.setItem(AGREED_KEY, code);
          }
          done(() => resolve(result.type));
        },
        onError: (error) => done(() => reject(error)),
      });
    } catch (error) {
      reject(error);
    }
  });
}
