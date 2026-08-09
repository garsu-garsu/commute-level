import { useState } from "react";
import "./App.css";
import { useInAppAds } from "./hooks/useInAppAds";
import { canShowToday, markShownToday } from "./lib/adFrequency";
import { AD_IDS } from "./lib/ads";
import { loadCommute, saveCommute } from "./lib/commute";
import type { CommuteTime } from "./lib/commute";
import { DEFAULT_REGION, loadRegion, saveRegion } from "./lib/regions";
import type { Region } from "./lib/regions";
import { BriefingPage } from "./pages/BriefingPage";
import { RegionSelectPage } from "./pages/RegionSelectPage";

function App() {
  const [region, setRegion] = useState<Region | null>(() => loadRegion());
  const [commute, setCommute] = useState<CommuteTime>(() => loadCommute());
  const [selecting, setSelecting] = useState(false);

  const handleChangeCommute = (next: CommuteTime) => {
    saveCommute(next);
    setCommute(next);
  };

  // 전면형 광고는 App 최상위에서 미리 로드해, 지역 선택 화면을 거쳐도 로드 상태가 유지되게 해요.
  const interstitial = useInAppAds(AD_IDS.interstitial);

  const handleSelect = (selected: Region) => {
    // 첫 지역 선택이 아니라, 기존 사용자가 지역을 '변경'한 경우에만 전면형 광고 노출 대상이에요.
    const isRegionChange = region != null;

    saveRegion(selected);
    setRegion(selected);
    setSelecting(false);

    // 자연스러운 전환점 + 하루 1회 제한으로 거부감을 최소화해요.
    if (isRegionChange && canShowToday("interstitial")) {
      markShownToday("interstitial");
      interstitial.showAd();
    }
  };

  if (selecting) {
    // 아직 지역을 고른 적 없는 사람이 직접 열었을 때만 위치를 먼저 물어봐요.
    return <RegionSelectPage onSelect={handleSelect} autoLocate={region == null} />;
  }

  // 지역을 고르기 전에도 서울 기준으로 오늘 출근 난이도를 바로 보여줘요. 설정은 뒤로 미뤄요.
  return (
    <BriefingPage
      region={region ?? DEFAULT_REGION}
      isDefaultRegion={region == null}
      commute={commute}
      onChangeRegion={() => setSelecting(true)}
      onChangeCommute={handleChangeCommute}
    />
  );
}

export default App;
