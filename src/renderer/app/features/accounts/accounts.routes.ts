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
  },
  {
    path: ':accountId',
    component: AccountsForm,
  },
];

export default routes;
