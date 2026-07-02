import { Routes } from '@angular/router';

const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/profile/profile.page'),
  },
];

export default profileRoutes;
