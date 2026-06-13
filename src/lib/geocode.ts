/**
 * 좌표 → 동네 이름 역지오코딩.
 * BigDataCloud 무료 reverse-geocode-client (API 키 불필요, CORS 허용).
 * 실패하면 null을 반환해 호출부에서 '현재 위치'로 폴백해요.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${latitude}&longitude=${longitude}&localityLanguage=ko`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    };
    const name = json.city || json.locality || json.principalSubdivision;
    return typeof name === "string" && name.trim() !== "" ? name.trim() : null;
  } catch {
    return null;
  }
}
