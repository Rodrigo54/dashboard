import { ZardBadgeComponent } from '@/shared/zard/components/badge/badge.component';
import { ZardTableImports } from '@/shared/zard/components/table';
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
  imports: [ZardBadgeComponent, CurrencyPipe, DatePipe, ...ZardTableImports],
  template: `
    <table z-table>
      <thead z-table-header>
        <tr z-table-row>
          <th z-table-head class="w-10 text-center!">Incluir</th>
          <th z-table-head>Data</th>
          <th z-table-head>Descrição</th>
          <th z-table-head>Categoria</th>
          <th z-table-head class="text-right!">Valor</th>
        </tr>
      </thead>
      <tbody z-table-body>
        @for (row of rows(); track row.staged.key; let i = $index) {
          <tr z-table-row [class]="row.include ? '' : 'opacity-50'">
            <td z-table-cell class="text-center">
              <input
                type="checkbox"
                class="accent-primary size-4"
                [checked]="row.include"
                (change)="toggleInclude.emit(i)"
                [attr.aria-label]="'Incluir ' + row.staged.description"
              />
            </td>
            <td z-table-cell class="tabular-nums">{{ row.staged.date | date: 'dd/MM/yyyy' }}</td>
            <td z-table-cell class="font-medium">
              <span class="flex flex-wrap items-center gap-2">
                {{ row.staged.description }}
                @if (row.staged.duplicate) {
                  <z-badge zType="destructive">Duplicado</z-badge>
                }
                @if (row.staged.reversal) {
                  <z-badge zType="secondary">Estorno</z-badge>
                }
                @if (row.staged.match; as match) {
                  <z-badge zType="outline">
                    ↔ {{ match.recurringName
                    }}{{ match.materializedTransactionId ? ' (reconciliar)' : '' }}
                  </z-badge>
                }
              </span>
            </td>
            <td z-table-cell>
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
            <td z-table-cell class="text-right tabular-nums" [class]="amountClass(row)">
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
