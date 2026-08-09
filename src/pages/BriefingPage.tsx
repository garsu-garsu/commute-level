import { getTossShareLink, share } from "@apps-in-toss/web-framework";
import { adaptive, colors } from "@toss/tds-colors";
import {
  Badge,
  Border,
  BottomSheet,
  Button,
  FixedBottomCTA,
  ListHeader,
  ListRow,
  Result,
  Skeleton,
  Top,
  useToast,
} from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";
import { BannerAd } from "../components/BannerAd";
import { CoachMark } from "../components/CoachMark";
import { HourlyTrend } from "../components/HourlyTrend";
import { useBriefing } from "../hooks/useBriefing";
import { useInAppAds } from "../hooks/useInAppAds";
import { AD_IDS } from "../lib/ads";
import { buildShareMessage, formatDate } from "../lib/briefing";
import {
  agreedSlot,
  isNotifySupported,
  NOTIFY_SLOTS,
  requestNotify,
  type NotifySlotCode,
} from "../lib/notify";
import { isOnboarded, markOnboarded } from "../lib/onboarding";
import type { Briefing } from "../lib/briefing";
import {
  centerHour,
  crossesMidnight,
  formatHM,
  parseHM,
  STEP_MINUTES,
  suggestLeave,
  workMinutes,
} from "../lib/commute";
import type { CommuteTime } from "../lib/commute";
import type { Region } from "../lib/regions";
import { describeWeatherCode } from "../lib/weather";

/** apps-in-toss.config.ts 의 appName / brand.icon 과 맞춰야 해요. */
const SHARE_DEEP_LINK = "intoss://commute-level";
const SHARE_OG_IMAGE =
  "https://static.toss.im/appsintoss/13203/5b4dff0b-a680-4e83-9afb-e450642089a2.png";

interface Props {
  region: Region;
  /** 아직 지역을 고르지 않아 기본 지역(서울)으로 보여주는 중인지 */
  isDefaultRegion: boolean;
  commute: CommuteTime;
  onChangeRegion: () => void;
  onChangeCommute: (commute: CommuteTime) => void;
}

const TOUR_MESSAGES = [
  "따로 설정 안 해도 서울 기준으로 바로 보여드려요. 내 지역은 여기서 언제든 바꿀 수 있어요.",
  "체감온도·비올 확률·바람·미세먼지를 묶어 별점으로 보여드려요. 어제 아침과 얼마나 다른지도 알려드려요.",
  "출근·퇴근 시각을 정하면 그 시간대 날씨만 골라서 보여드려요. 여기를 눌러 시간을 설정해 보세요.",
];

