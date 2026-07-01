import { Routes } from '@angular/router';
import { RecurringForm } from './pages/recurring-form/recurring-form';
import TransactionsList from './pages/transactions-list/transactions-list';
import { TransactionsForm } from './pages/transactions-form/transactions-form';

const routes: Routes = [
  {
    path: '',
    component: TransactionsList,
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
