import { EventEmitter } from 'events';
import { session, Session, app, protocol, ProtocolResponse } from 'electron';
import { DEFAULT_SCHEME, IPCEvent, IpcURL, Options } from './common';
import { Readable } from 'stream';

export interface MainOptions extends Options {
  getSessions: () => Session[];
  warnNoRenderers: boolean;
}

const defaultOptions: MainOptions & Options = {
  scheme: DEFAULT_SCHEME,
  getSessions: () => [session.defaultSession],
  warnNoRenderers: true,
};

function createStream(output?: string | null): Readable {
  return new Readable({
    read() {
      if (typeof output === 'string') {
        this.push(output);
        this.push(null);
      } else if (output === null) {
        this.push(null);
      }
    },
  });
}

export class IpcMain extends EventEmitter {
  private readonly options: MainOptions;
  private readonly renderers = new ListeningRenderers();
  private readonly handlers: {
    [key: string]: (...args: unknown[]) => Promise<unknown>;
  } = {};

  constructor(options: Partial<MainOptions> = {}) {
    super();

    this.options = Object.assign(defaultOptions, options);
    this.setupProtocol();
  }

  public send(channel: string, ...values: unknown[]): void {
    this.sendTo(channel, undefined, ...values);
  }

  public sendTo(
    channel: string,
    destination: string | undefined,
    ...values: unknown[]
  ): void {
    if (this.options.warnNoRenderers && !this.renderers.hasListeners) {
      console.warn(`No renderers are listening!

Main to renderer messages are disabled by default. Enable in the renderer:
  const ipc = new IpcRenderer({ streamFromMain: true });

To disable this warning:
  const ipc = new IpcMain({ warnNoRenderers: false });
`);
    }

    this.renderers.dispatch({
      channel,
      source: 'main',
      destination,
      values,
    });
  }

  public handle<T>(
    channel: string,
    handler: (...args: unknown[]) => Promise<T>
  ): void {
    this.handlers[channel] = handler;
  }

  public unHandle(channel: string): void {
    delete this.handlers[channel];
  }

  private async setupProtocol(): Promise<void> {
    if (app.isReady()) {
      throw new Error("IpcMain should be created before the app 'ready' event");
    }

    const scheme = this.options.scheme;

    protocol.registerSchemesAsPrivileged([
      {
        scheme,
        privileges: { bypassCSP: true, supportFetchAPI: true },
      },
    ]);

    await app.whenReady();

    for (const sesh of this.options.getSessions()) {
      sesh.protocol.registerStreamProtocol(
        this.options.scheme,
        (request, callback) => this.handleProtocolResponse(request, callback)
      );
    }
  }

  private async handleProtocolResponse(
    request: Electron.ProtocolRequest,
    callback: (response: NodeJS.ReadableStream | ProtocolResponse) => void
  ) {
    const data = request.uploadData?.[0]?.bytes.toString();

    if (
      data &&
      request.url === `${this.options.scheme}://${IpcURL.SendToMain}`
    ) {
      const msg = JSON.parse(data) as IPCEvent;

      if (msg.destination) {
        this.renderers.dispatch(msg);
      }

      if (msg.destination === undefined || msg.destination === 'main') {
        this.emit(msg.channel, msg.source, ...msg.values);
      }

      callback({ statusCode: 200, data: createStream(null) });
    } else if (
      data &&
      request.url === `${this.options.scheme}://${IpcURL.InvokeOnMain}`
    ) {
      const msg = JSON.parse(data) as IPCEvent;
      const handler = this.handlers[msg.channel];

      if (handler) {
        const result = await handler(...msg.values);
        callback({
          statusCode: 200,
          data: createStream(JSON.stringify(result)),
        });
      } else {
        callback({ statusCode: 404, data: createStream(null) });
      }
    } else if (
      data &&
      request.url === `${this.options.scheme}://${IpcURL.StreamFromMain}`
    ) {
      const { source } = JSON.parse(data) as { source: string };

      callback({ statusCode: 200, data: this.renderers.add(source) });
    }
  }
}

class ListeningRenderers {
  private readonly renderers: [string | undefined, Readable][] = [];

  public add(source: string | undefined): Readable {
    const stream = createStream();

    stream.on('close', () => this.remove(stream));
    stream.on('error', () => this.remove(stream));

    this.renderers.push([source, stream]);

    return stream;
  }

  public get hasListeners(): boolean {
    return this.renderers.length > 0;
  }

  public dispatch(msg: IPCEvent) {
    const json = JSON.stringify(msg) + '\n';

    for (const [name, stream] of this.renderers) {
      if (msg.destination == undefined || msg.destination === name) {
        stream.push(json);
      }
    }
  }

  private remove(stream: Readable) {
    const index = this.renderers.findIndex(([, s]) => s === stream);
    if (index >= 0) {
      this.renderers.splice(index, 1);
    }
  }
}
