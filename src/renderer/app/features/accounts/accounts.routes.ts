import { Routes } from '@angular/router';
import AccountsList from './pages/accounts-list/accounts-list';
import { AccountsForm } from './pages/accounts-form/accounts-form';

const routes: Routes = [
  {
    path: '',
    component: AccountsList,
  },
  {
    path: 'new',
    component: AccountsForm,
    data: { breadcrumb: 'Nova Conta' },
  },
  {
    path: 'edit/:accountId',
    component: AccountsForm,
    data: { breadcrumb: 'Editar Conta' },
  },
];

export default routes;
