/**
 * 앱인토스 인앱광고 광고그룹 ID 모음 (단일 관리 지점)
 *
 * 출시 전 반드시 앱인토스 콘솔 > 인앱광고에서 발급한 실제 광고그룹 ID로 교체하세요.
 * - 콘솔: https://console-apps-in-toss.toss.im
 * - 참고: https://developers-apps-in-toss.toss.im/ads/intro.html
 *
 * 타입별로 각각 1개씩, 총 3개가 필요해요.
 */
export const AD_IDS = {
  /** 배너 광고 (브리핑 본문 인라인 상시 노출, 이미지 강조=피드형) — WebView 전용 */
  banner: "ait-ad-test-native-image-id",
  /** 전면형 광고 (지역 변경 후 복귀 시, 하루 1회) */
  interstitial: "ait-ad-test-interstitial-id",
  /** 보상형 광고 (내일 난이도 미리보기 잠금 해제) */
  rewarded: "ait-ad-test-rewarded-id",
} as const;
