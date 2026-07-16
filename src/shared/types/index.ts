import { z } from 'zod';
import type { AccountProvider, TransactionCategory, TransactionType } from '../enums';
import {
  // Accounts
  accountSchema,
  accountPurgeOptionsSchema,
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
  // Import
  importPreviewSchema,
  importCommitItemSchema,
  importCommitSchema,
  // Recurring
  recurringSchema,
  // Tags
  tagSchema,
  // Tasks
  taskSchema,
  taskTemplateSchema,
  // Transactions
  listTransactionsSchema,
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
  updateProfileSchema,
  changePasswordSchema,
  updateAvatarSchema,
  uuidSchema,
  // Environment
  environmentNameSchema,
  environmentSchema,
  publicEnvironmentSchema,
} from '../schemas';

export type UUID = z.infer<typeof uuidSchema>;

// ============================================================
// Users
// ============================================================

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type Login = z.infer<typeof loginSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateAvatar = z.infer<typeof updateAvatarSchema>;

// ============================================================
// Accounts
// ============================================================

export type Account = z.infer<typeof accountSchema>;
export type CreateAccount = z.infer<typeof createAccountSchema>;
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
export type AccountPurgeOptions = z.infer<typeof accountPurgeOptionsSchema>;

// ============================================================
// Transactions
// ============================================================

export type Transaction = z.infer<typeof transactionSchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsFilter = z.infer<typeof listTransactionsSchema>;

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

/**
 * Candidato de vínculo entre uma transação sem `recurringId` e uma regra
 * existente (`recurrence-matching.service.ts`, main). `score` é a saída de
 * `computeRecurrenceProbability` (0..1) — a confirmação é sempre manual,
 * independente da pontuação.
 */
export interface RecurrenceMatchCandidate {
  transactionId: string;
  transactionDate: Date;
  transactionDescription: string;
  transactionAmount: string;
  transactionAccountId: string;
  recurringId: string;
  recurringName: string;
  score: number;
}

// ============================================================
// Import (extratos PDF)
// ============================================================

export type ImportPreviewRequest = z.infer<typeof importPreviewSchema>;
export type ImportCommitItem = z.infer<typeof importCommitItemSchema>;
export type ImportCommitRequest = z.infer<typeof importCommitSchema>;

/** Linha crua reconstruída por um parser de banco, antes do enriquecimento. */
export interface ParsedStatementLine {
  date: Date;
  /** Descrição crua da linha, como aparece no extrato. */
  description: string;
  /** Valor absoluto (decimal positivo em string). */
  amount: string;
  type: TransactionType;
}

/** Recorrência existente casada a uma linha importada durante o staging. */
export interface ImportMatch {
  recurringId: string;
  recurringName: string;
  /** Data da ocorrência prevista que casou com esta linha. */
  occurrenceDate: Date;
  /**
   * Id da linha já materializada por essa regra no período; presente quando a
   * importação deve reconciliar (update in-place) em vez de inserir.
   */
  materializedTransactionId?: string;
}

/** Linha do extrato enriquecida para revisão do usuário no staging. */
export interface StagedTransaction {
  /** Chave estável para trilhas do renderer (deriva do fingerprint). */
  key: string;
  date: Date;
  description: string;
  amount: string;
  type: TransactionType;
  /** Conta sugerida (aprendida/dica); o usuário confirma. */
  suggestedAccountId?: string;
  suggestedCategory: TransactionCategory;
  fingerprint: string;
  /** Já existe transação idêntica importada antes (rededuplicação). */
  duplicate: boolean;
  /** Marcada para gravar; estornos e duplicados vêm desmarcados. */
  include: boolean;
  /** Parte de um par de estorno (crédito+débito que se anulam). */
  reversal: boolean;
  match?: ImportMatch;
}

/** Reconciliação do parse pelas linhas de saldo do extrato. */
export interface ImportReconciliation {
  openingBalance?: string;
  closingBalance?: string;
  computedClosing?: string;
  /** true quando saldo inicial + movimentos = saldo final informado. */
  balanced: boolean;
}

/** Tipo do documento importado: extrato de conta ou fatura de cartão. */
export type ImportDocumentKind = 'statement' | 'invoice';

/** Resposta de `import:preview`: o staging completo para revisão. */
export interface ImportPreview {
  bank: AccountProvider | 'unknown';
  /** `invoice` teve os sinais invertidos e exige conta de crédito no commit. */
  kind: ImportDocumentKind;
  fileName: string;
  rows: StagedTransaction[];
  reconciliation: ImportReconciliation;
}

/** Resultado de `import:commit`. */
export interface ImportCommitResult {
  inserted: number;
  reconciled: number;
  skipped: number;
}

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
// Environment (environments/*.yml)
// ============================================================

export type EnvironmentName = z.infer<typeof environmentNameSchema>;
export type Environment = z.infer<typeof environmentSchema>;
/** Subconjunto do environment seguro para o renderer (sem `security`). */
export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

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
