import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Component tests (.test.tsx) start with `// @vitest-environment jsdom`; the .test.ts files stay in node.
    include: ['src/**/*.test.{ts,tsx}'],
    // Day keys come from the local clock; pin one zone so results do not depend on the machine running the tests.
    env: { TZ: 'Asia/Jakarta' },
  },
});
