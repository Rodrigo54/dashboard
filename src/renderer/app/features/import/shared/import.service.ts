import { invoke } from '@/core/ipc/invoke';
import { Injectable } from '@angular/core';
import type { ImportCommitItem, ImportCommitResult, ImportPreview } from '@shared/types';

/** Cliente de IPC da importação de extratos (canal `import:*`). */
@Injectable({ providedIn: 'root' })
export class ImportService {
  /** Extrai/parseia/enriquece o PDF e devolve o staging para revisão. */
  preview(fileName: string, data: Uint8Array, accountHintId?: string): Promise<ImportPreview> {
    return invoke<ImportPreview>('import:preview', { fileName, data, accountHintId });
  }

  /** Grava os itens confirmados (inserção de novos + reconciliação de casados). */
  commit(items: ImportCommitItem[]): Promise<ImportCommitResult> {
    return invoke<ImportCommitResult>('import:commit', { items });
  }
}
