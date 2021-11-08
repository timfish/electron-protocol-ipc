import { app, BrowserWindow } from 'electron';
import { IpcMain } from '../../main';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const SECOND_WINDOW_WEBPACK_ENTRY: string;

const ipc = new IpcMain();

ipc.on('media-devices', console.log);

ipc.handle('gpu-info', () => app.getGPUInfo('basic'));

setInterval(() => {
  ipc.send('metrics', app.getAppMetrics());
}, 4000);

if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (url: string): void => {
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
  });

  mainWindow.loadURL(url);
  mainWindow.webContents.openDevTools();
};

app.on('ready', () => {
  createWindow(MAIN_WINDOW_WEBPACK_ENTRY);
  createWindow(SECOND_WINDOW_WEBPACK_ENTRY);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(MAIN_WINDOW_WEBPACK_ENTRY);
  }
});
