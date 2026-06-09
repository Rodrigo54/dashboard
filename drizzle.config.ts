import { defineConfig } from 'drizzle-kit';

// Used by the drizzle-kit CLI (generate/migrate/push/studio).
// The runtime connection lives in src/main/db/index.ts and points at userData;
// the `url` below is only for local tooling.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './.data/dashboard.db',
  },
});
