import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState } from "react";
import { ensureTossAdsInitialized } from "../lib/tossAds";

interface Props {
  /** 앱인토스 콘솔에서 발급한 배너 광고그룹 ID */
  adGroupId: string;
  /** 카드형(좌우 패딩+라운드) 또는 확장형(전체 너비) */
  variant?: "card" | "expanded";
}

/**
 * 브리핑 본문에 인라인으로 붙는 상시 배너 광고예요.
 * - 배너는 attachBanner 전에 TossAds.initialize가 끝나야 동작해요.
 * - WebView 전용이라 지원되지 않는 환경(브라우저 미리보기 등)에서는 아무것도 렌더링하지 않아요.
 * - 광고가 채워지지 않으면(no-fill) 빈 영역을 남기지 않아요.
 * - 참고: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/BannerAd.html
 */
export function BannerAd({ adGroupId, variant = "expanded" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!TossAds.attachBanner.isSupported()) {
      console.info("[BannerAd] 미지원 환경 — 배너를 표시하지 않아요.");
      setHidden(true);
      return;
    }

    let cancelled = false;
    let result: { destroy: () => void } | null = null;

    ensureTossAdsInitialized().then((ok) => {
      if (cancelled) {
        return;
      }
      if (!ok) {
        console.warn("[BannerAd] SDK 초기화 실패 — 배너를 표시하지 않아요.");
        setHidden(true);
        return;
      }

      const target = containerRef.current;
      if (target == null) {
        return;
      }

      try {
        result = TossAds.attachBanner(adGroupId, target, {
          theme: "auto",
          variant,
          callbacks: {
            onAdRendered: (p) => console.info("[BannerAd] 렌더링 완료", p.slotId),
            onAdViewable: (p) => console.info("[BannerAd] 노출(수익 발생)", p.slotId),
            onNoFill: () => {
              console.info("[BannerAd] 광고 재고 없음(no-fill)");
              setHidden(true);
            },
            onAdFailedToRender: (p) => {
              console.error("[BannerAd] 렌더링 실패:", p.error?.message);
              setHidden(true);
            },
          },
        });
      } catch (error) {
        console.error("[BannerAd] attachBanner 예외:", error);
        setHidden(true);
      }
    });

    return () => {
      cancelled = true;
      try {
        result?.destroy();
      } catch (error) {
        console.error("[BannerAd] 정리(cleanup) 중 에러:", error);
      }
    };
  }, [adGroupId, variant]);

  if (hidden) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", padding: "0 24px", margin: "8px 0", boxSizing: "border-box" }}
    />
  );
}
