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
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (isDev && devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  const db = initDb();

  initControllers();

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
