import { Routes } from '@angular/router';
import { RecurringForm } from './pages/recurring-form/recurring-form';
import RecurringList from './pages/recurring-list/recurring-list';
import RecurringMatches from './pages/recurring-matches/recurring-matches';

const routes: Routes = [
  {
    path: '',
    component: RecurringList,
  },
  {
    path: 'matches',
    component: RecurringMatches,
    data: { breadcrumb: 'Detectar Recorrências' },
  },
  {
    path: 'new',
    component: RecurringForm,
    data: { breadcrumb: 'Nova Recorrência' },
  },
  {
    path: 'edit/:recurringId',
    component: RecurringForm,
    data: { breadcrumb: 'Editar Recorrência' },
  },
];

export default routes;
