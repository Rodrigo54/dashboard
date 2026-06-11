/// <reference types="node" />
import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { parseEnvironment } from './src/main/environment/environment.parser';

// Used by the drizzle-kit CLI (generate/migrate/push/studio).
// The runtime connection lives in src/main/database/database.providers.ts and
// resolves the database from environments/<env>.yml. We parse the same YAML
// here (plain Node — no electron, no Vite) so `studio`/`push` reflect the real
// app data. Pick the environment with DASHBOARD_ENV (default: development) and
// override the resolved file entirely with DASHBOARD_DB.
const envName = process.env.DASHBOARD_ENV ?? 'development';
const environment = parseEnvironment(
  readFileSync(path.join(__dirname, 'environments', `${envName}.yml`), 'utf8'),
);

function userDataDir(appId: string): string {
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA ?? path.join(homedir(), 'AppData', 'Roaming'), appId);
    case 'darwin':
      return path.join(homedir(), 'Library', 'Application Support', appId);
    default:
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(homedir(), '.config'), appId);
  }
}

const dbDir =
  environment.database.directory === 'userData'
    ? userDataDir(environment.app.id)
    : path.resolve(environment.database.directory);

const url = process.env.DASHBOARD_DB ?? path.join(dbDir, environment.database.fileName);

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url,
  },
});
