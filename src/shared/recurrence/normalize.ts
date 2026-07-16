import { distance } from 'fastest-levenshtein';

/**
 * Normaliza uma descrição para comparação/agrupamento: sem acento, maiúsculas,
 * só alfanumérico e espaço simples. Compartilhada pela deduplicação do import,
 * pelo fingerprint e pelo matching de recorrências (`matching.ts`).
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Similaridade 0..1 entre duas descrições. Contido (uma dentro da outra) vale
 * 1; caso contrário usa a distância de Levenshtein normalizada pelo maior
 * comprimento. Entradas já são normalizadas internamente.
 */
export function similarityText(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na.includes(nb) || nb.includes(na)) return 1;
  return 1 - distance(na, nb) / Math.max(na.length, nb.length);
}
