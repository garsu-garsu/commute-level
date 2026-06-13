import { TossAds } from "@apps-in-toss/web-framework";

/**
 * 토스 광고 SDK(배너용)는 attachBanner 전에 반드시 한 번 initialize 해야 해요.
 * 앱 전체에서 1회만 초기화되도록 Promise를 캐싱해요.
 * - 참고: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/BannerAd.html
 */
let initPromise: Promise<boolean> | null = null;

export function ensureTossAdsInitialized(): Promise<boolean> {
  if (initPromise != null) {
    return initPromise;
  }

  initPromise = new Promise<boolean>((resolve) => {
    try {
      if (!TossAds.initialize.isSupported()) {
        resolve(false);
        return;
      }

      TossAds.initialize({
        callbacks: {
          onInitialized: () => resolve(true),
          onInitializationFailed: (error) => {
            console.error("TossAds 초기화 실패:", error);
            resolve(false);
          },
        },
      });
    } catch (error) {
      console.error("TossAds 초기화 예외:", error);
      resolve(false);
    }
  });

  return initPromise;
}
