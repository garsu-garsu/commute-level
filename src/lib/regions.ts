export interface Region {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const REGIONS: Region[] = [
  { id: "seoul", name: "서울", latitude: 37.5665, longitude: 126.978 },
  { id: "busan", name: "부산", latitude: 35.1796, longitude: 129.0756 },
  { id: "incheon", name: "인천", latitude: 37.4563, longitude: 126.7052 },
  { id: "daegu", name: "대구", latitude: 35.8714, longitude: 128.6014 },
  { id: "daejeon", name: "대전", latitude: 36.3504, longitude: 127.3845 },
  { id: "gwangju", name: "광주", latitude: 35.1595, longitude: 126.8526 },
  { id: "ulsan", name: "울산", latitude: 35.5384, longitude: 129.3114 },
  { id: "sejong", name: "세종", latitude: 36.48, longitude: 127.289 },
  { id: "suwon", name: "수원", latitude: 37.2636, longitude: 127.0286 },
  { id: "seongnam", name: "성남", latitude: 37.42, longitude: 127.1267 },
  { id: "goyang", name: "고양", latitude: 37.6584, longitude: 126.832 },
  { id: "yongin", name: "용인", latitude: 37.2411, longitude: 127.1776 },
  { id: "anyang", name: "안양", latitude: 37.3943, longitude: 126.9568 },
  { id: "ansan", name: "안산", latitude: 37.3219, longitude: 126.8309 },
  { id: "bucheon", name: "부천", latitude: 37.5035, longitude: 126.766 },
  { id: "hwaseong", name: "화성", latitude: 37.1996, longitude: 126.8314 },
  { id: "namyangju", name: "남양주", latitude: 37.636, longitude: 127.2165 },
  { id: "pyeongtaek", name: "평택", latitude: 36.9921, longitude: 127.1128 },
  { id: "uijeongbu", name: "의정부", latitude: 37.7381, longitude: 127.0337 },
  { id: "gimpo", name: "김포", latitude: 37.6152, longitude: 126.7156 },
  { id: "gwangmyeong", name: "광명", latitude: 37.4786, longitude: 126.8644 },
  { id: "paju", name: "파주", latitude: 37.76, longitude: 126.78 },
  { id: "cheongju", name: "청주", latitude: 36.6424, longitude: 127.489 },
  { id: "cheonan", name: "천안", latitude: 36.8151, longitude: 127.1139 },
  { id: "jeonju", name: "전주", latitude: 35.8242, longitude: 127.148 },
  { id: "chuncheon", name: "춘천", latitude: 37.8813, longitude: 127.7298 },
  { id: "wonju", name: "원주", latitude: 37.3422, longitude: 127.9202 },
  { id: "gangneung", name: "강릉", latitude: 37.7519, longitude: 128.8761 },
  { id: "pohang", name: "포항", latitude: 36.019, longitude: 129.3435 },
  { id: "changwon", name: "창원", latitude: 35.2281, longitude: 128.6811 },
  { id: "jeju", name: "제주", latitude: 33.4996, longitude: 126.5312 },
];

/** 아직 지역을 고르지 않은 사람에게 먼저 보여줄 기본 지역 (서울) */
export const DEFAULT_REGION: Region = REGIONS[0];

const STORAGE_KEY = "commute-level:region";

export function findNearestRegion(latitude: number, longitude: number): Region {
  let nearest = REGIONS[0];
  let minDist = Infinity;
  for (const region of REGIONS) {
    const dLat = region.latitude - latitude;
    const dLon = (region.longitude - longitude) * Math.cos((latitude * Math.PI) / 180);
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDist) {
      minDist = dist;
      nearest = region;
    }
  }
  return nearest;
}

export function loadRegion(): Region | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Region>;
    // 현재 위치(GPS)처럼 목록에 없는 지역도 좌표·이름까지 그대로 복원해요.
    if (
      typeof saved.id === "string" &&
      typeof saved.name === "string" &&
      typeof saved.latitude === "number" &&
      typeof saved.longitude === "number"
    ) {
      return {
        id: saved.id,
        name: saved.name,
        latitude: saved.latitude,
        longitude: saved.longitude,
      };
    }
    // 구버전(id만 저장됨) 호환
    if (typeof saved.id === "string") {
      return REGIONS.find((r) => r.id === saved.id) ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveRegion(region: Region) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
  } catch {
    // 저장 실패 시 다음 진입에 다시 선택
  }
}
