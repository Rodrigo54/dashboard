import {
  TRANSACTION_CATEGORIES_BY_TYPE,
  type TransactionCategory,
  type TransactionType,
} from '@shared/enums';
import { Service } from '../../core/service.decorator';

/**
 * Garante o escopo atual de transações (sem `transfer`) e a coerência
 * categoria <-> tipo. Usado tanto no CRUD de transações quanto na validação
 * do template das recorrências.
 */
@Service('transaction-rules')
export class TransactionRulesService {
  assertSupported(type: TransactionType, category: TransactionCategory): void {
    if (type === 'transfer') throw new Error('Transferências ainda não são suportadas');
    if (!(category in TRANSACTION_CATEGORIES_BY_TYPE[type])) {
      throw new Error('Categoria não corresponde ao tipo da transação');
    }
  }
}
