import { Accuracy, getCurrentLocation } from "@apps-in-toss/web-framework";
import { adaptive } from "@toss/tds-colors";
import { Button, List, ListRow, Top } from "@toss/tds-mobile";
import { useState } from "react";
import { findNearestRegion, REGIONS } from "../lib/regions";
import type { Region } from "../lib/regions";

interface Props {
  onSelect: (region: Region) => void;
}

/** 토스 브릿지 → 실패 시 브라우저 geolocation 순으로 현재 좌표를 가져온다. */
async function getCoords(): Promise<{ latitude: number; longitude: number }> {
  try {
    const location = await getCurrentLocation({ accuracy: Accuracy.Balanced });
    return location.coords;
  } catch {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("위치 정보를 사용할 수 없어요"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { timeout: 8000 },
      );
    });
  }
}

export function RegionSelectPage({ onSelect }: Props) {
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);

  const handleCurrentLocation = async () => {
    setLocating(true);
    setLocationFailed(false);
    try {
      const coords = await getCoords();
      onSelect(findNearestRegion(coords.latitude, coords.longitude));
    } catch {
      // 권한 거부 등 — 아래 수동 선택 목록으로 폴백
      setLocationFailed(true);
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      <Top
        title={
          <Top.TitleParagraph size={22}>어디에서 출근하세요?</Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            매일 아침 이 지역 기준으로 난이도를 알려드려요.
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ padding: "0 24px 16px" }}>
        <Button
          display="block"
          variant="weak"
          loading={locating}
          onClick={handleCurrentLocation}
        >
          📍 현재 위치로 설정
        </Button>
        {locationFailed && (
          <p
            style={{
              margin: "12px 4px 0",
              fontSize: 13,
              color: adaptive.grey600,
            }}
          >
            위치를 가져오지 못했어요. 아래에서 직접 선택해 주세요.
          </p>
        )}
      </div>

      <List>
        {REGIONS.map((region) => (
          <ListRow
            key={region.id}
            contents={<ListRow.Texts type="1RowTypeA" top={region.name} />}
            withArrow
            onClick={() => onSelect(region)}
          />
        ))}
      </List>
    </>
  );
}
