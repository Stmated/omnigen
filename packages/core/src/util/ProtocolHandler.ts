import * as fs from 'fs';
// import http from 'http';
// import https from 'https';
import syncFetch from 'sync-fetch';

export class ProtocolHandler {

  public static http<R>(uri: string): Promise<R> {

    // const get = (uri.startsWith('http:') ? http : https).get;

    /*
    return fetch(uri, {method: 'GET', compress: false})
      .then(response => {
        return response.json()
          .then(obj => {
            return obj as R;
          });
      });
    */

    const response = syncFetch(uri);
    return response.json();

    // return new Promise((resolve, reject) => {
    //   get(uri, res => {
    //     if (res.statusCode !== 200) {
    //       return reject(new Error('Failed to download file'));
    //     }
    //
    //     let data = '';
    //     res.on('data', chunk => (data += chunk));
    //     res.on('end', () => resolve(JSON.parse(data) as R));
    //   }).on('error', reject);
    // });
  }

  public static file<R>(uri: string): R {

    const fileBuffer = fs.readFileSync(uri);
    const fileContents = fileBuffer.toString();
    return JSON.parse(fileContents) as R;
  }
}
