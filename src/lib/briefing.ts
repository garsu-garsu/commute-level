import { calcDifficulty, dustGrade, DUST_LABELS } from "./difficulty";
import type { DifficultyResult } from "./difficulty";
import { pickOutfit } from "./outfit";
import type { Outfit, Flags } from "./outfit";
import { isSnowCode } from "./weather";
import type { HourlyWeather, WeatherData } from "./weather";

export interface Briefing {
  date: Date;
  isWeekend: boolean;
  difficulty: DifficultyResult;
  outfit: Outfit;
  flags: Flags;
  /** 푸시/카드 첫 줄용 한 줄 요약 (예: "우산 필수, 어제보다 5도 낮아요") */
  headline: string;
  /** 어제 대비 비교 문구 */
  comparison: string;
  /** 퇴근길(주말엔 귀가길) 한 줄 예보 */
  evening: string;
  /** 오늘 6시~23시 시간별 데이터 */
  todayHours: HourlyWeather[];
  /** 현재(또는 출근 시간대) 기온/체감 표시용 */
  morningTemp: number;
  morningApparentTemp: number;
  dustLabel: string | null;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hoursOf(hourly: HourlyWeather[], key: string, from: number, to: number): HourlyWeather[] {
  return hourly.filter((h) => {
    if (!h.time.startsWith(key)) return false;
    const hour = Number(h.time.slice(11, 13));
    return hour >= from && hour <= to;
  });
}

const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / Math.max(1, nums.length);
const max = (nums: number[]) => (nums.length > 0 ? Math.max(...nums) : 0);

export function buildBriefing(data: WeatherData, now: Date): Briefing {
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const morning = hoursOf(data.hourly, today, 6, 9);
  const morningCore = hoursOf(data.hourly, today, 7, 9);
  const yesterdayMorning = hoursOf(data.hourly, yesterday, 7, 9);
  const evening = hoursOf(data.hourly, today, 18, 20);
  const todayHours = hoursOf(data.hourly, today, 6, 23);

  const morningApparentTemp = avg(morningCore.map((h) => h.apparentTemperature));
  const morningTemp = avg(morningCore.map((h) => h.temperature));
  const yesterdayApparentTemp = avg(yesterdayMorning.map((h) => h.apparentTemperature));

  const morningPrecipProbability = max(morning.map((h) => h.precipitationProbability));
  const morningPrecipitation = max(morning.map((h) => h.precipitation));
  const snowExpected = morning.some((h) => isSnowCode(h.weatherCode) && h.precipitationProbability >= 30);
  const morningWindSpeed = max(morning.map((h) => h.windSpeed));

  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const difficulty = calcDifficulty({
    morningApparentTemp,
    morningPrecipProbability,
    morningPrecipitation,
    snowExpected,
    morningWindSpeed,
    pm10: data.air.pm10,
    pm25: data.air.pm25,
    dayOfWeek,
  });

  const grade = dustGrade(data.air.pm10, data.air.pm25);
  // 우산은 아침뿐 아니라 퇴근길 비 예보에도 필요 (집을 나설 때 챙겨야 하므로)
  const eveningRainExpected = max(evening.map((h) => h.precipitationProbability)) >= 60;
  const flags: Flags = {
    umbrella:
      snowExpected || morningPrecipProbability >= 40 || morningPrecipitation > 0 || eveningRainExpected,
    mask: grade === "bad" || grade === "veryBad",
  };

  const outfit = pickOutfit(morningApparentTemp);

  // ── 어제 대비 비교 문구 ──
  const diff = Math.round(morningApparentTemp - yesterdayApparentTemp);
  const yesterdayRain = max(yesterdayMorning.map((h) => h.precipitationProbability)) >= 50;
  const todayRain = morningPrecipProbability >= 50;

  let comparison: string;
  if (yesterdayMorning.length === 0) {
    comparison = "어제 데이터가 없어 오늘 예보만 알려드려요.";
  } else if (Math.abs(diff) >= 3) {
    comparison =
      diff < 0
        ? `어제 아침보다 ${-diff}도 낮아요. 한 겹 더 챙기세요.`
        : `어제 아침보다 ${diff}도 높아요. 한 겹 덜어내도 돼요.`;
  } else if (todayRain && !yesterdayRain) {
    comparison = "어제는 멀쩡했는데 오늘은 비 소식이 있어요.";
  } else if (!todayRain && yesterdayRain) {
    comparison = eveningRainExpected
      ? "아침 비는 그쳤지만 저녁에 다시 와요. 우산은 챙기세요."
      : "어제 내리던 비는 그쳐요. 우산은 두고 가도 돼요.";
  } else {
    comparison = "어제 아침과 비슷해요. 어제 입은 대로면 충분해요.";
  }

  // ── 한 줄 요약 (푸시/공유 카드 첫 줄) ──
  const parts: string[] = [];
  if (snowExpected) parts.push("눈 소식, 일찍 나서세요");
  else if (flags.umbrella) parts.push("우산 필수");
  if (Math.abs(diff) >= 3 && yesterdayMorning.length > 0) {
    parts.push(diff < 0 ? `어제보다 ${-diff}도 낮아요` : `어제보다 ${diff}도 높아요`);
  }
  if (flags.mask && grade) parts.push(`미세먼지 ${DUST_LABELS[grade]}`);
  if (parts.length === 0) {
    parts.push(
      morningApparentTemp >= 28
        ? "아침부터 더워요, 시원하게 입으세요"
        : morningApparentTemp <= 5
          ? "쌀쌀해요, 따뜻하게 입으세요"
          : "큰 변수 없는 아침이에요",
    );
  }
  const headline = parts.slice(0, 2).join(", ");

  // ── 퇴근길 한 줄 ──
  const eveningRainProb = max(evening.map((h) => h.precipitationProbability));
  const eveningApparent = avg(evening.map((h) => h.apparentTemperature));
  const eveningWord = isWeekend ? "귀가길" : "퇴근길";
  let eveningText: string;
  if (evening.length === 0) {
    eveningText = `${eveningWord} 예보는 아직 준비 중이에요.`;
  } else if (evening.some((h) => isSnowCode(h.weatherCode) && h.precipitationProbability >= 30)) {
    eveningText = `${eveningWord}에 눈이 올 수 있어요. 귀가 시간을 여유 있게 잡으세요.`;
  } else if (eveningRainProb >= 60) {
    eveningText = `${eveningWord} 강수확률 ${Math.round(eveningRainProb)}%. 아침에 우산 챙겨야 저녁이 편해요.`;
  } else if (eveningRainProb >= 30) {
    eveningText = `${eveningWord} 강수확률 ${Math.round(eveningRainProb)}%. 접이식 우산 정도면 충분해요.`;
  } else if (Math.round(eveningApparent - morningApparentTemp) <= -4) {
    eveningText = `${eveningWord}엔 체감 ${Math.round(eveningApparent)}°까지 떨어져요. 겉옷 챙기세요.`;
  } else if (Math.round(eveningApparent - morningApparentTemp) >= 6) {
    eveningText = `${eveningWord}엔 체감 ${Math.round(eveningApparent)}°까지 올라요. 벗기 편한 옷이 좋아요.`;
  } else {
    eveningText = `${eveningWord}은 무난해요. 체감 ${Math.round(eveningApparent)}° 정도예요.`;
  }

  return {
    date: now,
    isWeekend,
    difficulty,
    outfit,
    flags,
    headline,
    comparison,
    evening: eveningText,
    todayHours,
    morningTemp,
    morningApparentTemp,
    dustLabel: grade ? DUST_LABELS[grade] : null,
  };
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAY_NAMES[d.getDay()]}요일`;
}

export function buildShareMessage(regionName: string, briefing: Briefing): string {
  const stars = "★".repeat(briefing.difficulty.stars) + "☆".repeat(5 - briefing.difficulty.stars);
  const title = briefing.isWeekend ? "나들이 난이도" : "출근 난이도";
  return [
    `${formatDate(briefing.date)} ${regionName} ${title} ${stars}`,
    briefing.headline,
    `오늘의 옷차림: ${briefing.outfit.items}`,
  ].join("\n");
}
