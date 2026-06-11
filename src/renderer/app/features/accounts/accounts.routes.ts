import { Routes } from '@angular/router';
import Accounts from './accounts';
import { AccountsForm } from './accounts-form';

const routes: Routes = [
  {
    path: '',
    component: Accounts,
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
