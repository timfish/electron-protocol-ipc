# `electron-protocol-ipc` 💫

Experimental Inter-Process Communication for Electron via a custom protocol.

With Electron's recommended configuration of `nodeIntegration: false`, a preload
script is required to expose IPC between the main and renderers. If you're also
using the recommended `contextIsolation: true`, you'll need to expose the IPC in
the preload via `contextBridge`.

Although this is relatively painless when you've done it a few times, it is not
trivial for newcomers.

If you maintain a JavaScript library that communicates between the
Electron main and renderer processes, your users need to understand the
process architecture and preload scripts to get your library working which
creates a barrier to entry,

This library supplies a similar interface to the Electron `ipcMain` and
`ipcRenderer` APIs.

## How it Works

- Sets up a privileged custom protocol
- `send` from the renderer to main is via JSON `fetch`
- `invoke` from renderer and `handle` in the main is via JSON `fetch` with JSON response
- `send` from main to renderer is handled by keeping a stream open (initiated
  from the renderer) and sending newline-delimited JSON from the main process

## 👍

- Preload no longer required
- Messages can be seen in dev tools network tab

## 👎

- Messages can be seen in dev tools network tab
- JSON serialisation not great for binary data
- `IpcMain` needs to be created before `app` `ready` event fires

`main.js`

```js
import { app } from 'electron';
import { IpcMain } from 'electron-protocol-ipc';
// If you're using a bundler, you might need to use:
import { IpcMain } from 'electron-protocol-ipc/main';

// IpcMain must be created before app 'ready' event so we can
// configure the protocol to be privileged and work with fetch
const ipc = new IpcMain();

// Subscribe to a channel
ipc.on('media-devices', (devices) => console.log(devices));

// Handle `invoke` from a renderer
ipc.handle('gpu-info', () => app.getGPUInfo('basic'));

// Regularly send metrics
setInterval(() => {
  ipc.send('metrics', app.getAppMetrics());
}, 4000);
```

`renderer.js`

```js
import { IpcRenderer } from 'electron-protocol-ipc';
// If you're using a bundler, you might need to use:
import { IpcRenderer } from 'electron-protocol-ipc/renderer';

// 'streamFromMain' enables the stream that handles send
// from the main process, this is only required if you plan to
// call ipcMain.send(...)
const ipc = new IpcRenderer({ streamFromMain: true });

// Subscribe to a channel
ipc.on('metrics', (metrics) => console.log(metrics));

// Regularly send media device list
setInterval(async () => {
  ipc.send(
    'media-devices',
    await window.navigator.mediaDevices.enumerateDevices()
  );
}, 5000);

const gupInfo = await ipc.invoke('gpu-info');
```
