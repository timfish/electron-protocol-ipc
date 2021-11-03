export interface Options {
  scheme?: string;
}

export interface IPCEvent {
  channel: string;
  value: unknown[];
}
