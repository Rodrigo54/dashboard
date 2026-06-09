// Types for the bridge exposed by src/main/preload.ts
import type { Channels } from '../shared/ipc-channels';

export interface ElectronApi {
  invoke<T = unknown>(channel: Channels, ...args: unknown[]): Promise<T>;
}

declare global {
  interface Window {
    electron: ElectronApi;
  }
}

export {};
