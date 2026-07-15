import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthService, type PublicUser } from '../../auth.service';
import LoginPage from './login.page';

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
  readonly selectedProfile = signal<PublicUser | null>(publicUser());
  login = vi.fn().mockResolvedValue(undefined);
}

function setup() {
  const fakeAuth = new FakeAuthService();
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: fakeAuth },
    ],
  });
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  return { fixture, fakeAuth };
}

describe('LoginPage — exibição do perfil selecionado', () => {
  it('mostra nome e email do perfil escolhido na welcome', () => {
    const { fixture } = setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Rodrigo');
    expect(el.textContent).toContain('rodrigo@example.com');
  });

  it('sem avatar, mostra as iniciais no fallback', () => {
    const { fixture } = setup();
    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('R');
  });
});

describe('LoginPage — submit', () => {
  let router: Router;

  it('chama auth.login com o email do perfil e a senha digitada, depois navega pro home', async () => {
    const { fixture, fakeAuth } = setup();
    router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const input = fixture.nativeElement.querySelector('input[type="password"]') as HTMLInputElement;
    input.value = 'senha123';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(fakeAuth.login).toHaveBeenCalledWith('rodrigo@example.com', 'senha123');
    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
  });

  it('exibe a mensagem de erro quando o login falha', async () => {
    const { fixture, fakeAuth } = setup();
    fakeAuth.login.mockRejectedValue(new Error('Senha incorreta'));

    const input = fixture.nativeElement.querySelector('input[type="password"]') as HTMLInputElement;
    input.value = 'senha-errada';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Senha incorreta');
  });
});
