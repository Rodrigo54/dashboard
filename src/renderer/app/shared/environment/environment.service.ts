import { computed, Injectable, resource } from '@angular/core';
import type { PublicEnvironment } from '@shared/types';

import { invoke } from '@/shared/ipc/invoke';

/**
 * Expõe ao renderer o environment ativo (environments/*.yml), carregado uma
 * única vez via IPC. O processo main já remove o bloco `security` antes de
 * atravessar a ponte.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  readonly environment = resource<PublicEnvironment, unknown>({
    loader: () => invoke<PublicEnvironment>('environment:read'),
  });

  readonly appName = computed(() => this.environment.value()?.app.name ?? '');
  readonly appVersion = computed(() => this.environment.value()?.app.version ?? '');
  readonly isDevelopment = computed(
    () => this.environment.value()?.app.environment === 'development',
  );
  readonly logLevel = computed(() => this.environment.value()?.logging.level ?? 'info');
}
