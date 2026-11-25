import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './generated/openapi.json',
  output: 'frontend/src/api/generated',
  plugins: ['@hey-api/client-fetch', '@hey-api/typescript', '@hey-api/sdk'],
});
