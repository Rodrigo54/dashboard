import { importCommitSchema, importPreviewSchema } from '@shared/schemas';
import type { ImportCommitResult, ImportPreview } from '@shared/types';
import { action, Controller } from '../../core/controller.decorator';
import { inject } from '../../core/services.providers';
import { requireCurrentUser } from '../../core/session';
import { BankParserService } from './bank-parser.service';
import { ImportCommitService } from './import-commit.service';
import { ImportPreviewService } from './import-preview.service';

/**
 * Importação de extratos em PDF. `preview` extrai/parseia/enriquece o staging
 * para revisão; `commit` grava os itens confirmados (com auto-link de
 * recorrências de alta confiança — ver `matching.ts`).
 */
@Controller('import')
export class ImportController {
  private readonly parser = inject(BankParserService);
  private readonly preview = inject(ImportPreviewService);
  private readonly commitService = inject(ImportCommitService);

  @action('preview')
  async previewStatement(rawData: unknown): Promise<ImportPreview> {
    const { fileName, data, accountHintId } = importPreviewSchema.parse(rawData);
    const user = requireCurrentUser();
    const parsed = await this.parser.parse(data, fileName);
    const preview = this.preview.build(user.id, parsed, accountHintId);
    return { ...preview, fileName };
  }

  @action('commit')
  async commit(rawData: unknown): Promise<ImportCommitResult> {
    const { items } = importCommitSchema.parse(rawData);
    const user = requireCurrentUser();
    return this.commitService.commit(user.id, items);
  }
}
