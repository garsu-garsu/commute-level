import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "commute-level",
  brand: {
    primaryColor: "#3182F6",
  },
  permissions: [{ name: "geolocation", access: "access" }],
  webBundleDir: "dist",
});
