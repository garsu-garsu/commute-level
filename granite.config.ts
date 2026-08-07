import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "commute-level",
  brand: {
    displayName: "출근 날씨 옷차림",
    primaryColor: "#3182F6",
    icon: "https://static.toss.im/appsintoss/13203/5b4dff0b-a680-4e83-9afb-e450642089a2.png", // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [{ name: "geolocation", access: "access" }],
  outdir: "dist",
});
