// Barrel for the schema. drizzle-kit reads this (via drizzle.config.ts) to
// generate migrations, and the runtime passes it to drizzle() as `schema`.
// Keep this tree free of Electron/Node-runtime imports.
export * from './users';
export * from './accounts';
export * from './transactions';
export * from './budgets';
export * from './goals';
export * from './projects';
export * from './tasks';
export * from './task-comments';
export * from './tags';
export * from './recurring';
export * from './notes';
export { relations } from './relations';
