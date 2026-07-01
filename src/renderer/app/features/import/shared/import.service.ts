import { invoke } from '@/core/ipc/invoke';
import { Injectable } from '@angular/core';
import type {
  ConfirmDetectedRecurrence,
  DetectedRecurrence,
  ImportCommitItem,
  ImportCommitResult,
  ImportPreview,
  Recurring,
} from '@shared/types';

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

  /** Sugere recorrências a partir do histórico acumulado. */
  detect(): Promise<DetectedRecurrence[]> {
    return invoke<DetectedRecurrence[]>('import:detect');
  }

  /** Confirma uma recorrência detectada: cria a regra e vincula as transações. */
  confirm(payload: ConfirmDetectedRecurrence): Promise<Recurring> {
    return invoke<Recurring>('import:confirm', payload);
  }
}
