import { contextBridge, ipcRenderer } from 'electron';
import type { Channels } from '@shared/ipc-channels';

// Bridge exposed to the renderer (Angular). Keep the surface minimal and typed.
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: Channels, ...args: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke(channel, ...args),
});
