import EventEmitter from "@foxify/events";
import { session, Session, app, protocol } from "electron";
import { IPCEvent, Options } from "./common";
import { Readable } from "stream";

export interface MainOptions extends Options {
  sessions?: () => Session[];
}

const defaultOptions: MainOptions = {
  scheme: "protocol-ipc",
  sessions: () => [session.defaultSession],
};

export class IpcMain extends EventEmitter {
  private readonly options: MainOptions;
  private readonly renderers: Readable[] = [];

  constructor(options: MainOptions = {}) {
    super();

    this.options = Object.assign(defaultOptions, options);
    this.setupProtocol();
  }

  public send(channel: string, ...value: unknown[]): void {
    const msg: IPCEvent = {
      channel,
      value,
    };

    const json = JSON.stringify(msg) + "\n";

    for (const renderer of this.renderers) {
      renderer.push(json);
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
        privileges: { bypassCSP: true, supportFetchAPI: true },
      },
    ]);

    await app.whenReady();

    for (const sesh of this.options.sessions()) {
      sesh.protocol.registerStreamProtocol(scheme, (request, callback) => {
        const stream = new Readable({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          read() {},
        });

        if (request.url === `${scheme}://to-main`) {
          const json = request.uploadData?.[0]?.bytes.toString();

          if (json) {
            const msg = JSON.parse(json) as IPCEvent;
            this.emit(msg.channel, ...msg.value);
            stream.push(null);
            callback({ statusCode: 200, data: stream });
          }
        } else if (request.url === `${scheme}://from-main`) {
          this.renderers.push(stream);

          callback({
            statusCode: 200,
            data: stream,
          });
        }
      });
    }
  }
}
