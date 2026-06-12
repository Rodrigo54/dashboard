// ============================================================
// Enums centralizados do Dashboard
// Fonte única de verdade para backend (Drizzle pgEnum) e frontend
// ============================================================

// ------------------------------------
// Helpers
// ------------------------------------

type EnumMap = Record<string, string>;

/** Extrai os valores como tuple tipada para uso no pgEnum do Drizzle */
export function enumValues<T extends EnumMap>(map: T): [keyof T & string] {
  const keys = Object.keys(map) as (keyof T & string)[];
  return keys as [keyof T & string];
}

/** Gera lista { value, label } para selects do frontend */
export function enumOptions<T extends EnumMap>(map: T) {
  return Object.entries(map).map(([value, label]) => ({
    value: value as keyof T & string,
    label,
  }));
}

// ------------------------------------
// User Role
// ------------------------------------

export const USER_ROLES = {
  admin: 'Administrador',
  user: 'Usuário',
} as const;

export type UserRole = keyof typeof USER_ROLES;

// ------------------------------------
// Account Type
// ------------------------------------

export const ACCOUNT_TYPES = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit: 'Crédito',
  investment: 'Investimento',
  cash: 'Dinheiro',
} as const;

export type AccountType = keyof typeof ACCOUNT_TYPES;

// ------------------------------------
// Account Provider
// ------------------------------------

export const ACCOUNT_PROVIDERS = {
  bb: 'Banco do Brasil',
  caixa: 'Caixa Econômica',
  itau: 'Itaú',
  santander: 'Santander',
  nubank: 'Nubank',
  inter: 'Banco Inter',
  pagseguro: 'PagSeguro',
  mercado_pago: 'Mercado Pago',
  picpay: 'PicPay',
} as const;

export type AccountProvider = keyof typeof ACCOUNT_PROVIDERS;

// ------------------------------------
// Currency
// ------------------------------------

export const CURRENCIES = {
  BRL: 'Real Brasileiro',
  USD: 'Dólar Americano',
  EUR: 'Euro',
  GBP: 'Libra Esterlina',
  JPY: 'Iene Japonês',
  AUD: 'Dólar Australiano',
  CAD: 'Dólar Canadense',
  CHF: 'Franco Suíço',
  CNY: 'Yuan Chinês',
  SEK: 'Coroa Sueca',
} as const;

export type Currency = keyof typeof CURRENCIES;

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  CNY: '¥',
  SEK: 'kr',
};

// ------------------------------------
// Transaction Type
// ------------------------------------

export const TRANSACTION_TYPES = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
} as const;

export type TransactionType = keyof typeof TRANSACTION_TYPES;

// ------------------------------------
// Transaction Category
// ------------------------------------

export const TRANSACTION_CATEGORIES = {
  // Receitas
  salary: 'Salário',
  freelance: 'Freelance',
  investment_return: 'Retorno de Investimento',
  gift: 'Presente',
  other_income: 'Outra Receita',
  // Despesas
  food: 'Alimentação',
  transport: 'Transporte',
  housing: 'Moradia',
  utilities: 'Utilidades',
  healthcare: 'Saúde',
  education: 'Educação',
  entertainment: 'Entretenimento',
  shopping: 'Compras',
  subscription: 'Assinatura',
  tax: 'Imposto',
  other_expense: 'Outra Despesa',
} as const;

export type TransactionCategory = keyof typeof TRANSACTION_CATEGORIES;

// ------------------------------------
// Task Status
// ------------------------------------

export const TASK_STATUSES = {
  new_request: 'Nova Solicitação',
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  paused: 'Pausada',
  completed: 'Concluída',
  archived: 'Arquivada',
} as const;

export type TaskStatus = keyof typeof TASK_STATUSES;

// ------------------------------------
// Task Priority
// ------------------------------------

export const TASK_PRIORITIES = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
} as const;

export type TaskPriority = keyof typeof TASK_PRIORITIES;

// ------------------------------------
// Project Status
// ------------------------------------

export const PROJECT_STATUSES = {
  planning: 'Planejamento',
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  archived: 'Arquivado',
} as const;

export type ProjectStatus = keyof typeof PROJECT_STATUSES;

// ------------------------------------
// Recurring Type
// ------------------------------------

export const RECURRING_TYPES = {
  transaction: 'Transação',
  task: 'Tarefa',
} as const;

export type RecurringType = keyof typeof RECURRING_TYPES;

// ------------------------------------
// Recurring Frequency
// ------------------------------------

export const RECURRING_FREQUENCIES = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
} as const;

export type RecurringFrequency = keyof typeof RECURRING_FREQUENCIES;

// ------------------------------------
// Recurring Status
// ------------------------------------

export const RECURRING_STATUSES = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
} as const;

export type RecurringStatus = keyof typeof RECURRING_STATUSES;

// ------------------------------------
// Tag Type
// ------------------------------------

export const TAG_TYPES = {
  transaction: 'Transação',
  task: 'Tarefa',
  project: 'Projeto',
} as const;

export type TagType = keyof typeof TAG_TYPES;

// ------------------------------------
// Budget Period
// ------------------------------------

export const BUDGET_PERIODS = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
} as const;

export type BudgetPeriod = keyof typeof BUDGET_PERIODS;
