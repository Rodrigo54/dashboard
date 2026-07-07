import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { FrameBreadcrumb } from './frame-breadcrumb';

@Component({ selector: 'app-stub-page', template: '' })
class StubPage {}

describe('FrameBreadcrumb', () => {
  let router: Router;
  let fixture: ReturnType<typeof TestBed.createComponent<FrameBreadcrumb>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameBreadcrumb],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'home', component: StubPage, data: { breadcrumb: 'Home' } },
          {
            path: 'accounts',
            data: { breadcrumb: 'Contas' },
            children: [
              { path: '', component: StubPage },
              { path: 'new', component: StubPage, data: { breadcrumb: 'Nova Conta' } },
            ],
          },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(FrameBreadcrumb);
  });

  function items(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-slot="breadcrumb-item"]'));
  }

  it('mostra só Home (como texto, não link) quando navega para /home', async () => {
    await router.navigateByUrl('/home');
    fixture.detectChanges();

    const crumbs = items();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].textContent?.trim()).toBe('Home');
    expect(crumbs[0].querySelector('[data-slot="breadcrumb-page"]')).toBeTruthy();
    expect(crumbs[0].querySelector('[data-slot="breadcrumb-link"]')).toBeFalsy();
  });

  it('prependa Home como link e mostra a página atual como texto em /accounts/new', async () => {
    await router.navigateByUrl('/accounts/new');
    fixture.detectChanges();

    const crumbs = items();
    expect(crumbs.map((li) => li.textContent?.trim())).toEqual(['Home', 'Contas', 'Nova Conta']);

    const [home, accounts, novaConta] = crumbs;
    expect(home.querySelector('[data-slot="breadcrumb-link"]')).toBeTruthy();
    expect(accounts.querySelector('[data-slot="breadcrumb-link"]')).toBeTruthy();
    expect(novaConta.querySelector('[data-slot="breadcrumb-page"]')).toBeTruthy();
  });

  it('atualiza a cadeia ao navegar entre rotas', async () => {
    await router.navigateByUrl('/accounts');
    fixture.detectChanges();
    expect(items().map((li) => li.textContent?.trim())).toEqual(['Home', 'Contas']);

    await router.navigateByUrl('/accounts/new');
    fixture.detectChanges();
    expect(items().map((li) => li.textContent?.trim())).toEqual(['Home', 'Contas', 'Nova Conta']);
  });
});
