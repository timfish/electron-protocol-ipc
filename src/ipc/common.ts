export interface Options {
  scheme: string;
}

export interface IPCEvent {
  channel: string;
  values: unknown[];
}

export enum IPCURL {
  StreamFromMain = "stream-from-main",
  SendToMain = "send-to-main",
  InvokeOnMain = "invoke-on-main",
}
