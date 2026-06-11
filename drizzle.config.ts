/// <reference types="node" />
import { defineConfig } from 'drizzle-kit';
import { homedir } from 'node:os';
import * as path from 'node:path';

// Used by the drizzle-kit CLI (generate/migrate/push/studio).
// The runtime connection lives in src/main/database/database.providers.ts and
// opens app.getPath('userData')/dashboard.db. We resolve that same path here so
// `studio`/`push` reflect the real app data — without importing electron (the
// CLI runs in plain Node). Override with DASHBOARD_DB to target another file.
const APP_NAME = 'dashboard';

function userDataDir(): string {
  switch (process.platform) {
    case 'win32':
      return path.join(
        process.env.APPDATA ?? path.join(homedir(), 'AppData', 'Roaming'),
        APP_NAME,
      );
    case 'darwin':
      return path.join(homedir(), 'Library', 'Application Support', APP_NAME);
    default:
      return path.join(
        process.env.XDG_CONFIG_HOME ?? path.join(homedir(), '.config'),
        APP_NAME,
      );
  }
}

const url = process.env.DASHBOARD_DB ?? path.join(userDataDir(), `${APP_NAME}.db`);

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url,
  },
});
