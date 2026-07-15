import { AuthService } from '@renderer/app/features/auth/auth.service';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameLayout } from './frame-layout';
import { WindowControlsService } from './window-controls.service';

@Component({ selector: 'app-stub-page', template: '' })
class StubPage {}

class FakeAuthService {
  readonly currentUser = signal(null);
  logout = vi.fn().mockResolvedValue(undefined);
}

/** Evita instanciar o WindowControlsService real (lê `window.electron.window`, ausente no jsdom). */
class FakeWindowControlsService {
  readonly maximized = signal(false);
  minimize = vi.fn();
  maximizeToggle = vi.fn();
  close = vi.fn();
}

describe('FrameLayout — altura do banner do shell', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FrameLayout>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameLayout],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'home', component: StubPage, data: { breadcrumb: 'Home' } }]),
        { provide: AuthService, useValue: new FakeAuthService() },
        { provide: WindowControlsService, useValue: new FakeWindowControlsService() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FrameLayout);
    fixture.detectChanges();
  });

  it('declara --frame-bg-height e --frame-breadcrumb-height num único lugar (o wrapper)', () => {
    const wrapper = fixture.nativeElement.querySelector('[hlmSidebarWrapper]');
    const style = wrapper?.getAttribute('style') ?? '';
    expect(style).toContain('--frame-bg-height: 192px');
    expect(style).toContain('--frame-breadcrumb-height: 64px');
  });

  it('a barra de breadcrumb lê a variável, não um h-16 hardcoded', () => {
    const bar = fixture.nativeElement.querySelector('main')?.firstElementChild as HTMLElement;
    expect(bar.className).toContain('h-(--frame-breadcrumb-height)');
    expect(bar.className).not.toContain('h-16');
  });
});
