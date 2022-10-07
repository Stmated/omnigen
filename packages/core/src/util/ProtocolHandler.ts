import * as fs from 'fs/promises';
import fetch from 'node-fetch';

export class ProtocolHandler {

  public static async get<R>(uri: string, _baseUri?: string): Promise<R> {

    const protocolIndex = uri.indexOf(':');
    const protocol = (protocolIndex != -1)
      ? uri.substring(0, protocolIndex)
      : 'file';

    switch (protocol.toLowerCase()) {
      case 'file': {
        const protocolUri = (protocolIndex != -1)
          ? uri.substring(protocolIndex + 1)
          : uri;

        return ProtocolHandler.file<R>(protocolUri);
      }
      case 'http':
      case 'https':
        return ProtocolHandler.file<R>(uri);
      default:
        throw new Error(`Do not know how to handle protocol '${protocol}`);
    }
  }

  public static http<R>(uri: string): Promise<R> {
    return fetch(uri, {method: 'GET', compress: false})
      .then(response => {
        return response.json()
          .then(obj => {
            return obj as R;
          });
      });
  }

  public static async file<R>(uri: string): Promise<R> {

    const fileBuffer = await fs.readFile(uri);
    const fileContents = fileBuffer.toString();
    return JSON.parse(fileContents) as R;
  }
}