export function BriefingPage({
  region,
  isDefaultRegion,
  commute,
  onChangeRegion,
  onChangeCommute,
}: Props) {
  const { state, reload } = useBriefing(region, commute);
  const [commuteSheetOpen, setCommuteSheetOpen] = useState(false);

  // 보상형 광고: '내일 미리보기' 잠금 해제용
  const rewarded = useInAppAds(AD_IDS.rewarded);
  const [tomorrowUnlocked, setTomorrowUnlocked] = useState(false);

  useEffect(() => {
    if (rewarded.lastReward != null) {
      setTomorrowUnlocked(true);
    }
  }, [rewarded.lastReward]);

  // 첫 실행에만 도는 코치마크 투어 — 화면 아무 곳이나 누르면 다음 단계로 넘어가요.
  const [tourStep, setTourStep] = useState(() => (isOnboarded() ? -1 : 0));
  const regionRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const commuteRef = useRef<HTMLDivElement>(null);
  const tourRefs = [regionRef, starsRef, commuteRef];

  const endTour = () => {
    markOnboarded();
    setTourStep(-1);
  };

  useEffect(() => {
    if (tourStep < 0) return;
    const onClick = (event: MouseEvent) => {
      // 건너뛰기 버튼 클릭은 그대로 통과시켜요 — 여기서 가로채면 버튼이 안 눌려요.
      if ((event.target as HTMLElement | null)?.closest("[data-tour-skip]") != null) return;
      event.preventDefault();
      event.stopPropagation();
      setTourStep((prev) => {
        const nextStep = prev + 1;
        if (nextStep >= TOUR_MESSAGES.length) {
          markOnboarded();
          return -1;
        }
        return nextStep;
      });
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [tourStep]);

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
      // 받은 사람이 바로 앱으로 들어올 수 있게 토스 공유 링크를 붙여요. (실패하면 문구만 공유)
      const link = await getTossShareLink(SHARE_DEEP_LINK, SHARE_OG_IMAGE).catch(() => "");
      await share({ message: link ? `${message}\n${link}` : message });
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
      <div ref={regionRef}>
        <Top
          title={<Top.TitleParagraph size={22}>{title}</Top.TitleParagraph>}
          subtitleTop={
            <Top.SubtitleTextButton variant="arrow" onClick={onChangeRegion}>
              {isDefaultRegion
                ? `${region.name} 날씨 기준 · 내 지역으로 바꾸기`
                : `${formatDate(briefing.date)} · ${region.name}`}
            </Top.SubtitleTextButton>
          }
        />
      </div>

      <div ref={starsRef}>
        <StarSection briefing={briefing} />
      </div>

      <Border variant="height16" />

      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
            오늘 출근길 옷차림
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

      <div ref={commuteRef}>
        <ListHeader
          title={
            <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
              시간대별 날씨·체감온도
            </ListHeader.TitleParagraph>
          }
          right={
            <ListHeader.RightArrow typography="t6" onClick={() => setCommuteSheetOpen(true)}>
              {`출근 ${formatHM(commute.depart)} · 퇴근 ${formatHM(commute.leave)}`}
            </ListHeader.RightArrow>
          }
        />
      </div>
      <HourlyTrend
        hours={briefing.todayHours}
        isWeekend={briefing.isWeekend}
        departHour={centerHour(commute.depart)}
        leaveHour={centerHour(commute.leave)}
      />
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
            내일 출근 난이도 미리보기
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

      {isNotifySupported() && <MorningAlertCard />}

      {/* 이미지 강조형 배너 — 본문 스크롤의 맨 끝. 끝까지 내려본 사람에게만 보여요.
          아래 배너는 하단 고정 CTA 에 붙어 있어 본문 흐름과 겹치지 않아요. */}
      <div style={{ marginTop: 24 }}>
        <BannerAd adGroupId={AD_IDS.bannerImage} variant="card" height={200} grow />
      </div>

      <div style={{ height: 24 }} />

      {/* 배너를 본문 안이 아니라 하단 고정 CTA 바로 위에 얹어요.
          따로 position: fixed 를 주면 이 CTA 와 겹치는데, topAccessory 로 넣으면
          CTA 가 잡아둔 하단 여백 안에 같이 들어가서 본문을 가리지 않아요. */}
      <FixedBottomCTA
        onClick={handleShare}
        topAccessory={<BannerAd adGroupId={AD_IDS.banner} />}
      >
        {briefing.isWeekend ? "오늘 난이도 친구에게 보내기" : "오늘 출근 난이도 동료에게 보내기"}
      </FixedBottomCTA>

      <CommuteTimeSheet
        open={commuteSheetOpen}
        commute={commute}
        onClose={() => setCommuteSheetOpen(false)}
        onSave={(next) => {
          onChangeCommute(next);
          setCommuteSheetOpen(false);
        }}
      />

      {tourStep >= 0 && (
        <CoachMark
          targetRef={tourRefs[tourStep]}
          message={TOUR_MESSAGES[tourStep]}
          index={tourStep}
          total={TOUR_MESSAGES.length}
          onSkip={endTour}
        />
      )}
    </>
  );
}

function CommuteTimeSheet({
  open,
  commute,
  onClose,
  onSave,
}: {
  open: boolean;
  commute: CommuteTime;
  onClose: () => void;
  onSave: (commute: CommuteTime) => void;
}) {
  const [draft, setDraft] = useState<CommuteTime>(commute);

  // 바텀시트를 열 때마다 현재 설정값으로 초기화해요.
  useEffect(() => {
    if (open) setDraft(commute);
  }, [open, commute]);

  // 출근 시각을 바꾸면 퇴근을 9시간 뒤로 자동 추천해요. (자정 넘으면 다음 날)
  const handleDepartChange = (minutes: number) =>
    setDraft({ depart: minutes, leave: suggestLeave(minutes) });
  const handleLeaveChange = (minutes: number) =>
    setDraft((prev) => ({ ...prev, leave: minutes }));

  const overnight = crossesMidnight(draft);
  const work = workMinutes(draft);
  const workHours = Math.floor(work / 60);
  const workMins = work % 60;
  const workText =
    work === 0
      ? "출근·퇴근 시각이 같아요"
      : `근무 ${workHours}시간${workMins > 0 ? ` ${workMins}분` : ""}`;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      disableChildrenDragging
      header={<BottomSheet.Header>출근·퇴근 시간 설정</BottomSheet.Header>}
      headerDescription={
        <BottomSheet.HeaderDescription>
          설정한 시간대 날씨로 난이도와 옷차림을 계산해요.
        </BottomSheet.HeaderDescription>
      }
      cta={<BottomSheet.CTA onClick={() => onSave(draft)}>이 시간으로 설정하기</BottomSheet.CTA>}
    >
      <div style={{ padding: "8px 24px 16px" }}>
        <TimeRow label="출근" caption="집을 나서는 시각" minutes={draft.depart} onChange={handleDepartChange} />
        <TimeRow
          label="퇴근"
          caption={overnight ? "다음 날 회사를 나서는 시각" : "회사를 나서는 시각"}
          minutes={draft.leave}
          badge={overnight ? "다음 날" : undefined}
          onChange={handleLeaveChange}
        />
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 13,
            color: adaptive.grey600,
            textAlign: "center",
          }}
        >
          {workText}
          {overnight ? " · 야간 근무로 인식돼요" : ""}
        </p>
      </div>
    </BottomSheet>
  );
}

