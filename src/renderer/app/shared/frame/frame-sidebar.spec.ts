import { AuthService } from '@renderer/app/features/auth/auth.service';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { FrameSidebar } from './frame-sidebar';

class FakeAuthService {
  readonly currentUser = signal(null);
}

describe('FrameSidebar — altura do banner do shell', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FrameSidebar>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameSidebar],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: new FakeAuthService() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FrameSidebar);
    fixture.detectChanges();
  });

  it('soma as duas variáveis compartilhadas, sem nenhum literal de altura', () => {
    const banner = fixture.nativeElement.querySelector('.bg-primary') as HTMLElement;
    expect(banner.className).toContain(
      'min-h-[calc(var(--frame-bg-height)+var(--frame-breadcrumb-height))]',
    );
    expect(banner.className).not.toMatch(/\d+px/);
  });
});
