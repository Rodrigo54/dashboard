// Roda os parsers reais do app contra um PDF de extrato e imprime o resultado
// (banco detectado, movimentos, reconciliação) para calibração.
// Uso: bun scripts/calibrate-statement.ts <caminho-do-pdf>
import { readFileSync } from 'node:fs';
import { detectParser } from '../src/main/features/import/parsers/index';
import type { TextLine } from '../src/main/features/import/pdf-extraction.service';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Uso: bun scripts/calibrate-statement.ts <caminho-do-pdf>');
  process.exit(1);
}

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const data = new Uint8Array(readFileSync(pdfPath));
const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;

const Y_TOLERANCE = 3;
const lines: TextLine[] = [];
for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
  const page = await doc.getPage(pageNumber);
  const { items } = await page.getTextContent();
  const chunks = (items as { str: string; transform: number[] }[])
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5], width: 0 }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: (typeof chunks)[] = [];
  for (const chunk of chunks) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0].y - chunk.y) <= Y_TOLERANCE) row.push(chunk);
    else rows.push([chunk]);
  }
  for (const row of rows) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    lines.push({
      page: pageNumber,
      y: ordered[0].y,
      chunks: ordered,
      text: ordered
        .map((c) => c.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    });
  }
}

const parser = detectParser(lines);
if (!parser) {
  console.error('Nenhum parser reconheceu o documento.');
  process.exit(1);
}
const result = parser.parse(lines);
console.log(`Banco detectado: ${parser.bank}`);
console.log(`Movimentos: ${result.lines.length}`);
console.log(`Reconciliação:`, result.reconciliation);
console.log('---');
for (const m of result.lines) {
  const sign = m.type === 'income' ? '+' : '-';
  console.log(
    `${m.date.toISOString().slice(0, 10)}  ${sign}${m.amount.padStart(10)}  ${m.description}`,
  );
}
