import { Injectable, resource } from '@angular/core';
import type { AppData } from '@shared/types';

import { invoke } from '@/shared/ipc/invoke';
import type { PublicUser } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class HomeService {
  readonly userProfile = resource<PublicUser | null, unknown>({
    loader: () => invoke<PublicUser | null>('auth:me'),
  });

  readonly appData = resource<AppData, unknown>({
    loader: () => invoke<AppData>('appdata:read'),
  });
}
