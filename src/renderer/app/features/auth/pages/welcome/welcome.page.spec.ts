import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, type PublicUser } from '../../auth.service';
import WelcomePage from './welcome.page';

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

@Component({ selector: 'app-stub-login', template: '' })
class StubLogin {}

class FakeAuthService {
  readonly selectedProfile = signal<PublicUser | null>(null);
  loadCurrentUser = vi.fn().mockResolvedValue(null);
  listUsers = vi.fn().mockResolvedValue([publicUser()]);
}

describe('WelcomePage', () => {
  let fakeAuth: FakeAuthService;
  let router: Router;
  let fixture: ReturnType<typeof TestBed.createComponent<WelcomePage>>;

  beforeEach(async () => {
    fakeAuth = new FakeAuthService();
    await TestBed.configureTestingModule({
      imports: [WelcomePage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'auth/login', component: StubLogin }]),
        { provide: AuthService, useValue: fakeAuth },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(WelcomePage);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('ao escolher um perfil, grava selectedProfile no AuthService e navega pro login', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('Rodrigo'),
    ) as HTMLButtonElement;

    button.click();
    await fixture.whenStable();

    expect(fakeAuth.selectedProfile()).toMatchObject({ id: 'user-1', name: 'Rodrigo' });
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });
});
