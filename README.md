# 💫 `electron-protocol-ipc`

Experimental Inter-Process Communication for Electron via a custom protocol with
similar features to the Electron `ipcMain` and `ipcRenderer` APIs.

With Electron's recommended configuration of `nodeIntegration: false`, a preload
script is required to expose IPC between the main and renderer precesses. If
you're also using the recommended `contextIsolation: true`, you'll need to
expose the IPC in the preload via `contextBridge`.

Although this is relatively painless when you've done it a few times, it is not
trivial for newcomers.

If you maintain a JavaScript library that communicates between the
Electron main and renderer processes, your users need to understand the
process architecture and preload scripts to get your library working which
creates a barrier to entry,

## How it Works

- Sets up a privileged custom protocol
- `send` from the renderer to main is via JSON `fetch`
- `invoke` from renderer and `handle` in the main is via JSON `fetch` with JSON response
- `send` from main to renderer is handled by keeping a stream open (initiated
  from the renderer) and sending newline-delimited JSON from the main process
- Forward messages to renderers when `destination` is set

## 👍

- Preload no longer required
- Renderer code is just regular browser code
- Messages can be seen in dev tools network tab

## 👎

- Messages can be seen in dev tools network tab
- JSON serialisation not great for binary data
- `IpcMain` needs to be created before `app` `ready` event fires

## Example

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
ipc.on('media-devices', (sender, devices) => console.log(sender, devices));

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
ipc.on('metrics', (sender, metrics) => console.log(sender, metrics));

// Regularly send media device list
setInterval(async () => {
  ipc.send(
    'media-devices',
    await window.navigator.mediaDevices.enumerateDevices()
  );
}, 5000);

const gupInfo = await ipc.invoke('gpu-info');

// Send random numbers to second renderer
// This goes via the main process
setInterval(() => {
  ipc.sendTo('random-numbers', 'second', Math.random());
}, 200);
```

`second-renderer.js`

```js
import { IpcRenderer } from 'electron-protocol-ipc';

// If we name a renderer, we can send to it from other
// renderers with sendTo
const ipc = new IpcRenderer({ name: 'second', streamFromMain: true });

// Subscribe to a channel
ipc.on('random-numbers', (_, num) => console.log('New number:', num));
```
