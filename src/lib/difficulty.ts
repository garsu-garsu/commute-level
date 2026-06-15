/**
 * 출근 난이도 산식 — 룰 기반 가중치 테이블.
 * 모든 점수는 이 파일의 테이블만 수정해서 튜닝할 수 있게 유지한다.
 */

export interface Factor {
  key: "temp" | "rain" | "dust" | "wind" | "day";
  label: string;
  points: number;
  detail: string;
}

export interface DifficultyInput {
  /** 출근 시간대(7~9시) 평균 체감온도 */
  morningApparentTemp: number;
  /** 출근 시간대(6~9시) 최대 강수확률 (%) */
  morningPrecipProbability: number;
  /** 출근 시간대(6~9시) 최대 시간당 강수량 (mm) */
  morningPrecipitation: number;
  /** 출근 시간대에 눈 예보가 있는지 */
  snowExpected: boolean;
  /** 출근 시간대(6~9시) 최대 풍속 (m/s) */
  morningWindSpeed: number;
  pm10: number | null;
  pm25: number | null;
  /** 0(일)~6(토) */
  dayOfWeek: number;
}

export interface DifficultyResult {
  score: number;
  stars: 1 | 2 | 3 | 4 | 5;
  label: string;
  factors: Factor[];
}

// 체감온도 구간 점수: [상한(미만 아님, 이하), 점수, 설명]
const TEMP_BANDS: Array<[number, number, string]> = [
  [-15, 45, "살을 에는 추위"],
  [-10, 36, "혹한"],
  [-5, 28, "강추위"],
  [0, 20, "영하 추위"],
  [5, 13, "쌀쌀한 추위"],
  [9, 7, "쌀쌀함"],
  [16, 2, "선선함"],
  [24, 0, "쾌적"],
  [27, 8, "더움"],
  [30, 16, "무더위"],
  [33, 26, "폭염급 더위"],
  [Infinity, 38, "폭염"],
];

// 강수확률 구간 점수
const RAIN_PROB_BANDS: Array<[number, number]> = [
  [80, 22],
  [60, 16],
  [40, 10],
  [20, 4],
];

const HEAVY_RAIN_MM = 5; // 시간당 강수량 이 이상이면 가점
const HEAVY_RAIN_BONUS = 8;
const SNOW_BONUS = 12;

// 풍속 구간 점수 (m/s)
const WIND_BANDS: Array<[number, number, string]> = [
  [14, 12, "매우 강한 바람"],
  [9, 7, "강한 바람"],
  [5, 3, "다소 강한 바람"],
];

// 미세먼지 등급 (한국 환경 기준)
export type DustGrade = "good" | "normal" | "bad" | "veryBad";

export function dustGrade(pm10: number | null, pm25: number | null): DustGrade | null {
  if (pm10 == null && pm25 == null) return null;
  const grade25: DustGrade | null =
    pm25 == null ? null : pm25 > 75 ? "veryBad" : pm25 > 35 ? "bad" : pm25 > 15 ? "normal" : "good";
  const grade10: DustGrade | null =
    pm10 == null ? null : pm10 > 150 ? "veryBad" : pm10 > 80 ? "bad" : pm10 > 30 ? "normal" : "good";
  const order: DustGrade[] = ["good", "normal", "bad", "veryBad"];
  const worst = [grade25, grade10]
    .filter((g): g is DustGrade => g != null)
    .sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
  return worst ?? null;
}

const DUST_SCORES: Record<DustGrade, number> = { good: 0, normal: 0, bad: 10, veryBad: 18 };
export const DUST_LABELS: Record<DustGrade, string> = {
  good: "좋음",
  normal: "보통",
  bad: "나쁨",
  veryBad: "매우나쁨",
};

// 요일 가점: 월요일 +6, 금요일 -3
const DAY_SCORES: Record<number, [number, string]> = {
  1: [6, "월요일 보정"],
  5: [-3, "금요일 보정"],
};

// 별점 경계: score ≤ 경계 → 해당 별
const STAR_BOUNDS: Array<[number, 1 | 2 | 3 | 4 | 5]> = [
  [7, 1],
  [18, 2],
  [32, 3],
  [50, 4],
  [Infinity, 5],
];

const STAR_LABELS: Record<number, { weekday: string; weekend: string }> = {
  1: { weekday: "가뿐한 출근길이에요", weekend: "나들이 가기 최고예요" },
  2: { weekday: "무난한 출근길이에요", weekend: "나들이하기 무난해요" },
  3: { weekday: "조금 신경 쓸 게 있어요", weekend: "나가기 전에 한 번 더 확인하세요" },
  4: { weekday: "꽤 험난한 출근길이에요", weekend: "나들이는 각오가 필요해요" },
  5: { weekday: "출근 비상사태예요", weekend: "오늘은 집이 최고예요" },
};

function tempScore(temp: number): [number, string] {
  for (const [max, score, desc] of TEMP_BANDS) {
    if (temp <= max) return [score, desc];
  }
  return [0, "쾌적"];
}

export function calcDifficulty(input: DifficultyInput): DifficultyResult {
  const factors: Factor[] = [];

  const [tPoints, tDesc] = tempScore(input.morningApparentTemp);
  factors.push({
    key: "temp",
    label: "체감온도",
    points: tPoints,
    detail: `${Math.round(input.morningApparentTemp)}° · ${tDesc}`,
  });

  let rainPoints = 0;
  for (const [min, score] of RAIN_PROB_BANDS) {
    if (input.morningPrecipProbability >= min) {
      rainPoints = score;
      break;
    }
  }
  if (input.morningPrecipitation >= HEAVY_RAIN_MM) rainPoints += HEAVY_RAIN_BONUS;
  if (input.snowExpected) rainPoints += SNOW_BONUS;
  factors.push({
    key: "rain",
    label: input.snowExpected ? "눈" : "비",
    points: rainPoints,
    detail: input.snowExpected
      ? "출근길 눈 예보"
      : `강수확률 ${Math.round(input.morningPrecipProbability)}%`,
  });

  const grade = dustGrade(input.pm10, input.pm25);
  factors.push({
    key: "dust",
    label: "미세먼지",
    points: grade ? DUST_SCORES[grade] : 0,
    detail: grade ? DUST_LABELS[grade] : "정보 없음",
  });

  let windPoints = 0;
  let windDesc = "잔잔함";
  for (const [min, score, desc] of WIND_BANDS) {
    if (input.morningWindSpeed >= min) {
      windPoints = score;
      windDesc = desc;
      break;
    }
  }
  factors.push({
    key: "wind",
    label: "바람",
    points: windPoints,
    detail: `${Math.round(input.morningWindSpeed)}m/s · ${windDesc}`,
  });

  const day = DAY_SCORES[input.dayOfWeek];
  if (day) {
    factors.push({ key: "day", label: "요일", points: day[0], detail: day[1] });
  }

  const score = Math.max(
    0,
    factors.reduce((sum, f) => sum + f.points, 0),
  );

  let stars: 1 | 2 | 3 | 4 | 5 = 5;
  for (const [bound, s] of STAR_BOUNDS) {
    if (score <= bound) {
      stars = s;
      break;
    }
  }

  const isWeekend = input.dayOfWeek === 0 || input.dayOfWeek === 6;
  const label = STAR_LABELS[stars][isWeekend ? "weekend" : "weekday"];

  return { score, stars, label, factors };
}
