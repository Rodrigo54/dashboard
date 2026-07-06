import { HlmBadge } from '@/shared/spartan/badge';
import { HlmTableImports } from '@/shared/spartan/table';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CategoryOptions } from '@/features/transactions/shared/transactions.service';
import type { StagingRow } from '../../shared/staging-row';

/** Índice + novo valor emitidos ao editar uma célula do staging. */
export interface CellEdit {
  readonly index: number;
  readonly value: string;
}

/**
 * Tabela de revisão do staging: uma linha por movimento do extrato, com
 * inclusão e categoria editáveis, e sinalização de duplicado/estorno/
 * casamento com recorrência existente. A conta é escolhida globalmente no topo.
 */
@Component({
  selector: 'app-import-staging-table',
  imports: [HlmBadge, CurrencyPipe, DatePipe, ...HlmTableImports],
  template: `
    <table hlmTable>
      <thead hlmTHead>
        <tr hlmTr>
          <th hlmTh class="w-10 text-center!">Incluir</th>
          <th hlmTh>Data</th>
          <th hlmTh>Descrição</th>
          <th hlmTh>Categoria</th>
          <th hlmTh class="text-right!">Valor</th>
        </tr>
      </thead>
      <tbody hlmTBody>
        @for (row of rows(); track row.staged.key; let i = $index) {
          <tr hlmTr [class]="row.include ? '' : 'opacity-50'">
            <td hlmTd class="text-center">
              <input
                type="checkbox"
                class="accent-primary size-4"
                [checked]="row.include"
                (change)="toggleInclude.emit(i)"
                [attr.aria-label]="'Incluir ' + row.staged.description"
              />
            </td>
            <td hlmTd class="tabular-nums">{{ row.staged.date | date: 'dd/MM/yyyy' }}</td>
            <td hlmTd class="font-medium">
              <span class="flex flex-wrap items-center gap-2">
                {{ row.staged.description }}
                @if (row.staged.duplicate) {
                  <span hlmBadge variant="destructive">Duplicado</span>
                }
                @if (row.staged.reversal) {
                  <span hlmBadge variant="secondary">Estorno</span>
                }
                @if (row.staged.match; as match) {
                  <span hlmBadge variant="outline">
                    ↔ {{ match.recurringName
                    }}{{ match.materializedTransactionId ? ' (reconciliar)' : '' }}
                  </span>
                }
              </span>
            </td>
            <td hlmTd>
              <select
                class="border-border bg-background w-40 rounded-md border px-2 py-1 text-sm"
                [value]="row.category"
                (change)="changeCategory.emit({ index: i, value: value($event) })"
                aria-label="Categoria"
              >
                @for (option of categoriesFor(row); track option.value) {
                  <option [value]="option.value" [selected]="option.value === row.category">
                    {{ option.label }}
                  </option>
                }
              </select>
            </td>
            <td hlmTd class="text-right tabular-nums" [class]="amountClass(row)">
              {{ signedAmount(row) | currency: 'BRL' }}
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportStagingTable {
  readonly rows = input.required<StagingRow[]>();
  readonly categories = input<CategoryOptions>();

  readonly toggleInclude = output<number>();
  readonly changeCategory = output<CellEdit>();

  protected readonly categoryGroups = computed(() => this.categories());

  protected categoriesFor(row: StagingRow) {
    const groups = this.categories();
    return (row.staged.type === 'income' ? groups?.income : groups?.expense) ?? [];
  }

  protected value(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  protected signedAmount(row: StagingRow): string {
    return row.staged.type === 'expense' ? `-${row.staged.amount}` : row.staged.amount;
  }

  protected amountClass(row: StagingRow): string {
    return row.staged.type === 'income' ? 'text-emerald-600' : 'text-destructive';
  }
}
