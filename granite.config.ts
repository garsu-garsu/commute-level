import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "commute-level",
  brand: {
    displayName: "출근난이도",
    primaryColor: "#3182F6",
    icon: "", // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
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
