import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { desc } from 'drizzle-orm';
import { initDb, schema } from './database/database.module.js';

const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  const db = initDb();

  // IPC handlers go here — renderer calls window.electron.invoke('<channel>')
  ipcMain.handle('ping', () => 'pong');

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
