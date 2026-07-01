import type { RecurringFrequency } from '@shared/enums';
import { differenceInCalendarDays } from 'date-fns';

export interface Cadence {
  readonly frequency: RecurringFrequency;
  readonly interval: number;
}

interface Band extends Cadence {
  readonly min: number;
  readonly max: number;
}

// Faixas de intervalo (em dias) entre ocorrências que caracterizam cada cadência.
const BANDS: readonly Band[] = [
  { frequency: 'weekly', interval: 1, min: 5, max: 10 },
  { frequency: 'weekly', interval: 2, min: 11, max: 18 },
  { frequency: 'monthly', interval: 1, min: 26, max: 35 },
  { frequency: 'monthly', interval: 2, min: 56, max: 66 },
  { frequency: 'yearly', interval: 1, min: 350, max: 380 },
];

/** Proporção mínima dos intervalos que precisa cair na faixa escolhida. */
const CONSISTENCY = 0.6;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Infere a cadência de uma sequência de datas (ordenada) a partir dos intervalos
 * entre ocorrências. Requer ao menos 3 datas e que a maioria dos intervalos caia
 * na mesma faixa; devolve `null` quando não há padrão claro.
 */
export function inferCadence(dates: readonly Date[]): Cadence | null {
  if (dates.length < 3) return null;

  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    gaps.push(differenceInCalendarDays(dates[i], dates[i - 1]));
  }

  const band = BANDS.find((b) => median(gaps) >= b.min && median(gaps) <= b.max);
  if (!band) return null;

  const within = gaps.filter((g) => g >= band.min && g <= band.max).length;
  if (within / gaps.length < CONSISTENCY) return null;

  return { frequency: band.frequency, interval: band.interval };
}
