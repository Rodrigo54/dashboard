import { describe, expect, it } from 'vitest';
import { inferCadence } from './cadence';

describe('inferCadence', () => {
  it('reconhece cadência mensal', () => {
    const dates = [
      new Date(2024, 0, 5),
      new Date(2024, 1, 5),
      new Date(2024, 2, 5),
      new Date(2024, 3, 5),
    ];
    expect(inferCadence(dates)).toEqual({ frequency: 'monthly', interval: 1 });
  });

  it('reconhece cadência semanal', () => {
    const dates = [
      new Date(2024, 0, 1),
      new Date(2024, 0, 8),
      new Date(2024, 0, 15),
      new Date(2024, 0, 22),
    ];
    expect(inferCadence(dates)).toEqual({ frequency: 'weekly', interval: 1 });
  });

  it('reconhece cadência quinzenal', () => {
    const dates = [
      new Date(2024, 0, 1),
      new Date(2024, 0, 15),
      new Date(2024, 0, 29),
      new Date(2024, 1, 12),
    ];
    expect(inferCadence(dates)).toEqual({ frequency: 'weekly', interval: 2 });
  });

  it('devolve null quando os intervalos são irregulares', () => {
    const dates = [
      new Date(2024, 0, 1),
      new Date(2024, 0, 4),
      new Date(2024, 2, 15),
      new Date(2024, 2, 17),
    ];
    expect(inferCadence(dates)).toBeNull();
  });

  it('devolve null com menos de 3 ocorrências', () => {
    expect(inferCadence([new Date(2024, 0, 1), new Date(2024, 1, 1)])).toBeNull();
  });
});
