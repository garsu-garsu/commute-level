import { adaptive } from "@toss/tds-colors";
import { describeWeatherCode } from "../lib/weather";
import type { HourlyWeather } from "../lib/weather";

interface Props {
  hours: HourlyWeather[];
  isWeekend: boolean;
  /** 사용자가 설정한 출근 시각 (집을 나서는 시간) */
  departHour: number;
  /** 사용자가 설정한 퇴근 시각 (회사를 나서는 시간) */
  leaveHour: number;
}

export function HourlyTrend({ hours, isWeekend, departHour, leaveHour }: Props) {
  const commuteHours = [departHour - 1, departHour, departHour + 1];
  const leaveHours = [leaveHour - 1, leaveHour, leaveHour + 1];

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        padding: "4px 24px 8px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {hours.map((h) => {
        const hour = Number(h.time.slice(11, 13));
        const isCommute = !isWeekend && commuteHours.includes(hour);
        const isLeave = !isWeekend && leaveHours.includes(hour);
        const highlighted = isCommute || isLeave;
        const { emoji } = describeWeatherCode(h.weatherCode);

        return (
          <div
            key={h.time}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              minWidth: 52,
              padding: "10px 4px",
              borderRadius: 12,
              backgroundColor: highlighted ? adaptive.blue50 : "transparent",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, color: adaptive.grey500 }}>
              {isCommute && hour === departHour
                ? "출근"
                : isLeave && hour === leaveHour
                  ? "퇴근"
                  : `${hour}시`}
            </span>
            <span style={{ fontSize: 18, lineHeight: "24px" }}>{emoji}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: highlighted ? 700 : 500,
                color: adaptive.grey800,
              }}
            >
              {Math.round(h.temperature)}°
            </span>
            <span
              style={{
                fontSize: 11,
                color: h.precipitationProbability >= 40 ? adaptive.blue500 : adaptive.grey400,
              }}
            >
              {h.precipitationProbability >= 20 ? `${Math.round(h.precipitationProbability)}%` : " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}
