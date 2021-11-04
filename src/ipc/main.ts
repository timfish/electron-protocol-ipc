import { EventEmitter } from "events";
import { session, Session, app, protocol, ProtocolResponse } from "electron";
import { IPCEvent, IPCURL, Options } from "./common";
import { Readable } from "stream";

export interface MainOptions extends Options {
  getSessions: () => Session[];
}

const defaultOptions: MainOptions & Options = {
  scheme: "protocol-ipc",
  getSessions: () => [session.defaultSession],
};

export class IpcMain extends EventEmitter {
  private readonly options: MainOptions;
  private readonly rendererStreams: Readable[] = [];
  private readonly handlers: {
    [key: string]: (...args: unknown[]) => Promise<unknown>;
  } = {};

  constructor(options: Partial<MainOptions> = {}) {
    super();

    this.options = Object.assign(defaultOptions, options);
    this.setupProtocol();
  }

  public send(channel: string, ...values: unknown[]): void {
    const msg: IPCEvent = { channel, values };
    const json = JSON.stringify(msg) + "\n";

    for (const renderer of this.rendererStreams) {
      renderer.push(json);
    }
  }

  public handle<T>(
    channel: string,
    handler: (...args: unknown[]) => Promise<T>
  ): void {
    this.handlers[channel] = handler;
  }

  public removeHandle(channel: string): void {
    delete this.handlers[channel];
  }

  private removeRenderer(readable: Readable): void {
    const index = this.rendererStreams.indexOf(readable);
    if (index >= 0) {
      this.rendererStreams.splice(index, 1);
    }
  }

  private async handleProtocolResponse(
    request: Electron.ProtocolRequest,
    callback: (response: NodeJS.ReadableStream | ProtocolResponse) => void
  ) {
    const stream = new Readable({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      read() {},
    });

    if (request.url === `${this.options.scheme}://${IPCURL.SendToMain}`) {
      const json = request.uploadData?.[0]?.bytes.toString();

      if (json) {
        const msg = JSON.parse(json) as IPCEvent;
        this.emit(msg.channel, ...msg.values);
        stream.push(null);
        callback({ statusCode: 200, data: stream });
      }
    } else if (
      request.url === `${this.options.scheme}://${IPCURL.InvokeOnMain}`
    ) {
      const json = request.uploadData?.[0]?.bytes.toString();

      if (json) {
        const msg = JSON.parse(json) as IPCEvent;
        const handler = this.handlers[msg.channel];
        if (handler) {
          const result = await handler(...msg.values);
          stream.push(JSON.stringify(result));
        }
        stream.push(null);
        callback({ statusCode: 200, data: stream });
      }
    } else if (
      request.url === `${this.options.scheme}://${IPCURL.StreamFromMain}`
    ) {
      stream.on("close", () => this.removeRenderer(stream));
      stream.on("error", () => this.removeRenderer(stream));
      this.rendererStreams.push(stream);

      callback({ statusCode: 200, data: stream });
    }
  }

  private async setupProtocol(): Promise<void> {
    if (app.isReady()) {
      throw new Error("Should be created before app ready");
    }

    const scheme = this.options.scheme;

    protocol.registerSchemesAsPrivileged([
      {
        scheme,
        privileges: { bypassCSP: true, supportFetchAPI: true, secure: true },
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
}
