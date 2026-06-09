// Barrel for the schema. drizzle-kit reads this (via drizzle.config.ts) to
// generate migrations, and the runtime passes it to drizzle() as `schema`.
// Keep this tree free of Electron/Node-runtime imports.
export * from './users.js';
export * from './accounts.js';
export * from './transactions.js';
export * from './budgets.js';
export * from './goals.js';
export * from './projects.js';
export * from './tasks.js';
export * from './task-comments.js';
export * from './tags.js';
export * from './recurring.js';
export * from './notes.js';
export { relations } from './relations.js';
