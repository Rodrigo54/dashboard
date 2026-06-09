import { z } from 'zod';
import {
  // Accounts
  accountSchema,
  // Budgets
  budgetSchema,
  createAccountSchema,
  createBudgetSchema,
  createGoalSchema,
  createProjectSchema,
  createRecurringSchema,
  createTagSchema,
  createTaskSchema,
  createTransactionSchema,
  createUserSchema,
  dateRangeSchema,
  // Goals
  goalSchema,
  loginSchema,
  // Notes
  noteSchema,
  createNoteSchema,
  updateNoteSchema,
  // Task Comments
  taskCommentSchema,
  createTaskCommentSchema,
  updateTaskCommentSchema,
  // Common
  paginationSchema,
  // Projects
  projectSchema,
  recurringPatternSchema,
  // Recurring
  recurringSchema,
  // Tags
  tagSchema,
  // Tasks
  taskSchema,
  taskTemplateSchema,
  // Transactions
  transactionSchema,
  transactionTemplateSchema,
  updateAccountSchema,
  updateBudgetSchema,
  updateGoalSchema,
  updateProjectSchema,
  updateRecurringSchema,
  updateTagSchema,
  updateTaskSchema,
  updateTransactionSchema,
  // Users
  userSchema,
  uuidSchema,
} from '../schemas';

export type UUID = z.infer<typeof uuidSchema>;

// ============================================================
// Users
// ============================================================

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type Login = z.infer<typeof loginSchema>;

// ============================================================
// Accounts
// ============================================================

export type Account = z.infer<typeof accountSchema>;
export type CreateAccount = z.infer<typeof createAccountSchema>;
export type UpdateAccount = z.infer<typeof updateAccountSchema>;

// ============================================================
// Transactions
// ============================================================

export type Transaction = z.infer<typeof transactionSchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;

// ============================================================
// Budgets
// ============================================================

export type Budget = z.infer<typeof budgetSchema>;
export type CreateBudget = z.infer<typeof createBudgetSchema>;
export type UpdateBudget = z.infer<typeof updateBudgetSchema>;

// ============================================================
// Goals
// ============================================================

export type Goal = z.infer<typeof goalSchema>;
export type CreateGoal = z.infer<typeof createGoalSchema>;
export type UpdateGoal = z.infer<typeof updateGoalSchema>;

// ============================================================
// Projects
// ============================================================

export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

// ============================================================
// Tasks
// ============================================================

export type Task = z.infer<typeof taskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// ============================================================
// Tags
// ============================================================

export type Tag = z.infer<typeof tagSchema>;
export type CreateTag = z.infer<typeof createTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;

// ============================================================
// Recurring
// ============================================================

export type Recurring = z.infer<typeof recurringSchema>;
export type CreateRecurring = z.infer<typeof createRecurringSchema>;
export type UpdateRecurring = z.infer<typeof updateRecurringSchema>;
export type RecurringPattern = z.infer<typeof recurringPatternSchema>;
export type TransactionTemplate = z.infer<typeof transactionTemplateSchema>;
export type TaskTemplate = z.infer<typeof taskTemplateSchema>;

// ============================================================
// Notes
// ============================================================

export type Note = z.infer<typeof noteSchema>;
export type CreateNote = z.infer<typeof createNoteSchema>;
export type UpdateNote = z.infer<typeof updateNoteSchema>;

// ============================================================
// Task Comments
// ============================================================

export type TaskComment = z.infer<typeof taskCommentSchema>;
export type CreateTaskComment = z.infer<typeof createTaskCommentSchema>;
export type UpdateTaskComment = z.infer<typeof updateTaskCommentSchema>;

// ============================================================
// Common
// ============================================================

export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;

// ============================================================
// API Responses
// ============================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// App Data
// ============================================================

/** Metadados de runtime do app, expostos pelo controller `appdata`. */
export interface AppData {
  name: string;
  version: string;
  environment: 'development' | 'production';
  timestamp: string;
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
}
