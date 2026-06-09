// Connection constants for the database layer. Kept separate so both the
// providers and any future consumers share a single source of truth.

/** Filename of the SQLite database inside the app's user-data directory. */
export const DB_FILENAME = 'dashboard.db';

/** Folder (relative to the app path) holding the bundled drizzle migrations. */
export const MIGRATIONS_DIRNAME = 'drizzle';
