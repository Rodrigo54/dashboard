import { z } from 'zod';

// ============================================================
// Helpers compartilhados pelos schemas de entidade
// ============================================================

export function keysOf<T extends Record<string, unknown>>(obj: T) {
  return Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];
}

export const uuidSchema = z.uuid({ message: 'ID deve ser um UUID válido', version: 'v7' });
export const guid = () => uuidSchema;

// Valores decimais (dinheiro, horas) trafegam e persistem como string decimal
// canônica — ponto decimal, sem separador de milhar, até 2 casas (ex.: "1234.56",
// "-45.90") — armazenada como TEXT no SQLite para preservar a precisão (mesma
// estratégia de accounts.balance; é o formato emitido pelo app-currency-input).
export const decimalSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Valor decimal inválido (use o formato "1234.56")');

/** Decimal estritamente positivo (> 0) — ex.: amount, targetAmount. */
export const positiveDecimalSchema = decimalSchema.refine(
  (value) => Number(value) > 0,
  'Valor deve ser maior que zero',
);

/** Decimal não-negativo (>= 0) — ex.: acumuladores como spent/currentAmount. */
export const nonNegativeDecimalSchema = decimalSchema.refine(
  (value) => Number(value) >= 0,
  'Valor não pode ser negativo',
);

export const timestamps = {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
};

// ============================================================
// Shared / Common
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
