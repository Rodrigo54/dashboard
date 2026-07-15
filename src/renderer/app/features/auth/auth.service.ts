import { invoke } from '@/core/ipc/invoke';
import { computed, Injectable, signal } from '@angular/core';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<PublicUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /** Perfil escolhido no picker da welcome, pendente de senha na tela de login. */
  readonly selectedProfile = signal<PublicUser | null>(null);

  listUsers(): Promise<PublicUser[]> {
    return invoke<PublicUser[]>('auth:listUsers');
  }

  async loadCurrentUser(): Promise<PublicUser | null> {
    const user = await invoke<PublicUser | null>('auth:me');
    this.currentUser.set(user);
    return user;
  }

  async login(email: string, password: string): Promise<void> {
    const user = await invoke<PublicUser>('auth:login', { email, password });
    this.currentUser.set(user);
  }

  async register(name: string, email: string, password: string): Promise<void> {
    const user = await invoke<PublicUser>('auth:register', { name, email, password });
    this.currentUser.set(user);
  }

  async logout(): Promise<void> {
    await invoke('auth:logout');
    this.currentUser.set(null);
  }
}
