import { Routes } from '@angular/router';
import { loginGuard } from './login.guard';

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
        canActivate: [loginGuard],
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/register/register.page'),
      },
    ],
  },
];

export default authRoutes;
