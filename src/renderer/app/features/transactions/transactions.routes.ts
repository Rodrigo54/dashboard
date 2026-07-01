import { Routes } from '@angular/router';
import { RecurringForm } from './recurring-form';
import Transactions from './transactions';
import { TransactionsForm } from './transactions-form';

const routes: Routes = [
  {
    path: '',
    component: Transactions,
  },
  {
    path: 'new',
    component: TransactionsForm,
  },
  // Antes de `:transactionId` para não ser engolida pelo parâmetro.
  {
    path: 'recurring/:recurringId',
    component: RecurringForm,
  },
  {
    path: ':transactionId',
    component: TransactionsForm,
  },
];

export default routes;
