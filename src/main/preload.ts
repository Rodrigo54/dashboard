import { contextBridge, ipcRenderer } from 'electron';
import type { Channels } from '@shared/ipc-channels';

// Bridge exposed to the renderer (Angular). Keep the surface minimal and typed.
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: Channels, ...args: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke(channel, ...args),

  // Controles da janela frameless (minimizar / maximizar / fechar).
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximizeToggle: (): void => ipcRenderer.send('window:maximize-toggle'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
      const listener = (_event: unknown, maximized: boolean): void => callback(maximized);
      ipcRenderer.on('window:maximized-changed', listener);
      return () => ipcRenderer.removeListener('window:maximized-changed', listener);
    },
  },
});
