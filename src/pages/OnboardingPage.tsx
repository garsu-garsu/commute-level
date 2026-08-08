import { Button, Top } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";

interface Props {
  onStart: () => void;
}

const STEPS = [
  {
    emoji: "📍",
    title: "설정 없이 바로 확인해요",
    body: "시작하면 서울 기준으로 오늘 출근 난이도부터 보여드려요. 내 지역은 화면 맨 위에서 언제든 바꿀 수 있어요.",
  },
  {
    emoji: "🌡️",
    title: "오늘 출근 난이도를 알려드려요",
    body: "체감온도·비올 확률·바람·미세먼지를 묶어 별점으로 보여줘요. 어제 아침과 얼마나 다른지도 함께 알려드려요.",
  },
  {
    emoji: "⏰",
    title: "내 출퇴근 시간에 맞춰요",
    body: "출근·퇴근 시각을 설정하면 그 시간대 날씨만 골라서 봐요. 우산을 챙길지, 뭘 입을지 바로 알 수 있어요.",
  },
];

/** 첫 실행에 한 번만 보여주는 소개 화면. */
export function OnboardingPage({ onStart }: Props) {
  return (
    <div style={{ paddingBottom: 32 }}>
        {/* 앱 이름은 토스 상단 바가 이미 보여줘요 — 여기서 또 쓰면 헤더가 겹쳐 보여요. */}
      <Top
        title={<Top.TitleParagraph size={28}>오늘 출근길 어떨까</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            오늘 출근길, 얼마나 힘들까요?
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ padding: "8px 20px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STEPS.map((s) => (
            <div
              key={s.title}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                background: adaptive.grey50,
                borderRadius: 16,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1.2 }}>{s.emoji}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 15, fontWeight: 800, color: adaptive.grey800 }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: adaptive.grey600,
                    marginTop: 4,
                  }}
                >
                  {s.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <Button size="xlarge" display="full" onClick={onStart}>
            시작하기
          </Button>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 18,
            fontSize: 12,
            color: adaptive.grey500,
            lineHeight: 1.6,
          }}
        >
          날씨는 Open-Meteo 예보를 사용해요. 실제 날씨와 다를 수 있어요.
        </div>
      </div>
    </div>
  );
}
