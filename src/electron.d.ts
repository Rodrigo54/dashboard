// Types for the bridge exposed by electron/preload.ts
export interface ElectronApi {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
}

declare global {
  interface Window {
    electron: ElectronApi;
  }
}

export {};
