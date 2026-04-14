import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/intake', pathMatch: 'full' },
  {
    path: 'intake',
    loadComponent: () =>
      import('./intake/intake.component').then((m) => m.IntakeComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  { path: '**', redirectTo: '/intake' },
];
