import { Routes } from '@angular/router';
import DetectedRecurrences from './pages/detected-recurrences/detected-recurrences';
import ImportStatement from './pages/import-statement/import-statement';

const routes: Routes = [
  {
    path: '',
    component: ImportStatement,
  },
  {
    path: 'recurrences',
    component: DetectedRecurrences,
    data: { breadcrumb: 'Recorrências Detectadas' },
  },
];

export default routes;
