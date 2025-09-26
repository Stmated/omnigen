import express from 'express';
import * as YAML from 'yaml';
import http from 'http';

const app = express();
const port = 3000;

let server: http.Server | undefined = undefined;

const schema = {
  type: 'object',
  properties: {
    prop: {
      type: 'string',
    },
  },
} as const;

function closeOnFinish(res: express.Response) {
  res.on('finish', () => {
    console.log(`Finished responding with the schema, will close down server`);
    if (server) {
      server.close(() => {
        console.log(`Exiting schema file server process`);
        process.exit(0);
      });
    }
  });
}

app.get('/schema-1.json', (req, res) => {
  res.send(JSON.stringify(schema));
  closeOnFinish(res);
});

app.get('/schema-1.yaml', (req, res) => {
  res.send(YAML.stringify(schema));
  closeOnFinish(res);
});

server = app.listen(port, () => {
  console.log(`Schema Web Server listening on port ${port}`);
});

console.log(`Called listen`);
