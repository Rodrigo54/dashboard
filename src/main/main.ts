import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { initControllers } from './core/controllers.providers';
import { initServices } from './core/services.providers';
import { registerWindowControls } from './core/window-controls';
import { initDb } from './database/database.module';
import { getEnvironment } from './environment/environment.module';

const env = getEnvironment();
// O id técnico define a pasta de userData — precisa rodar antes do app ready.
app.setName(env.app.id);

const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: env.window.width,
    height: env.window.height,
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
    if (env.window.devTools) win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  initDb();

  initServices();
  initControllers();
  registerWindowControls();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
