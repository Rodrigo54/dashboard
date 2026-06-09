import { computed, Injectable, signal } from '@angular/core';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IpcResponse<T> {
  success: boolean;
  result: T;
  error?: string;
}

function unwrap<T>(res: IpcResponse<T>): T {
  if (!res.success) throw new Error(res.error ?? 'Erro desconhecido');
  return res.result;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<PublicUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  async checkFirstAccess(): Promise<boolean> {
    const res = await window.electron.invoke<IpcResponse<{ hasUsers: boolean }>>('auth:check');
    return !unwrap(res).hasUsers;
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
