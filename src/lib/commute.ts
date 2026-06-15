export interface CommuteTime {
  /** 출근 시각 — 집을 나서는 시간 (자정 기준 분, 0~1439) */
  depart: number;
  /** 퇴근 시각 — 회사를 나서는 시간 (자정 기준 분, 0~1439) */
  leave: number;
}

/** 기본값: 출근 09:00 · 퇴근 18:00 */
export const DEFAULT_COMMUTE: CommuteTime = { depart: 9 * 60, leave: 18 * 60 };

/** 30분 단위 */
export const STEP_MINUTES = 30;
/** 출근→퇴근 자동 추천 간격 (9시간) */
const DEFAULT_WORK_MINUTES = 9 * 60;
const DAY_MINUTES = 24 * 60;

const STORAGE_KEY = "commute-level:commute-time";

const clampHour = (hour: number) => Math.max(0, Math.min(23, hour));

/** 분 단위 설정값을 시간별 예보에 맞춰 가장 가까운 정시로 변환해요. */
export function centerHour(minutes: number): number {
  return clampHour(Math.round(minutes / 60));
}

/**
 * 출근 시간 윈도우.
 * - core: 난이도·기온·옷차림 계산 기준 (출근 정시 ±1시간)
 * - wide: 우산·강수·바람 판단용 (집을 일찍 나설 수 있어 한 시간 더 이르게)
 */
export function morningWindow(c: CommuteTime): { core: [number, number]; wide: [number, number] } {
  const h = centerHour(c.depart);
  return {
    core: [h - 1, h + 1],
    wide: [h - 2, h + 1],
  };
}

/** 퇴근 시간 윈도우 (퇴근 정시 ±1시간) */
export function eveningWindow(c: CommuteTime): [number, number] {
  const h = centerHour(c.leave);
  return [h - 1, h + 1];
}

/** 퇴근 시각이 출근보다 이르면(시계상) 다음 날 퇴근으로 봐요. */
export function crossesMidnight(c: CommuteTime): boolean {
  return c.leave <= c.depart;
}

/** 출근부터 퇴근까지 실제 경과 시간(분). 자정을 넘기면 다음 날로 계산해요. */
export function workMinutes(c: CommuteTime): number {
  return (c.leave - c.depart + DAY_MINUTES) % DAY_MINUTES;
}

/** 출근 시각 기준으로 9시간 뒤를 퇴근 추천값으로 계산해요 (자정 넘으면 다음 날). */
export function suggestLeave(departMinutes: number): number {
  return (departMinutes + DEFAULT_WORK_MINUTES) % DAY_MINUTES;
}

/** 자정 기준 분 → "HH:MM" (24시간제, 0 채움) */
export function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" → 자정 기준 분 (실패 시 null) */
export function parseHM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function normalizeMinutes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value >= DAY_MINUTES) return null;
  // 30분 단위로 맞춰요.
  return Math.round(value / STEP_MINUTES) * STEP_MINUTES;
}

export function loadCommute(): CommuteTime {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COMMUTE;
    const saved = JSON.parse(raw) as Record<string, unknown>;

    // 신버전: 분 단위로 저장
    const depart = normalizeMinutes(saved.depart);
    const leave = normalizeMinutes(saved.leave);
    if (depart != null && leave != null) {
      return { depart, leave };
    }

    // 구버전: { departHour, leaveHour } (정시) 호환
    if (typeof saved.departHour === "number" && typeof saved.leaveHour === "number") {
      return {
        depart: clampHour(saved.departHour) * 60,
        leave: clampHour(saved.leaveHour) * 60,
      };
    }

    return DEFAULT_COMMUTE;
  } catch {
    return DEFAULT_COMMUTE;
  }
}

export function saveCommute(commute: CommuteTime) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commute));
  } catch {
    // 저장 실패 시 다음 진입에 기본값 사용
  }
}
