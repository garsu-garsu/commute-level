export interface HourlyWeather {
  /** 로컬 ISO 시각 (예: "2026-06-11T07:00") */
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number; // m/s
}

export interface AirQuality {
  pm10: number | null;
  pm25: number | null;
}

export interface WeatherData {
  /** 어제 00시 ~ 내일 23시, 시간순 */
  hourly: HourlyWeather[];
  /** 오늘 출근 시간대 기준 미세먼지 */
  air: AirQuality;
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const forecastParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly:
      "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m",
    wind_speed_unit: "ms",
    timezone: "Asia/Seoul",
    past_days: "1",
    forecast_days: "2",
  });

  const res = await fetch(`${FORECAST_URL}?${forecastParams}`);
  if (!res.ok) throw new Error(`날씨 조회 실패 (${res.status})`);
  const json = await res.json();

  const h = json.hourly;
  const hourly: HourlyWeather[] = h.time.map((time: string, i: number) => ({
    time,
    temperature: h.temperature_2m[i],
    apparentTemperature: h.apparent_temperature[i],
    precipitationProbability: h.precipitation_probability[i] ?? 0,
    precipitation: h.precipitation[i] ?? 0,
    weatherCode: h.weather_code[i],
    windSpeed: h.wind_speed_10m[i] ?? 0,
  }));

  // 미세먼지는 실패해도 브리핑은 계속 동작해야 함
  const air = await fetchAirQuality(latitude, longitude).catch(() => ({ pm10: null, pm25: null }));

  return { hourly, air };
}

async function fetchAirQuality(latitude: number, longitude: number): Promise<AirQuality> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: "pm10,pm2_5",
    timezone: "Asia/Seoul",
    forecast_days: "1",
  });

  const res = await fetch(`${AIR_URL}?${params}`);
  if (!res.ok) throw new Error(`미세먼지 조회 실패 (${res.status})`);
  const json = await res.json();

  const times: string[] = json.hourly.time;
  const pm10: (number | null)[] = json.hourly.pm10;
  const pm25: (number | null)[] = json.hourly.pm2_5;

  // 출근 시간대(6~9시) 최댓값, 값이 없으면 가용한 값 중 최신
  const morningIdx = times
    .map((t, i) => ({ hour: Number(t.slice(11, 13)), i }))
    .filter(({ hour }) => hour >= 6 && hour <= 9)
    .map(({ i }) => i);

  const pick = (values: (number | null)[]) => {
    const morning = morningIdx.map((i) => values[i]).filter((v): v is number => v != null);
    if (morning.length > 0) return Math.max(...morning);
    const all = values.filter((v): v is number => v != null);
    return all.length > 0 ? all[all.length - 1] : null;
  };

  return { pm10: pick(pm10), pm25: pick(pm25) };
}

/** WMO weather code → 이모지/설명 */
export function describeWeatherCode(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "맑음" };
  if (code <= 2) return { emoji: "🌤️", label: "구름 조금" };
  if (code === 3) return { emoji: "☁️", label: "흐림" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "안개" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "이슬비" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "비" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", label: "눈" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", label: "소나기" };
  if (code === 85 || code === 86) return { emoji: "🌨️", label: "소낙눈" };
  if (code >= 95) return { emoji: "⛈️", label: "뇌우" };
  return { emoji: "🌥️", label: "흐림" };
}

export function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}
