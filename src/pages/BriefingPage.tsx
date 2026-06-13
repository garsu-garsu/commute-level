import { share } from "@apps-in-toss/web-framework";
import { adaptive, colors } from "@toss/tds-colors";
import {
  Badge,
  Border,
  Button,
  FixedBottomCTA,
  ListHeader,
  ListRow,
  Result,
  Skeleton,
  Top,
} from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { BannerAd } from "../components/BannerAd";
import { HourlyTrend } from "../components/HourlyTrend";
import { useBriefing } from "../hooks/useBriefing";
import { useInAppAds } from "../hooks/useInAppAds";
import { AD_IDS } from "../lib/ads";
import { buildShareMessage, formatDate } from "../lib/briefing";
import type { Briefing } from "../lib/briefing";
import type { Region } from "../lib/regions";

interface Props {
  region: Region;
  onChangeRegion: () => void;
}

export function BriefingPage({ region, onChangeRegion }: Props) {
  const { state, reload } = useBriefing(region);

  // 보상형 광고: '내일 미리보기' 잠금 해제용
  const rewarded = useInAppAds(AD_IDS.rewarded);
  const [tomorrowUnlocked, setTomorrowUnlocked] = useState(false);

  useEffect(() => {
    if (rewarded.lastReward != null) {
      setTomorrowUnlocked(true);
    }
  }, [rewarded.lastReward]);

  if (state.status === "loading") {
    return <Skeleton pattern="amountTopList" />;
  }

  if (state.status === "error") {
    return (
      <Result
        title={state.message}
        description="네트워크 상태를 확인하고 다시 시도해 주세요."
        button={<Result.Button onClick={reload}>다시 시도</Result.Button>}
      />
    );
  }

  const briefing = state.briefing;
  const tomorrow = state.tomorrow;
  const title = briefing.isWeekend ? "오늘의 나들이 난이도" : "오늘의 출근 난이도";

  const handleUnlockTomorrow = () => {
    if (rewarded.isSupported && rewarded.isAdLoaded) {
      // 광고 시청 완료 시 userEarnedReward 이벤트로 잠금이 해제돼요.
      rewarded.showAd();
    } else {
      // 광고를 쓸 수 없는 환경에서는 바로 보여줘 사용자 경험을 해치지 않아요.
      setTomorrowUnlocked(true);
    }
  };

  const handleShare = async () => {
    const message = buildShareMessage(region.name, briefing);
    try {
      await share({ message });
    } catch {
      try {
        if (navigator.share) await navigator.share({ text: message });
        else {
          await navigator.clipboard.writeText(message);
          alert("브리핑이 복사됐어요. 붙여넣어 공유해 보세요!");
        }
      } catch {
        // 사용자가 공유 시트를 닫은 경우 등 — 무시
      }
    }
  };

  return (
    <>
      <Top
        title={<Top.TitleParagraph size={22}>{title}</Top.TitleParagraph>}
        subtitleTop={
          <Top.SubtitleTextButton variant="arrow" onClick={onChangeRegion}>
            {`${formatDate(briefing.date)} · ${region.name}`}
          </Top.SubtitleTextButton>
        }
      />

      <StarSection briefing={briefing} />

      <BannerAd adGroupId={AD_IDS.banner} />

      <Border variant="height16" />

      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
            오늘의 옷차림
          </ListHeader.TitleParagraph>
        }
      />
      <ListRow
        left={
          <span style={{ fontSize: 32, lineHeight: "40px" }}>{briefing.outfit.emoji}</span>
        }
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top={`${briefing.outfit.name} (${briefing.outfit.level}/8단계)`}
            bottom={briefing.outfit.items}
          />
        }
      />

      <Border variant="height16" />

      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
            시간대별 추이
          </ListHeader.TitleParagraph>
        }
      />
      <HourlyTrend hours={briefing.todayHours} isWeekend={briefing.isWeekend} />
      <p
        style={{
          margin: "8px 24px 16px",
          padding: "14px 16px",
          borderRadius: 12,
          backgroundColor: adaptive.grey100,
          fontSize: 14,
          lineHeight: 1.5,
          color: adaptive.grey700,
        }}
      >
        🌆 {briefing.evening}
      </p>

      <Border variant="height16" />

      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
            난이도 계산 내역
          </ListHeader.TitleParagraph>
        }
      />
      {briefing.difficulty.factors.map((factor) => (
        <ListRow
          key={factor.key}
          verticalPadding="small"
          contents={
            <ListRow.Texts type="2RowTypeA" top={factor.label} bottom={factor.detail} />
          }
          right={
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color:
                  factor.points > 0
                    ? adaptive.red500
                    : factor.points < 0
                      ? adaptive.blue500
                      : adaptive.grey400,
              }}
            >
              {factor.points > 0 ? `+${factor.points}` : factor.points}
            </span>
          }
        />
      ))}

      <p
        style={{
          margin: "16px 24px 8px",
          fontSize: 12,
          lineHeight: 1.5,
          color: adaptive.grey500,
        }}
      >
        예보 기반 확률 정보예요. 실제 날씨와 다를 수 있어요.
      </p>

      <Border variant="height16" />

      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
            내일 미리보기
          </ListHeader.TitleParagraph>
        }
      />
      {tomorrowUnlocked ? (
        <TomorrowPreview briefing={tomorrow} />
      ) : (
        <LockedTomorrow
          isWeekend={tomorrow.isWeekend}
          onUnlock={handleUnlockTomorrow}
        />
      )}

      <div style={{ height: 24 }} />

      <FixedBottomCTA onClick={handleShare}>난이도 카드 공유하기</FixedBottomCTA>
    </>
  );
}

