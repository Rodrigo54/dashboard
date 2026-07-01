import { BrowserWindow, ipcMain } from 'electron';

/**
 * Handlers de IPC dos controles da janela frameless (minimizar/maximizar/fechar).
 * Ficam fora do pipeline de controllers porque dependem do `BrowserWindow` de
 * origem (`event.sender`), não de um `payload` — a superfície é
 * `window.electron.window.*` exposta no preload. Registrado uma vez no bootstrap.
 */
export function registerWindowControls(): void {
  const windowFrom = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) =>
    BrowserWindow.fromWebContents(event.sender);

  ipcMain.on('window:minimize', (event) => windowFrom(event)?.minimize());

  ipcMain.on('window:maximize-toggle', (event) => {
    const win = windowFrom(event);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on('window:close', (event) => windowFrom(event)?.close());

  ipcMain.handle('window:is-maximized', (event) => windowFrom(event)?.isMaximized() ?? false);
}
