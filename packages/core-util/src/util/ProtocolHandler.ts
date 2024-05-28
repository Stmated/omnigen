import * as fs from 'fs/promises';
import fetch from 'node-fetch';

export class ProtocolHandler {

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
