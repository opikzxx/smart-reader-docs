import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {},
  },
  test: {
    globals: true,
    css: false,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    server: {
      deps: {
        inline: [/@exodus\/bytes/, /html-encoding-sniffer/],
      },
    },
  },
});
