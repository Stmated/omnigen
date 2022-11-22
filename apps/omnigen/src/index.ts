import {Omnigen} from './Omnigen.js';
import {OmnigenOptions} from './OmnigenOptions.js';
import {LoggerFactory} from '@omnigen/core-log';
import * as url from 'node:url';
import {IncomingOptions} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

logger.info(process.argv);

/**
 * Entry-point of all generation.
 *
 * Usage is:
 *
 * import omnigen from '@omnigen/omnigen'
 * omnigen({...});
 *
 * @param opt The incoming options
 */
export default async function run(opt: IncomingOptions<OmnigenOptions>) {

  const options = opt;

  const omnigen = new Omnigen();
  await omnigen.generate(options);

  console.log('Done');
}

let isMain = false; // require.main === module
if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    isMain = true;
  }
}

if (isMain) {

  if (process.argv.length < 1) {
    logger.error('Warning: Requires 1 argument');
    logger.error('node index.js "{options in json format}"');
    process.exit();
  }

  let optionsString = process.argv[process.argv.length - 1] || '{ }';
  if (optionsString.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)) {
    const buff = Buffer.from(optionsString, 'base64');
    optionsString = buff.toString('ascii');
  }

  logger.info('Parsing: ' + optionsString);
  // const givenArgOptions = options || '{}';
  run(JSON.parse(optionsString) as OmnigenOptions)
    .then(() => {
      logger.info(`Done`);
    });
} else {
  logger.info(`Start generating by calling the default exported function with your options`);
}
