import { EventEmitter } from "events";
import { IPCEvent, Options, IPCURL } from "./common";
import ndjsonStream from "can-ndjson-stream";

export interface RendererOptions extends Options {
  name?: string;
}

const defaultOptions: RendererOptions = {
  scheme: "protocol-ipc",
};

export class IpcRenderer extends EventEmitter {
  private readonly options: RendererOptions;

  constructor(options: Partial<RendererOptions> = {}) {
    super();

    this.options = Object.assign(defaultOptions, options);
    this.connectToMain();
  }

  public send(channel: string, ...value: unknown[]): void {
    const msg: IPCEvent = { channel, values: value };

    fetch(`${this.options.scheme}://${IPCURL.SendToMain}`, {
      method: "POST",
      body: JSON.stringify(msg),
    });
  }

  public async invoke<T>(channel: string, ...value: unknown[]): Promise<T> {
    const msg: IPCEvent = { channel, values: value };

    return fetch(`${this.options.scheme}://${IPCURL.InvokeOnMain}`, {
      method: "POST",
      body: JSON.stringify(msg),
    }).then((response) => response.json());
  }

  private async connectToMain(): Promise<void> {
    fetch(`${this.options.scheme}://${IPCURL.StreamFromMain}`)
      .then((response) => ndjsonStream<IPCEvent>(response.body))
      .then((jsonStream) => {
        const reader = jsonStream.getReader();

        const handleRead = async () => {
          const result = await reader.read();

          if (result.done) {
            this.connectToMain();
          } else {
            this.emit(result.value.channel, ...result.value.values);
            handleRead();
          }
        };

        handleRead();
      });
  }
}
