import { contextBridge, ipcRenderer } from 'electron';

// Bridge exposed to the renderer (Angular). Keep the surface minimal and typed.
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke(channel, ...args),
});
