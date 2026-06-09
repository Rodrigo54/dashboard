import { defineRelations } from 'drizzle-orm';
import { accounts } from './accounts';
import { budgets } from './budgets';
import { goals } from './goals';
import { notes } from './notes';
import { projects } from './projects';
import { recurring } from './recurring';
import { tags } from './tags';
import { taskComments } from './task-comments';
import { tasks } from './tasks';
import { transactions } from './transactions';
import { users } from './users';

// Relational Queries v2 — um único defineRelations cobrindo todas as tabelas.
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
      incomingTransactions: r.many.transactions({ alias: 'toAccount' }),
    },
    transactions: {
      user: r.one.users({ from: r.transactions.userId, to: r.users.id, optional: false }),
      account: r.one.accounts({
        from: r.transactions.accountId,
        to: r.accounts.id,
        optional: false,
        alias: 'account',
      }),
      toAccount: r.one.accounts({
        from: r.transactions.toAccountId,
        to: r.accounts.id,
        alias: 'toAccount',
      }),
      project: r.one.projects({ from: r.transactions.projectId, to: r.projects.id }),
      budget: r.one.budgets({ from: r.transactions.budgetId, to: r.budgets.id }),
      goal: r.one.goals({ from: r.transactions.goalId, to: r.goals.id }),
      recurring: r.one.recurring({ from: r.transactions.recurringId, to: r.recurring.id }),
    },
    budgets: {
      user: r.one.users({ from: r.budgets.userId, to: r.users.id, optional: false }),
      project: r.one.projects({ from: r.budgets.projectId, to: r.projects.id }),
      goal: r.one.goals({ from: r.budgets.goalId, to: r.goals.id }),
      transactions: r.many.transactions(),
    },
    goals: {
      user: r.one.users({ from: r.goals.userId, to: r.users.id, optional: false }),
      project: r.one.projects({ from: r.goals.projectId, to: r.projects.id }),
      budgets: r.many.budgets(),
      transactions: r.many.transactions(),
    },
    projects: {
      user: r.one.users({ from: r.projects.userId, to: r.users.id, optional: false }),
      tasks: r.many.tasks(),
      budgets: r.many.budgets(),
      goals: r.many.goals(),
      transactions: r.many.transactions(),
    },
    tasks: {
      user: r.one.users({ from: r.tasks.userId, to: r.users.id, optional: false }),
      project: r.one.projects({ from: r.tasks.projectId, to: r.projects.id }),
      recurring: r.one.recurring({ from: r.tasks.recurringId, to: r.recurring.id }),
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
      tasks: r.many.tasks(),
      transactions: r.many.transactions(),
    },
  }),
);
