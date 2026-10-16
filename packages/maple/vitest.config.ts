import { defineConfig, type ViteUserConfig } from 'vitest/config';

// Local-time Date output must be identical on every machine, so the tests pin the timezone
const config: ViteUserConfig = defineConfig({
  test: { env: { TZ: 'Europe/Berlin' } }
});

export default config;
