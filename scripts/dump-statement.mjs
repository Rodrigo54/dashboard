// Ferramenta de calibração de parsers de extrato: extrai as linhas visuais de um
// PDF com o mesmo pdf.js usado pelo app (build legacy, sem worker), reconstruindo
// linhas por proximidade de y e imprimindo as coordenadas x de cada fragmento.
// Uso: node scripts/dump-statement.mjs <caminho-do-pdf>
import { readFileSync } from 'node:fs';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Uso: node scripts/dump-statement.mjs <caminho-do-pdf>');
  process.exit(1);
}

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const data = new Uint8Array(readFileSync(pdfPath));
const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;

const Y_TOLERANCE = 3;

for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
  const page = await doc.getPage(pageNumber);
  const { items } = await page.getTextContent();
  const chunks = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5] }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const rows = [];
  for (const chunk of chunks) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0].y - chunk.y) <= Y_TOLERANCE) row.push(chunk);
    else rows.push([chunk]);
  }

  console.log(`\n===== PÁGINA ${pageNumber} =====`);
  for (const row of rows) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    const text = ordered
      .map((c) => c.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const xs = ordered.map((c) => Math.round(c.x)).join(',');
    console.log(`[x:${xs}] ${text}`);
  }
}
