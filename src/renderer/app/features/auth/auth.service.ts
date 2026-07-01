import { computed, Injectable, signal } from '@angular/core';

import { type IpcResponse, unwrap } from '@/core/ipc/invoke';

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

  async listUsers(): Promise<PublicUser[]> {
    const res = await window.electron.invoke<IpcResponse<PublicUser[]>>('auth:listUsers');
    return unwrap(res);
  }

  async loadCurrentUser(): Promise<PublicUser | null> {
    const res = await window.electron.invoke<IpcResponse<PublicUser | null>>('auth:me');
    const user = unwrap(res);
    this.currentUser.set(user);
    return user;
  }

  async login(email: string, password: string): Promise<void> {
    const res = await window.electron.invoke<IpcResponse<PublicUser>>('auth:login', {
      email,
      password,
    });
    if (!res.success) {
      console.error('Login failed:', res.error);
      throw new Error(res.error || 'Erro ao entrar');
    }
    this.currentUser.set(unwrap(res));
  }

  async register(name: string, email: string, password: string): Promise<void> {
    const res = await window.electron.invoke<IpcResponse<PublicUser>>('auth:register', {
      name,
      email,
      password,
    });
    this.currentUser.set(unwrap(res));
  }

  async logout(): Promise<void> {
    await window.electron.invoke('auth:logout');
    this.currentUser.set(null);
  }
}
