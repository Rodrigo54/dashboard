import { Routes } from '@angular/router';

const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth.layout'),
    children: [
      {
        path: 'welcome',
        loadComponent: () => import('./pages/welcome/welcome.page'),
      },
      {
        path: 'login',
        loadComponent: () => import('./pages/login/login.page'),
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/register/register.page'),
      },
    ],
  },
];

export default authRoutes;
