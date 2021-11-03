import { IpcRenderer } from "./ipc/renderer";

const ipc = new IpcRenderer();

ipc.on("metrics", console.log);

setInterval(async () => {
  ipc.send(
    "media-devices",
    await window.navigator.mediaDevices.enumerateDevices()
  );
}, 5000);
