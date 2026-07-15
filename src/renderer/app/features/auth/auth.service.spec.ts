import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, type PublicUser } from './auth.service';

const invoke = vi.fn();
vi.mock('@/core/ipc/invoke', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

function publicUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: 'user-1',
    name: 'Rodrigo',
    email: 'rodrigo@example.com',
    avatar: null,
    role: 'user',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    invoke.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('listUsers chama auth:listUsers e devolve o resultado', async () => {
    invoke.mockResolvedValue([publicUser()]);
    const users = await service.listUsers();
    expect(invoke).toHaveBeenCalledWith('auth:listUsers');
    expect(users).toEqual([publicUser()]);
  });

  it('loadCurrentUser chama auth:me e grava currentUser', async () => {
    invoke.mockResolvedValue(publicUser());
    const user = await service.loadCurrentUser();
    expect(invoke).toHaveBeenCalledWith('auth:me');
    expect(user).toEqual(publicUser());
    expect(service.currentUser()).toEqual(publicUser());
  });

  it('loadCurrentUser grava null quando não há sessão', async () => {
    invoke.mockResolvedValue(null);
    const user = await service.loadCurrentUser();
    expect(user).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('login chama auth:login com email/senha e grava currentUser', async () => {
    invoke.mockResolvedValue(publicUser());
    await service.login('rodrigo@example.com', 'senha123');
    expect(invoke).toHaveBeenCalledWith('auth:login', {
      email: 'rodrigo@example.com',
      password: 'senha123',
    });
    expect(service.currentUser()).toEqual(publicUser());
    expect(service.isAuthenticated()).toBe(true);
  });

  it('login propaga o erro do invoke sem envelope customizado', async () => {
    invoke.mockRejectedValue(new Error('Credenciais inválidas'));
    await expect(service.login('rodrigo@example.com', 'errada')).rejects.toThrow(
      'Credenciais inválidas',
    );
    expect(service.currentUser()).toBeNull();
  });

  it('register chama auth:register e grava currentUser', async () => {
    invoke.mockResolvedValue(publicUser());
    await service.register('Rodrigo', 'rodrigo@example.com', 'senha123');
    expect(invoke).toHaveBeenCalledWith('auth:register', {
      name: 'Rodrigo',
      email: 'rodrigo@example.com',
      password: 'senha123',
    });
    expect(service.currentUser()).toEqual(publicUser());
  });

  it('logout chama auth:logout e limpa currentUser', async () => {
    invoke.mockResolvedValue(undefined);
    service.currentUser.set(publicUser());
    await service.logout();
    expect(invoke).toHaveBeenCalledWith('auth:logout');
    expect(service.currentUser()).toBeNull();
  });
});
