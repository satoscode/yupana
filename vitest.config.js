import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // firestore.rules.test.js necesita el emulador (npm run test:rules);
    // el resto de pruebas son puras y corren con npm test.
    exclude: ["node_modules/**", "src/data/firestore.rules.test.js"],
  },
});
