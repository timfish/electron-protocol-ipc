import { IpcRenderer } from '../../renderer';

const ipc = new IpcRenderer({ name: 'second', streamFromMain: true });

ipc.on('random-numbers', console.log);
