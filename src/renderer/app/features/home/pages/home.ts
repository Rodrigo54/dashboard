import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { HomeService } from '../home.service';

@Component({
  imports: [],
  selector: 'app-home',
  template: `
    <!-- Main content -->
    <div class="flex flex-col">
      <!-- Header -->
      <header class="bg-card flex items-center justify-between p-4 shadow">
        <h1 class="text-2xl font-bold ">Dashboard</h1>
        <div class="flex items-center space-x-4">
          <span class="">{{ userName() }}</span>
          <span class=" px-3 py-1 rounded-full text-xs">Admin</span>
          <button class="" (click)="logout()" aria-label="Logout">
            <span class="material-icons">logout</span>
          </button>
        </div>
      </header>

      <div class="bg-card p-6 rounded shadow mt-6">
        <div class=" mb-2">{{ message() }}</div>
      </div>

      <!-- Cards de métricas -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 py-6">
        <div class="bg-card rounded shadow p-4">
          <div class="">Total Visitors</div>
          <div class="text-2xl font-bold ">4564</div>
          <a href="#" class="text-sm">View data +</a>
        </div>
        <div class="bg-card rounded shadow p-4">
          <div class="">Revenue</div>
          <div class="text-2xl font-bold ">$7564</div>
          <a href="#" class="text-sm">View data +</a>
        </div>
        <div class="bg-card rounded shadow p-4">
          <div class="">Orders</div>
          <div class="text-2xl font-bold ">7891+</div>
          <a href="#" class="text-sm">View data +</a>
        </div>
        <div class="bg-card rounded shadow p-4">
          <div class="">Items</div>
          <div class="text-2xl font-bold ">486</div>
          <a href="#" class="text-sm">View data +</a>
        </div>
      </div>

      <!-- Gráficos e estatísticas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
        <div class="bg-card rounded shadow p-4">
          <div class=" mb-2">Statistics</div>
          <div class="h-32 flex items-center justify-center">[Gráfico de barras]</div>
        </div>
        <div class="bg-card rounded shadow p-4">
          <div class=" mb-2">Stock</div>
          <div class="h-32 flex items-center justify-center">[Gráfico circular]</div>
        </div>
        <div class="bg-card rounded shadow p-4">
          <div class=" mb-2">Total Revenue</div>
          <div class="h-32 flex items-center justify-center">[Gráfico de linha]</div>
        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class HomePage {
  #authClient = inject(AuthService);
  #router = inject(Router);
  #homeService = inject(HomeService);
  data = this.#homeService.userProfile;

  message = computed(() => {
    const profile = this.data.value();
    return profile ? `Welcome back, ${profile.name}!` : 'Loading user profile...';
  });

  userName = computed(() => {
    const profile = this.data.value();
    return profile ? profile.name : 'Guest';
  });

  async logout() {
    await this.#authClient.logout();
    console.log('Logout successful');
    this.#router.navigate(['/login']);
  }

}
