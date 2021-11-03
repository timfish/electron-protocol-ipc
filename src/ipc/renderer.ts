import EventEmitter from "@foxify/events";
import { IPCEvent, Options } from "./common";
import ndjsonStream from "can-ndjson-stream";

export interface RendererOptions extends Options {
  name?: string;
}

const defaultOptions: RendererOptions = {
  scheme: "protocol-ipc",
};

export class IpcRenderer extends EventEmitter {
  private readonly options: RendererOptions;

  constructor(options: RendererOptions = {}) {
    super();

    this.options = Object.assign(defaultOptions, options);
    this.connectToMain();
  }

  public send(channel: string, ...value: unknown[]): void {
    const msg: IPCEvent = { channel, value };

    fetch(`${this.options.scheme}://to-main`, {
      method: "POST",
      body: JSON.stringify(msg),
    });
  }

  private connectToMain(): void {
    fetch(`${this.options.scheme}://from-main`)
      .then((response) => ndjsonStream<IPCEvent>(response.body))
      .then(async (jsonStream) => {
        const reader = jsonStream.getReader();

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const result = await reader.read();

          if (result.done) {
            return;
          }

          this.emit(result.value.channel, ...result.value.value);
        }
      });
  }
}
