import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService, type PublicUser } from './auth.service';
import { loginGuard } from './login.guard';

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

class FakeAuthService {
  readonly selectedProfile = signal<PublicUser | null>(null);
}

describe('loginGuard', () => {
  let fakeAuth: FakeAuthService;

  beforeEach(() => {
    fakeAuth = new FakeAuthService();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: fakeAuth }],
    });
  });

  it('libera a rota quando há perfil selecionado', () => {
    fakeAuth.selectedProfile.set(publicUser());
    const result = TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redireciona pro welcome quando não há perfil selecionado', () => {
    const result = TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never));
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/auth/welcome');
  });

  it('usa o Router injetado pra montar o UrlTree de redirecionamento', () => {
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never));
    expect(result).toEqual(router.createUrlTree(['/auth/welcome']));
  });
});
