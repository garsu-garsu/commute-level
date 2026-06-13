import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState } from "react";

interface Props {
  /** 앱인토스 콘솔에서 발급한 배너 광고그룹 ID */
  adGroupId: string;
  /** 카드형(기본) 또는 확장형 */
  variant?: "card" | "expanded";
}

/**
 * 브리핑 본문에 인라인으로 붙는 상시 배너 광고예요.
 * - WebView 전용이라 지원되지 않는 환경(브라우저 미리보기 등)에서는 아무것도 렌더링하지 않아요.
 * - 광고가 채워지지 않으면(no-fill) 빈 영역도 남기지 않아 레이아웃이 깔끔해요.
 * - 참고: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/BannerAd.html
 */
export function BannerAd({ adGroupId, variant = "card" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!TossAds.attachBanner.isSupported()) {
      setHidden(true);
      return;
    }

    const target = containerRef.current;
    if (target == null) {
      return;
    }

    let result: { destroy: () => void } | null = null;
    try {
      result = TossAds.attachBanner(adGroupId, target, {
        theme: "auto",
        variant,
        callbacks: {
          // 광고가 없으면(no-fill) 영역을 숨겨 빈 공간이 보이지 않게 해요.
          onNoFill: () => setHidden(true),
          onAdFailedToRender: () => setHidden(true),
        },
      });
    } catch (error) {
      console.error("배너 광고 표시 실패:", error);
      setHidden(true);
    }

    return () => {
      try {
        result?.destroy();
      } catch (error) {
        console.error("배너 광고 정리(cleanup) 중 에러:", error);
      }
    };
  }, [adGroupId, variant]);

  if (hidden) {
    return null;
  }

  return <div ref={containerRef} style={{ padding: "0 24px", margin: "8px 0" }} />;
}
