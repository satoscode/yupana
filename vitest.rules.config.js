import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/data/firestore.rules.test.js"],
    testTimeout: 20000,
  },
});
