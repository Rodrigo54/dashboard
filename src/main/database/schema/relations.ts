import { defineRelations } from 'drizzle-orm';
import { accounts } from './accounts.js';
import { budgets } from './budgets.js';
import { goals } from './goals.js';
import { notes } from './notes.js';
import { projects } from './projects.js';
import { recurring } from './recurring.js';
import { tags } from './tags.js';
import { taskComments, tasks } from './tasks.js';
import { transactions } from './transactions.js';
import { users } from './users.js';

// Relational Queries v2 — a single defineRelations spanning every table.
export const relations = defineRelations(
  { users, accounts, transactions, budgets, goals, projects, tasks, taskComments, tags, recurring, notes },
  (r) => ({
    users: {
      accounts: r.many.accounts(),
      transactions: r.many.transactions(),
      budgets: r.many.budgets(),
      goals: r.many.goals(),
      projects: r.many.projects(),
      tasks: r.many.tasks(),
      taskComments: r.many.taskComments(),
      tags: r.many.tags(),
      recurring: r.many.recurring(),
    },
    accounts: {
      user: r.one.users({ from: r.accounts.userId, to: r.users.id, optional: false }),
      transactions: r.many.transactions({ alias: 'account' }),
      goals: r.many.goals(),
    },
    transactions: {
      user: r.one.users({ from: r.transactions.userId, to: r.users.id, optional: false }),
      account: r.one.accounts({
        from: r.transactions.accountId,
        to: r.accounts.id,
        optional: false,
        alias: 'account',
      }),
      transferAccount: r.one.accounts({
        from: r.transactions.transferAccountId,
        to: r.accounts.id,
        alias: 'transferAccount',
      }),
    },
    budgets: {
      user: r.one.users({ from: r.budgets.userId, to: r.users.id, optional: false }),
    },
    goals: {
      user: r.one.users({ from: r.goals.userId, to: r.users.id, optional: false }),
      account: r.one.accounts({ from: r.goals.accountId, to: r.accounts.id }),
    },
    projects: {
      user: r.one.users({ from: r.projects.userId, to: r.users.id, optional: false }),
      tasks: r.many.tasks(),
    },
    tasks: {
      user: r.one.users({ from: r.tasks.userId, to: r.users.id, optional: false }),
      project: r.one.projects({ from: r.tasks.projectId, to: r.projects.id }),
      comments: r.many.taskComments(),
    },
    taskComments: {
      task: r.one.tasks({ from: r.taskComments.taskId, to: r.tasks.id, optional: false }),
      user: r.one.users({ from: r.taskComments.userId, to: r.users.id, optional: false }),
    },
    tags: {
      user: r.one.users({ from: r.tags.userId, to: r.users.id, optional: false }),
    },
    recurring: {
      user: r.one.users({ from: r.recurring.userId, to: r.users.id, optional: false }),
    },
  }),
);
