import { describe, expect, it } from 'vitest';
import type { TextLine } from '../pdf-extraction.service';
import { detectParser } from './index';

/** Monta linhas sintéticas a partir de textos — a detecção só lê `text`. */
function lines(...texts: string[]): TextLine[] {
  return texts.map((text) => ({ page: 1, y: 0, chunks: [], text }));
}

describe('detectParser — fatura × extrato do mesmo banco', () => {
  it('roteia fatura do BB (Ourocard) para o parser de fatura', () => {
    const parser = detectParser(
      lines('Olá, esta é sua fatura de OUROCARD FACIL VISA', 'Lançamentos nesta fatura'),
    );
    expect(parser?.bank).toBe('bb');
    expect(parser?.kind).toBe('invoice');
  });

  it('roteia fatura do Itaú para o parser de fatura', () => {
    const parser = detectParser(
      lines('Banco Itaú S.A.', 'Total desta fatura 487,50', 'Lançamentos: compras e saques'),
    );
    expect(parser?.bank).toBe('itau');
    expect(parser?.kind).toBe('invoice');
  });

  it('roteia extrato do BB para o parser de extrato', () => {
    const parser = detectParser(lines('Banco do Brasil', 'Lote Documento Histórico'));
    expect(parser?.bank).toBe('bb');
    expect(parser?.kind).toBe('statement');
  });

  it('roteia extrato do Itaú para o parser de extrato', () => {
    const parser = detectParser(lines('Itaú Uniclass', '01/07/2026 SALDO DO DIA 100,00'));
    expect(parser?.bank).toBe('itau');
    expect(parser?.kind).toBe('statement');
  });

  it('fatura por conteúdo ganha do nome de arquivo que casaria com o extrato', () => {
    // O nome "Fatura_Itau.pdf" casa o detectFileName do extrato do Itaú (/itaú/);
    // a detecção por conteúdo da fatura tem prioridade e evita o roubo.
    const parser = detectParser(
      lines('Banco Itaú S.A.', 'Lançamentos: compras e saques', '02/06 EC *TICKETMAST 100,00'),
      'Fatura_Itau_20260710.pdf',
    );
    expect(parser?.kind).toBe('invoice');
  });

  it('extrato do Itaú com a palavra "fatura" numa linha não vira fatura', () => {
    // Um extrato pode citar "FATURA PAGA" num pagamento; sem os marcadores
    // estruturais da fatura, continua sendo extrato.
    const parser = detectParser(
      lines('Itaú Uniclass', '08/07/2026 FATURA PAGA Itaú Click M -487,50'),
    );
    expect(parser?.kind).toBe('statement');
  });

  it('devolve null quando nenhum parser reconhece o documento', () => {
    expect(detectParser(lines('documento qualquer sem banco'))).toBeNull();
  });
});
