import { invoke } from '@/core/ipc/invoke';
import { Injectable, resource } from '@angular/core';
import type { EnumOption } from '@shared/enums';
import type { CreateRecurring, Recurring, UpdateRecurring, UUID } from '@shared/types';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  /** Regras de recorrência de transações; recarregue após mutações. */
  readonly rules = resource<Recurring[], unknown>({
    loader: () => invoke<Recurring[]>('recurring:list'),
  });

  readonly frequencies = resource<EnumOption[], unknown>({
    loader: () => invoke<EnumOption[]>('recurring:frequencies'),
  });

  findOne(id: UUID): Promise<Recurring> {
    return invoke<Recurring>('recurring:read', id);
  }

  create(data: CreateRecurring): Promise<Recurring> {
    return invoke<Recurring>('recurring:create', data);
  }

  update(id: UUID, data: UpdateRecurring): Promise<Recurring> {
    return invoke<Recurring>('recurring:update', { id, data });
  }

  pause(id: UUID): Promise<Recurring> {
    return invoke<Recurring>('recurring:pause', id);
  }

  resume(id: UUID): Promise<Recurring> {
    return invoke<Recurring>('recurring:resume', id);
  }

  /** Antecipa a ocorrência prevista até `date`, criando a(s) transação(ões). */
  materialize(id: UUID, date: Date): Promise<{ id: UUID; created: number }> {
    return invoke<{ id: UUID; created: number }>('recurring:materialize', { id, date });
  }

  delete(id: UUID): Promise<{ id: UUID }> {
    return invoke<{ id: UUID }>('recurring:remove', id);
  }
}
