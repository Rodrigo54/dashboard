import { Routes } from '@angular/router';
import TransactionsList from './pages/transactions-list/transactions-list';
import { TransactionsForm } from './pages/transactions-form/transactions-form';
import TransactionsView from './pages/transactions-view/transactions-view';

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
    path: 'edit/:transactionId',
    component: TransactionsForm,
    data: { breadcrumb: 'Editar Transação' },
  },
  {
    path: 'view/:transactionId',
    component: TransactionsView,
    data: { breadcrumb: 'Transação' },
  },
];

export default routes;
