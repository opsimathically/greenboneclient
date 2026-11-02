import net from 'node:net';

import type {
  connection_settings_t,
  gmp_transport_i
} from '../types/greenboneclient_types';
import {
  ExtractXmlDocumentFromBuffer,
  GetRootTagNameFromXml,
  ParseXmlDocument
} from '../utils/greenboneclient_xml_utils';

export class GmpSocketTransport implements gmp_transport_i {
  private socket: net.Socket | null = null;
  private read_buffer = '';
  private request_lock: Promise<void> = Promise.resolve();

  async connect(params: {
    connection: connection_settings_t;
    timeout_ms?: number;
  }): Promise<void> {
    if (this.socket && !this.socket.destroyed) {
      await this.disconnect();
    }

    const timeout_ms = params.timeout_ms ?? params.connection.timeout_ms ?? 15000;

    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection(
        params.connection.type === 'tcp'
          ? {
              host: params.connection.host,
              port: params.connection.tcp_port
            }
          : {
              path: params.connection.socket_path
            }
      );

      const timeout_handler = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Socket connect timeout after ${timeout_ms}ms.`));
      }, timeout_ms);

      const cleanup = (): void => {
        clearTimeout(timeout_handler);
        socket.off('error', on_error);
      };

      const on_error = (error: Error): void => {
        cleanup();
        reject(error);
      };

      socket.once('error', on_error);
      socket.once('connect', () => {
        cleanup();
        socket.setNoDelay(true);
        socket.setKeepAlive(true);
        this.socket = socket;
        this.read_buffer = '';
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.socket) {
      return;
    }

    const socket_to_close = this.socket;
    this.socket = null;
    this.read_buffer = '';

    await new Promise<void>((resolve) => {
      const resolve_once = (): void => {
        socket_to_close.off('close', resolve_once);
        resolve();
      };

      socket_to_close.once('close', resolve_once);

      if (socket_to_close.destroyed) {
        resolve_once();
        return;
      }

      socket_to_close.end(() => {
        socket_to_close.destroy();
      });

      setTimeout(() => {
        if (!socket_to_close.destroyed) {
          socket_to_close.destroy();
        }

        resolve_once();
      }, 500);
    });
  }

  isConnected(): boolean {
    return Boolean(this.socket && !this.socket.destroyed);
  }

  async sendRaw(params: {
    xml: string;
    timeout_ms?: number;
    expected_root_tag?: string;
  }): Promise<string> {
    return this.runLocked(async () => {
      this.ensureConnected();
      const timeout_ms = params.timeout_ms ?? 20000;

      await this.writeXml({ xml: params.xml });

      return this.readNextResponse({
        timeout_ms,
        expected_root_tag: params.expected_root_tag
      });
    });
  }

  private async runLocked<T>(callback: () => Promise<T>): Promise<T> {
    const run_promise = this.request_lock.then(async () => callback());

    this.request_lock = run_promise.then(
      () => undefined,
      () => undefined
    );

    return run_promise;
  }

  private ensureConnected(): void {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('Socket is not connected.');
    }
  }

  private async writeXml(params: { xml: string }): Promise<void> {
    this.ensureConnected();

    const normalized_xml = params.xml.trim();

    await new Promise<void>((resolve, reject) => {
      this.socket!.write(
        `${normalized_xml}\n`,
        'utf8',
        (error: Error | null | undefined) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
        }
      );
    });
  }

  private async readNextResponse(params: {
    timeout_ms: number;
    expected_root_tag?: string;
  }): Promise<string> {
    const started_at = Date.now();

    while (true) {
      const extracted_document = this.tryTakeXmlDocumentFromBuffer();

      if (extracted_document) {
        const root_tag = GetRootTagNameFromXml({ xml: extracted_document });

        if (!params.expected_root_tag || root_tag === params.expected_root_tag) {
          ParseXmlDocument({ xml: extracted_document });

          return extracted_document;
        }

        continue;
      }

      const elapsed_ms = Date.now() - started_at;
      const remaining_timeout_ms = params.timeout_ms - elapsed_ms;

      if (remaining_timeout_ms <= 0) {
        throw new Error(
          `Timed out waiting for XML response${params.expected_root_tag ? ` (${params.expected_root_tag})` : ''}.`
        );
      }

      await this.waitForSocketData({ timeout_ms: remaining_timeout_ms });
    }
  }

  private tryTakeXmlDocumentFromBuffer(): string | null {
    const extracted_result = ExtractXmlDocumentFromBuffer({ buffer: this.read_buffer });

    if (!extracted_result.xml_document) {
      return null;
    }

    this.read_buffer = extracted_result.remaining_buffer;

    return extracted_result.xml_document;
  }

  private async waitForSocketData(params: { timeout_ms: number }): Promise<void> {
    this.ensureConnected();

    await new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket unavailable while waiting for response data.'));
        return;
      }

      const socket = this.socket;

      const timeout_handler = setTimeout(() => {
        cleanup();
        reject(new Error(`Socket read timeout after ${params.timeout_ms}ms.`));
      }, params.timeout_ms);

      const cleanup = (): void => {
        clearTimeout(timeout_handler);
        socket.off('data', on_data);
        socket.off('error', on_error);
        socket.off('close', on_close);
      };

      const on_data = (chunk: Buffer | string): void => {
        cleanup();
        this.read_buffer += chunk.toString();
        resolve();
      };

      const on_error = (error: Error): void => {
        cleanup();
        reject(error);
      };

      const on_close = (): void => {
        cleanup();
        reject(new Error('Socket closed while waiting for response data.'));
      };

      socket.once('data', on_data);
      socket.once('error', on_error);
      socket.once('close', on_close);
    });
  }
}
