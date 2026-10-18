import { defineConfig, type ViteUserConfig } from 'vitest/config';

const config: ViteUserConfig = defineConfig({
  // `@netwin/maple` resolves to the library's sources through tsconfig `paths`, as in the playground
  resolve: { tsconfigPaths: true },
  // Both engines format local dates, so the timezone is pinned as in Maple's own tests
  test: { env: { TZ: 'Europe/Berlin' } }
});

export default config;
