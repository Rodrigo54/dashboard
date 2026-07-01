import { Service } from '../../core/service.decorator';

/** Um fragmento de texto posicionado extraído do PDF. */
export interface TextChunk {
  readonly str: string;
  /** Coordenada x da esquerda do fragmento (unidades do PDF). */
  readonly x: number;
  /** Coordenada y da baseline (cresce para cima). */
  readonly y: number;
  readonly width: number;
}

/** Uma linha visual reconstruída: fragmentos com o mesmo y, ordenados por x. */
export interface TextLine {
  readonly page: number;
  readonly y: number;
  readonly chunks: readonly TextChunk[];
  /** Texto da linha com os fragmentos unidos por espaço. */
  readonly text: string;
}

/** Tolerância em unidades de PDF para considerar dois fragmentos na mesma linha. */
const Y_TOLERANCE = 3;

// Tipagem mínima do subconjunto do pdf.js que usamos — evita acoplar aos tipos
// completos da lib (pesados) e mantém o import dinâmico simples.
interface PdfTextItem {
  str: string;
  width: number;
  transform: number[];
}
interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
}
interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
}

/**
 * Extrai texto posicionado de um PDF com o pdf.js (build legacy, sem worker,
 * roda no processo main). Reconstrói as linhas visuais a partir das coordenadas
 * x/y dos fragmentos — a base sobre a qual os parsers por banco recortam as
 * colunas da tabela do extrato.
 */
@Service('pdf-extraction')
export class PdfExtractionService {
  /** Extrai todas as linhas visuais de todas as páginas, em ordem de leitura. */
  async extractLines(data: Uint8Array): Promise<TextLine[]> {
    const doc = await this.loadDocument(data);
    const lines: TextLine[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const { items } = await page.getTextContent();
      lines.push(...this.groupIntoLines(pageNumber, items));
    }
    return lines;
  }

  private async loadDocument(data: Uint8Array): Promise<PdfDocument> {
    // Import dinâmico do build legacy: só carrega o pdf.js quando há importação,
    // e resolve de node_modules (dep externalizada).
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({
      data,
      // Sem renderização — evita canvas/fontes e mantém a extração leve.
      disableFontFace: true,
    });
    return (await task.promise) as unknown as PdfDocument;
  }

  /** Agrupa os fragmentos de uma página em linhas por proximidade de y. */
  private groupIntoLines(page: number, items: readonly PdfTextItem[]): TextLine[] {
    const chunks = items
      .filter((item) => item.str.trim().length > 0)
      .map<TextChunk>((item) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
      }))
      .sort((a, b) => b.y - a.y || a.x - b.x);

    const rows: TextChunk[][] = [];
    for (const chunk of chunks) {
      const row = rows.at(-1);
      if (row && Math.abs(row[0].y - chunk.y) <= Y_TOLERANCE) row.push(chunk);
      else rows.push([chunk]);
    }

    return rows.map((row) => {
      const ordered = [...row].sort((a, b) => a.x - b.x);
      return {
        page,
        y: ordered[0].y,
        chunks: ordered,
        text: ordered
          .map((c) => c.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      };
    });
  }
}
