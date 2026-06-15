import { useCallback, useEffect, useState } from "react";
import { buildBriefing } from "../lib/briefing";
import type { Briefing } from "../lib/briefing";
import type { CommuteTime } from "../lib/commute";
import type { Region } from "../lib/regions";
import { fetchWeather } from "../lib/weather";

type BriefingState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; briefing: Briefing; tomorrow: Briefing };

export function useBriefing(region: Region, commute: CommuteTime) {
  const [state, setState] = useState<BriefingState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await fetchWeather(region.latitude, region.longitude);
      const now = new Date();
      const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setState({
        status: "ready",
        briefing: buildBriefing(data, now, commute),
        tomorrow: buildBriefing(data, tomorrowDate, commute),
      });
    } catch (error) {
      console.error("브리핑 로드 실패:", error);
      setState({ status: "error", message: "예보를 불러오지 못했어요" });
    }
  }, [region.latitude, region.longitude, commute]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, reload: load };
}
