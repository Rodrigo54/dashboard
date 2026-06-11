// Types for the bridge exposed by src/main/preload.ts
import type { Channels } from '@shared/ipc-channels';

export interface WindowControlsApi {
  minimize(): void;
  maximizeToggle(): void;
  close(): void;
  isMaximized(): Promise<boolean>;
  /** Registra um callback para mudanças de maximização; retorna o disposer. */
  onMaximizedChange(callback: (maximized: boolean) => void): () => void;
}

export interface ElectronApi {
  invoke<T = unknown>(channel: Channels, payload?: unknown): Promise<T>;
  window: WindowControlsApi;
}

declare global {
  interface Window {
    electron: ElectronApi;
  }
}

export {};
