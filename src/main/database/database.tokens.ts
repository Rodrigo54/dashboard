// Connection constants for the database layer. Kept separate so both the
// providers and any future consumers share a single source of truth.
// The database file name/location now comes from environments/*.yml
// (see src/main/environment).

/** Folder (relative to the app path) holding the bundled drizzle migrations. */
export const MIGRATIONS_DIRNAME = 'drizzle';
