import { provideEventManagerPlugins } from '@/core/event-manager-plugins';
import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';

import { provideAppRouting } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAppRouting(),
    provideEventManagerPlugins(),
    // avatar:// é servido pelo protocol handler local do main — preconnect não
    // se aplica; sem isso o NgOptimizedImage loga NG02956 para imagens priority.
    { provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'avatar://user' },
  ],
};
