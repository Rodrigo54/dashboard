import { defineConfig } from 'drizzle-kit';

// Used by the drizzle-kit CLI (generate/migrate/push/studio).
// The runtime connection lives in src/main/database/database.providers.ts and
// points at userData; the `url` below is only for local tooling.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: './.data/dashboard.db',
  },
});
