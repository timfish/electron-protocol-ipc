export const DEFAULT_SCHEME = 'electron-protocol-ipc';

export interface Options {
  scheme: string;
}

export interface IPCEvent {
  channel: string;
  source: string | undefined;
  destination: string | undefined;
  values: unknown[];
}

export enum IpcURL {
  StreamFromMain = 'stream-from-main',
  SendToMain = 'send-to-main',
  InvokeOnMain = 'invoke-on-main',
}
