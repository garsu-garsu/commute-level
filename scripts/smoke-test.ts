// 브리핑 파이프라인 스모크 테스트: node 환경에서 실제 API → 계산까지 검증
import { buildBriefing, buildShareMessage } from "../src/lib/briefing";
import { fetchWeather } from "../src/lib/weather";

const data = await fetchWeather(37.5665, 126.978);
const briefing = buildBriefing(data, new Date());

console.log("stars:", briefing.difficulty.stars, "| score:", briefing.difficulty.score);
console.log("label:", briefing.difficulty.label);
console.log("headline:", briefing.headline);
console.log("comparison:", briefing.comparison);
console.log("evening:", briefing.evening);
console.log("outfit:", briefing.outfit.name, "-", briefing.outfit.items);
console.log("flags:", JSON.stringify(briefing.flags), "| dust:", briefing.dustLabel);
console.log("factors:", briefing.difficulty.factors.map((f) => `${f.label} ${f.points} (${f.detail})`).join(" / "));
console.log("todayHours:", briefing.todayHours.length, briefing.todayHours[0]?.time, "~", briefing.todayHours.at(-1)?.time);
console.log("--- share ---");
console.log(buildShareMessage("서울", briefing));
