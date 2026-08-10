import { eventLog } from "@apps-in-toss/web-framework";

type Primitive = string | number | boolean;
type Params = Record<string, Primitive | null | undefined>;
type LogType = "event" | "screen" | "click" | "impression";

function clean(p: Params): Record<string, Primitive> {
  const o: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(p)) if (v != null) o[k] = v;
  return o;
}

export function track(
  name: string,
  params: Params = {},
  type: LogType = "event",
): void {
  try {
    // 토스 앱 밖(브라우저 미리보기)에서는 지원되지 않아요 — 조용히 무시해요.
    void eventLog({
      log_name: name,
      log_type: type,
      params: clean(params),
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function trackScreen(name: string, params: Params = {}): void {
  track(`screen_${name}`, params, "screen");
}

// 모든 앱 공통(앱 간 비교 가능) + 앱 고유 이벤트
export const EVENT = {
  adRewarded: "ad_rewarded",
  adInterstitial: "ad_interstitial_shown",
  adBannerImpression: "ad_banner_impression",
  shareCompleted: "share_completed",
  notifyConsent: "notify_consent",
  // 앱 고유
  outfitViewed: "outfit_viewed",
  locationSet: "location_set",
  commuteTimeSet: "commute_time_set",
  tomorrowUnlocked: "tomorrow_unlocked",
} as const;