function StarSection({ briefing }: { briefing: Briefing }) {
  const { stars, label } = briefing.difficulty;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "12px 24px 28px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 36, letterSpacing: 4 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ color: i < stars ? colors.yellow400 : adaptive.grey200 }}>
            ★
          </span>
        ))}
      </div>
      <strong style={{ fontSize: 22, fontWeight: 700, color: adaptive.grey900 }}>{label}</strong>
      <p style={{ margin: 0, fontSize: 16, color: adaptive.grey700 }}>{briefing.headline}</p>
      <p style={{ margin: 0, fontSize: 14, color: adaptive.grey600 }}>{briefing.comparison}</p>

      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <Badge size="small" color="blue" variant="weak">
          체감 {Math.round(briefing.morningApparentTemp)}°
        </Badge>
        {briefing.flags.umbrella && (
          <Badge size="small" color="blue" variant="fill">
            ☂️ 우산 챙기기
          </Badge>
        )}
        {briefing.flags.mask && (
          <Badge size="small" color="red" variant="fill">
            😷 마스크 권장
          </Badge>
        )}
        {briefing.dustLabel && !briefing.flags.mask && (
          <Badge size="small" color="green" variant="weak">
            미세먼지 {briefing.dustLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}

function LockedTomorrow({
  isWeekend,
  onUnlock,
}: {
  isWeekend: boolean;
  onUnlock: () => void;
}) {
  const word = isWeekend ? "나들이" : "출근";
  return (
    <div
      style={{
        margin: "8px 24px 0",
        padding: "20px 16px",
        borderRadius: 16,
        backgroundColor: adaptive.grey100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28 }}>🔒</div>
      <p style={{ margin: 0, fontSize: 15, color: adaptive.grey700, lineHeight: 1.5 }}>
        내일 {word} 난이도를 미리 확인하고
        <br />
        하루를 더 여유롭게 준비해 보세요.
      </p>
      <Button size="medium" variant="weak" onClick={onUnlock}>
        광고 보고 내일 난이도 확인하기
      </Button>
    </div>
  );
}

function TomorrowPreview({ briefing }: { briefing: Briefing }) {
  const { stars, label } = briefing.difficulty;
  return (
    <div
      style={{
        margin: "8px 24px 0",
        padding: "20px 16px",
        borderRadius: 16,
        backgroundColor: adaptive.grey100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 4 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ color: i < stars ? colors.yellow400 : adaptive.grey200 }}>
            ★
          </span>
        ))}
      </div>
      <strong style={{ fontSize: 18, fontWeight: 700, color: adaptive.grey900 }}>
        {label}
      </strong>
      <p style={{ margin: 0, fontSize: 14, color: adaptive.grey700 }}>{briefing.headline}</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: adaptive.grey600 }}>
        {briefing.outfit.emoji} {briefing.outfit.name} · {briefing.outfit.items}
      </p>
    </div>
  );
}
