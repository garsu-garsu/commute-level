// 스토어 스크린샷 촬영. 콘솔 세로형 규격이 636x1048 정확히라서
// 318x524 뷰포트를 @2x 로 찍어 딱 떨어지게 만들어요.
//
// 사용법: 다른 터미널에서 `npx vite --port 5188` 을 띄운 뒤
//   node scripts/screenshots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:5188";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 318, height: 524 },
  deviceScaleFactor: 2,
});

async function shot(name) {
  await sleep(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("📸", name);
}

/** 입력칸이 아니라 결과가 보이도록 아래로 내려요. */
async function scrollTo(y) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await sleep(400);
}

await page.goto(BASE, { waitUntil: "networkidle" });
await sleep(800);
await shot("01-onboarding");

// 소개 화면을 넘기면 기본 지역 기준 브리핑이 바로 보여요.
await page.getByText("시작하기", { exact: true }).first().click();
await sleep(1800); // 날씨 조회 대기
await shot("02-briefing");

await scrollTo(520);
await shot("03-outfit");

await scrollTo(1100);
await shot("04-hourly");

await scrollTo(1700);
await shot("05-evening");

await browser.close();
console.log("✅ done");
