import * as fs from 'fs/promises';
import http from 'http';
import https from 'https';

export class ProtocolHandler {

  public static http<R>(uri: string): Promise<R> {

    const get = (uri.startsWith('http:') ? http : https).get;

    // lib.get(uri);

    /*
    return fetch(uri, {method: 'GET', compress: false})
      .then(response => {
        return response.json()
          .then(obj => {
            return obj as R;
          });
      });
    */

    return new Promise((resolve, reject) => {
      get(uri, res => {
        if (res.statusCode !== 200) {
          return reject(new Error('Failed to download file'));
        }

        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data) as R));
      }).on('error', reject);
    });
  }

  public static async file<R>(uri: string): Promise<R> {

    const fileBuffer = await fs.readFile(uri);
    const fileContents = fileBuffer.toString();
    return JSON.parse(fileContents) as R;
  }
}
