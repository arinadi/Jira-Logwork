import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Day keys come from the local clock; pin one zone so results do not depend on the machine running the tests.
    env: { TZ: 'Asia/Jakarta' },
  },
});
