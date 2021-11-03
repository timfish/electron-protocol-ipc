import { app, BrowserWindow } from "electron";
import { IpcMain } from "./ipc/main";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

const ipc = new IpcMain();

ipc.on("media-devices", console.log);

setInterval(() => {
  ipc.send("metrics", app.getAppMetrics());
}, 5000);

if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
