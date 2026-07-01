import type { TextLine } from '../pdf-extraction.service';
import { bbParser } from './bb.parser';
import { itauParser } from './itau.parser';
import type { BankParser } from './statement-parser';

export type { BankParser, BankParseResult } from './statement-parser';

/** Parsers registrados, na ordem de tentativa de detecção. */
export const BANK_PARSERS: readonly BankParser[] = [bbParser, itauParser];

/**
 * Escolhe o parser pelo nome do arquivo quando ele já identifica o banco
 * (sinal mais forte e livre de ambiguidade — ex.: um comprovante que cita outro
 * banco no beneficiário); senão, recorre ao texto completo do PDF.
 */
export function detectParser(lines: readonly TextLine[], fileName?: string): BankParser | null {
  if (fileName) {
    const byName = BANK_PARSERS.find((parser) => parser.detectFileName(fileName));
    if (byName) return byName;
  }
  const fullText = lines.map((l) => l.text).join('\n');
  return BANK_PARSERS.find((parser) => parser.detect(fullText)) ?? null;
}