function TimeRow({
  label,
  caption,
  minutes,
  badge,
  onChange,
}: {
  label: string;
  caption: string;
  minutes: number;
  badge?: string;
  onChange: (minutes: number) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 16px",
        marginTop: 8,
        borderRadius: 14,
        backgroundColor: adaptive.grey100,
        cursor: "pointer",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: adaptive.grey800 }}>{label}</span>
          {badge && (
            <Badge size="xsmall" color="elephant" variant="weak">
              {badge}
            </Badge>
          )}
        </span>
        <span style={{ fontSize: 12, color: adaptive.grey500 }}>{caption}</span>
      </span>
      <input
        type="time"
        step={STEP_MINUTES * 60}
        value={formatHM(minutes)}
        onChange={(event) => {
          const parsed = parseHM(event.target.value);
          if (parsed != null) onChange(parsed);
        }}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          border: "none",
          background: "transparent",
          fontSize: 22,
          fontWeight: 700,
          color: colors.blue500,
          textAlign: "right",
          fontFamily: "inherit",
        }}
      />
    </label>
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

      <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 600, color: adaptive.grey800 }}>
        {describeWeatherCode(briefing.currentWeatherCode).emoji} 지금{" "}
        {Math.round(briefing.currentTemp)}° · 체감 {Math.round(briefing.currentApparentTemp)}°
      </p>

      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <Badge size="small" color="blue" variant="weak">
          출근 체감 {Math.round(briefing.morningApparentTemp)}°
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

function MorningAlertCard() {
  const toast = useToast();
  const [agreed, setAgreed] = useState(agreedSlot);

  const onNotify = async (code: NotifySlotCode) => {
    try {
      const result = await requestNotify(code);
      if (result === "agreementRejected") return;
      setAgreed(code);
      toast.openToast(
        result === "alreadyAgreed"
          ? "이미 알림을 받고 있어요."
          : "이제 그 시간에 알려드릴게요.",
      );
    } catch {
      toast.openToast("알림을 설정하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div
      style={{
        margin: "24px 24px 0",
        padding: "20px 16px",
        borderRadius: 16,
        backgroundColor: adaptive.blue50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28 }}>🔔</div>
      <p style={{ margin: 0, fontSize: 15, color: adaptive.grey700, lineHeight: 1.5 }}>
        {agreed == null
          ? "몇 시에 출근 알림을 받을까요?"
          : "알림을 받고 있어요. 시간은 언제든 바꿀 수 있어요."}
        <br />
        우산 챙길 날·갑자기 추워진 날을 알려드려요.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {NOTIFY_SLOTS.map((slot) => (
          <Button
            key={slot.code}
            size="small"
            variant={agreed === slot.code ? "fill" : "weak"}
            color={agreed === slot.code ? "primary" : "dark"}
            onClick={() => void onNotify(slot.code)}
          >
            {slot.label}
          </Button>
        ))}
      </div>
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
