import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoBackService } from './go-back.service';

class FakeLocation {
  back = vi.fn();
}

class FakeRouter {
  navigate = vi.fn();
}

function setup() {
  const fakeLocation = new FakeLocation();
  const fakeRouter = new FakeRouter();
  TestBed.configureTestingModule({
    providers: [
      { provide: Location, useValue: fakeLocation },
      { provide: Router, useValue: fakeRouter },
    ],
  });
  return { service: TestBed.inject(GoBackService), fakeLocation, fakeRouter };
}

describe('GoBackService', () => {
  let originalHistoryLength: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalHistoryLength = Object.getOwnPropertyDescriptor(window.history, 'length');
  });

  afterEach(() => {
    if (originalHistoryLength) {
      Object.defineProperty(window.history, 'length', originalHistoryLength);
    }
  });

  function setHistoryLength(length: number): void {
    Object.defineProperty(window.history, 'length', { value: length, configurable: true });
  }

  it('volta pelo histórico quando há navegação anterior dentro da janela', () => {
    setHistoryLength(3);
    const { service, fakeLocation, fakeRouter } = setup();
    service.goBackOr('/transactions');
    expect(fakeLocation.back).toHaveBeenCalledTimes(1);
    expect(fakeRouter.navigate).not.toHaveBeenCalled();
  });

  it('cai para o fallback quando não há histórico de navegação na janela', () => {
    setHistoryLength(1);
    const { service, fakeLocation, fakeRouter } = setup();
    service.goBackOr('/accounts');
    expect(fakeRouter.navigate).toHaveBeenCalledWith(['/accounts']);
    expect(fakeLocation.back).not.toHaveBeenCalled();
  });
});
