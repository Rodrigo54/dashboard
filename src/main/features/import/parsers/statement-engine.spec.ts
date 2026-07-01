import { describe, expect, it } from 'vitest';
import type { TextLine } from '../pdf-extraction.service';
import { parseStatement } from './statement-engine';

/** Cria uma linha sintética — o engine só lê `text`. */
function line(text: string): TextLine {
  return { page: 1, y: 0, chunks: [], text };
}

describe('parseStatement (BB real — parênteses, colunas Lote/Documento)', () => {
  // Espelha o layout real: datas dd/mm/aaaa, sinal por sufixo (-)/(+), colunas
  // Lote+Documento antes do histórico, "Saldo do dia" sem data (ignorado) e o
  // histórico às vezes numa linha órfã anterior ao movimento.
  const lines = [
    line('29/05/2026 Saldo Anterior 100,00 (+)'),
    line('01/06/2026 13128 486301021018572 FIES JRS/AMORTIZACAO 546,89 (-)'),
    line('01/06/2026 13128 486301021018572 Estorno de Débito 546,89 (+)'),
    line('Saldo do dia 100,00 (+)'),
    line('Pagamento de DARF/RFB'),
    line('30/06/2026 13013 42151 30,00 (-)'),
    line('30/06/2026 S A L D O 70,00 (+)'),
  ];

  it('lê sinal por (-)/(+), tira Lote/Documento e usa o histórico órfão', () => {
    const { lines: movements } = parseStatement(lines, {
      fallbackYear: 2026,
      debitStrategy: 'parenthesis',
    });
    expect(movements).toEqual([
      {
        date: new Date(2026, 5, 1, 12),
        description: 'FIES JRS/AMORTIZACAO',
        amount: '546.89',
        type: 'expense',
      },
      {
        date: new Date(2026, 5, 1, 12),
        description: 'Estorno de Débito',
        amount: '546.89',
        type: 'income',
      },
      {
        date: new Date(2026, 5, 30, 12),
        description: 'Pagamento de DARF/RFB',
        amount: '30.00',
        type: 'expense',
      },
    ]);
  });

  it('reconcilia com saldo anterior + variação = saldo final (ascendente)', () => {
    const { reconciliation } = parseStatement(lines, {
      fallbackYear: 2026,
      debitStrategy: 'parenthesis',
    });
    expect(reconciliation).toEqual({
      openingBalance: '100.00',
      closingBalance: '70.00',
      computedClosing: '70.00',
      balanced: true,
    });
  });
});

describe('parseStatement (estratégia sign — Itaú)', () => {
  const lines = [
    line('01/07 SALDO ANTERIOR 500,00'),
    line('05/07 PAGTO SALARIO 3.000,00'),
    line('10/07 COMPRA CARTAO -200,00'),
    line('31/07 SALDO DISPONIVEL 3.300,00'),
  ];

  it('usa o sinal do valor para o tipo e o ano de fallback', () => {
    const { lines: movements, reconciliation } = parseStatement(lines, {
      fallbackYear: 2026,
      debitStrategy: 'sign',
    });
    expect(movements).toEqual([
      {
        date: new Date(2026, 6, 5, 12),
        description: 'PAGTO SALARIO',
        amount: '3000.00',
        type: 'income',
      },
      {
        date: new Date(2026, 6, 10, 12),
        description: 'COMPRA CARTAO',
        amount: '200.00',
        type: 'expense',
      },
    ]);
    expect(reconciliation.balanced).toBe(true);
    expect(reconciliation.computedClosing).toBe('3300.00');
  });
});

describe('parseStatement (Itaú real — mais recente primeiro, SALDO DO DIA)', () => {
  // Espelha o layout real: datas dd/mm/aaaa, ordem descendente, saldo diário em
  // linhas próprias e sem "saldo anterior".
  const lines = [
    line('01/07/2026 SALDO DO DIA 3.448,17'),
    line('01/07/2026 PAG BOLETO EQUATORIAL MARANHAO DISTRIBU -635,72'),
    line('30/06/2026 PAGTO SALARIO 4.076,97'),
    line('30/06/2026 SALDO DO DIA 4.083,89'),
    line('26/06/2026 PIX QRS EBANX26/06 -51,65'),
    line('26/06/2026 SALDO DO DIA 6,92'),
    // Baseline mais antigo: saldo de um dia sem movimentos incluídos.
    line('25/06/2026 SALDO DO DIA 58,57'),
  ];

  it('extrai movimentos ignorando as linhas de saldo diário', () => {
    const { lines: movements } = parseStatement(lines, {
      fallbackYear: 2026,
      debitStrategy: 'sign',
    });
    expect(movements).toEqual([
      {
        date: new Date(2026, 6, 1, 12),
        description: 'PAG BOLETO EQUATORIAL MARANHAO DISTRIBU',
        amount: '635.72',
        type: 'expense',
      },
      {
        date: new Date(2026, 5, 30, 12),
        description: 'PAGTO SALARIO',
        amount: '4076.97',
        type: 'income',
      },
      {
        date: new Date(2026, 5, 26, 12),
        description: 'PIX QRS EBANX26/06',
        amount: '51.65',
        type: 'expense',
      },
    ]);
  });

  it('reconcilia em ordem descendente (saldo mais antigo + variação = mais recente)', () => {
    const { reconciliation } = parseStatement(lines, {
      fallbackYear: 2026,
      debitStrategy: 'sign',
    });
    // 58,57 (mais antigo) + (-51,65 + 4.076,97 - 635,72) = 3.448,17 (mais recente).
    expect(reconciliation).toEqual({
      openingBalance: '58.57',
      closingBalance: '3448.17',
      computedClosing: '3448.17',
      balanced: true,
    });
  });
});

describe('parseStatement (sem linhas de saldo)', () => {
  it('marca a reconciliação como não conferida', () => {
    const { reconciliation } = parseStatement([line('05/07/2024 X 10,00 (-)')], {
      fallbackYear: 2024,
      debitStrategy: 'parenthesis',
    });
    expect(reconciliation.balanced).toBe(false);
  });
});
