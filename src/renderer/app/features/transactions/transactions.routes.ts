import { Routes } from '@angular/router';
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
    data: { breadcrumb: 'Nova Transação' },
  },
  {
    path: ':transactionId',
    component: TransactionsForm,
    data: { breadcrumb: 'Editar Transação' },
  },
];

export default routes;
