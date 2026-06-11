import { desc } from 'drizzle-orm';
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { initControllers } from './controllers/controllers.providers';
import { initDb, schema } from './database/database.module';

const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Mantém o renderer informado do estado de maximização para alternar o ícone.
  win.on('maximize', () => win.webContents.send('window:maximized-changed', true));
  win.on('unmaximize', () => win.webContents.send('window:maximized-changed', false));

  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (isDev && devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function registerWindowControls(): void {
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

app.whenReady().then(() => {
  const db = initDb();

  initControllers();
  registerWindowControls();

  ipcMain.handle('notes:list', () =>
    db.select().from(schema.notes).orderBy(desc(schema.notes.createdAt)).all(),
  );

  ipcMain.handle('notes:create', (_event, note: schema.NewNote) =>
    db.insert(schema.notes).values(note).returning().get(),
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
