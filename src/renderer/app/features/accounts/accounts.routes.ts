import { Routes } from '@angular/router';
import Accounts from './accounts';
import { AccountsForm } from './accounts-form';

const routes: Routes = [
  {
    path: '',
    component: Accounts,
  },
  {
    path: ':accountId',
    component: AccountsForm,
  },
  {
    path: 'new',
    component: AccountsForm,
  },
];

export default routes;
