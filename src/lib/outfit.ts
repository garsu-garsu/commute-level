/** 체감온도 기반 옷차림 8단계 + 우산/마스크 플래그 */

export interface Outfit {
  level: number; // 1(가장 시원) ~ 8(가장 따뜻)
  name: string;
  items: string;
  emoji: string;
}

// [체감온도 하한(이상), 단계]
const OUTFIT_LEVELS: Array<[number, Outfit]> = [
  [28, { level: 1, name: "한여름 차림", items: "민소매·반팔·반바지·린넨", emoji: "🩳" }],
  [23, { level: 2, name: "여름 차림", items: "반팔·얇은 셔츠·면바지", emoji: "👕" }],
  [20, { level: 3, name: "초가을 차림", items: "얇은 가디건·긴팔·청바지", emoji: "👔" }],
  [17, { level: 4, name: "가을 차림", items: "얇은 니트·맨투맨·가디건", emoji: "🧥" }],
  [12, { level: 5, name: "쌀쌀한 날 차림", items: "자켓·가디건·야상", emoji: "🧥" }],
  [9, { level: 6, name: "늦가을 차림", items: "트렌치코트·니트·자켓", emoji: "🧥" }],
  [5, { level: 7, name: "초겨울 차림", items: "코트·히트텍·니트", emoji: "🧣" }],
  [-Infinity, { level: 8, name: "한겨울 차림", items: "패딩·두꺼운 코트·목도리·기모", emoji: "🧤" }],
];

export function pickOutfit(apparentTemp: number): Outfit {
  for (const [min, outfit] of OUTFIT_LEVELS) {
    if (apparentTemp >= min) return outfit;
  }
  return OUTFIT_LEVELS[OUTFIT_LEVELS.length - 1][1];
}

export interface Flags {
  umbrella: boolean;
  mask: boolean;
}
