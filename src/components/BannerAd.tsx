import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState } from "react";
import { ensureTossAdsInitialized } from "../lib/tossAds";

interface Props {
  /** 앱인토스 콘솔에서 발급한 배너 광고그룹 ID */
  adGroupId: string;
  /** 카드형(좌우 패딩+라운드) 또는 확장형(전체 너비) */
  variant?: "card" | "expanded";
  /** 자리 높이(px). 이미지 강조형은 문구형보다 커서 200 을 넣어요. 높이 0 이면 광고가 안 붙어요. */
  height?: number;
}

/**
 * 한 번 붙은 배너는 같은 광고를 계속 물고 있어요. 주기마다 떼었다 다시 붙여
 * 새 광고를 받아옵니다.
 *
 * 30초인 이유: 토스 배너는 AdMob 기반인데 AdMob 은 30초보다 잦은 갱신을
 * 무효 트래픽으로 봐요. 더 짧게 잡으면 수익보다 제재 위험이 커져요.
 */
const REFRESH_MS = 30_000;

/**
 * 화면 하단에 고정으로 붙는 상시 배너 광고예요.
 * - 배너는 attachBanner 전에 TossAds.initialize가 끝나야 동작해요.
 * - WebView 전용이라 지원되지 않는 환경(브라우저 미리보기 등)에서는 아무것도 렌더링하지 않아요.
 * - 광고가 채워지지 않으면(no-fill) 빈 영역을 남기지 않아요.
 * - 참고: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/BannerAd.html
 */
export function BannerAd({ adGroupId, variant = "expanded", height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  // 이 값이 바뀔 때마다 아래 effect 가 다시 돌면서 배너를 새로 붙여요.
  const [round, setRound] = useState(0);

  useEffect(() => {
    // isSupported 는 토스 밖에서 예외를 던져요. 감싸지 않으면 브리핑 화면이
    // 통째로 하얗게 죽어요 (에러 경계가 없어서 광고 하나가 페이지를 내려요).
    let supported = false;
    try {
      supported = TossAds.attachBanner.isSupported();
    } catch {
      supported = false;
    }
    if (!supported) {
      console.info("[BannerAd] 미지원 환경 — 배너를 표시하지 않아요.");
      setHidden(true);
      return;
    }

    // 지난 회차가 no-fill 이었어도 이번 회차는 다시 보여줄 수 있게 접힘을 풀어요.
    setHidden(false);

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
  }, [adGroupId, variant, round]);

  // 화면을 보고 있을 때만 갱신해요. 안 보이는 동안 돌리면 노출로 잡히지 않고
  // 호출만 쌓여요.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer != null) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = setInterval(() => setRound((n) => n + 1), REFRESH_MS);
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // no-fill 이어도 컨테이너는 남겨둬요. 아예 지워버리면 다음 갱신 때 붙일 자리가
  // 없어져서 배너가 영영 돌아오지 않아요.
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        margin: "0 0 8px",
        boxSizing: "border-box",
        height: hidden ? 0 : height,
        overflow: "hidden",
      }}
    />
  );
}
