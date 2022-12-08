import {Omnigen} from './Omnigen.js';
import {OmnigenOptions} from './OmnigenOptions.js';
import {LoggerFactory} from '@omnigen/core-log';
import * as url from 'node:url';
import {IncomingOptions, ParserOptions, TargetOptions} from '@omnigen/core';
import * as fs from 'fs';
import * as path from 'path';
import {ImplementationOptions} from '@omnigen/target-impl-java-http';

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
export default async function run(opt: IncomingOptions<OmnigenOptions<ParserOptions, TargetOptions, ImplementationOptions>>) {

  const omnigen = new Omnigen();
  await omnigen.generateAndWriteToFile(opt, opt);

  logger.info('Exiting Run');
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

  let directory: string | undefined = undefined;
  let optionsString = process.argv[process.argv.length - 1] || '{ }';
  if (optionsString.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)) {
    logger.info(`Reading configuration from given base64 '${optionsString}`);
    const buff = Buffer.from(optionsString, 'base64');
    optionsString = buff.toString('ascii');
  } else if (optionsString.startsWith('/') || optionsString.startsWith('.') || optionsString.startsWith('~')) {
    const absolutePath = path.resolve(optionsString);
    logger.info(`Reading configuration from file '${absolutePath}`);
    optionsString = fs.readFileSync(absolutePath, {encoding: 'utf8'}).toString();
    directory = path.dirname(absolutePath);
    // TODO: If outputBaseDir / schemaDirBase not set, then set it to the directory that contains this file
  } else {
    logger.info(`Using configuration as it was given`);
  }

  logger.info(`Parsing: ${optionsString}`);
  const options = JSON.parse(optionsString) as OmnigenOptions<ParserOptions, TargetOptions, ImplementationOptions>;

  // This should move into using the options utils -- like being able to send "fallbacks" to the main entrypoint
  if (!options.schemaDirBase) {
    logger.info(`Setting schemaDirBase to '${directory}`);
    options.schemaDirBase = directory;
  }

  if (!options.outputDirBase) {
    logger.info(`Setting outputDirBase to '${directory}`);
    options.outputDirBase = directory;
  }

  run(options)
    .then(() => {
      logger.info(`Done`);
    })
    .catch(ex => {
      logger.error(ex, `Could not finish: ${ex}`);
    });
} else {
  logger.info(`Start generating by calling the default exported function with your options`);
}
