import { IpcRenderer } from '../../renderer';

const ipc = new IpcRenderer({ streamFromMain: true });

ipc.on('metrics', console.log);

setInterval(async () => {
  ipc.send(
    'media-devices',
    await window.navigator.mediaDevices.enumerateDevices()
  );
}, 5000);

setTimeout(async () => {
  console.log(await ipc.invoke('gpu-info'));
}, 3000);
