import { EventEmitter } from 'events';
import { IPCEvent, Options, IpcURL, DEFAULT_SCHEME } from './common';
import ndjsonStream from 'can-ndjson-stream';

export interface RendererOptions extends Options {
  name?: string;
  streamFromMain?: boolean;
}

const defaultOptions: RendererOptions = {
  scheme: DEFAULT_SCHEME,
};

export class IpcRenderer extends EventEmitter {
  private readonly options: RendererOptions;

  constructor(options: Partial<RendererOptions> = {}) {
    super();

    this.options = Object.assign(defaultOptions, options);

    if (this.options.streamFromMain) {
      this.streamFromMain();
    }
  }

  public send(channel: string, ...value: unknown[]): void {
    const msg: IPCEvent = { channel, values: value };

    fetch(`${this.options.scheme}://${IpcURL.SendToMain}`, {
      method: 'POST',
      body: JSON.stringify(msg),
    });
  }

  public async invoke<T>(channel: string, ...value: unknown[]): Promise<T> {
    const msg: IPCEvent = { channel, values: value };

    return fetch(`${this.options.scheme}://${IpcURL.InvokeOnMain}`, {
      method: 'POST',
      body: JSON.stringify(msg),
    }).then((response) => response.json());
  }

  private async streamFromMain(): Promise<void> {
    fetch(`${this.options.scheme}://${IpcURL.StreamFromMain}`)
      .then((response) => ndjsonStream<IPCEvent>(response.body))
      .then((jsonStream) => {
        const reader = jsonStream.getReader();

        const handleRead = async () => {
          const result = await reader.read();

          if (result.done) {
            this.streamFromMain();
          } else {
            this.emit(result.value.channel, ...result.value.values);
            handleRead();
          }
        };

        handleRead();
      });
  }
}
