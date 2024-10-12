#!/usr/bin/env node
'use strict';

import {JsonExpander} from './JsonExpander';
import {Command} from '@commander-js/extra-typings';
import * as fs from 'fs';
import * as path from 'path';
import {createDebugLogger} from '@omnigen-org/core-debug';
import pointer from 'json-pointer';

const logger = createDebugLogger('JsonExpanderCli');

const program = new Command();
const options = program
  .name('JsonExpander')

  .description('CLI for json-expander')
  .requiredOption('-i, --in <file>', 'Path to the file to expand')
  .option('-o, --out <file>', 'Path to write the new file to, if not specified it is <input>.expanded.<ext>')
  .option('-c, --compact')
  .parse(process.argv)
  .showHelpAfterError()
  .opts();

logger.info(`Options ${JSON.stringify(options)}`);
logger.info(`Reading from: ${options.in}`);

const inputObject = JSON.parse(fs.readFileSync(options.in).toString());

const fileMap = new Map<string, string>();
const expander = new JsonExpander(uri => {

  const loadFilePath = uri.absoluteFilePath;
  if (!loadFilePath) {
    return undefined;
  }

  let cachedString = fileMap.get(loadFilePath);
  if (!cachedString) {

    if (!fs.existsSync(loadFilePath)) {
      logger.warn(`Could not find file ${loadFilePath}`);
      return undefined;
    }

    logger.info(`Loading ${loadFilePath}`);
    const loadedString = fs.readFileSync(loadFilePath).toString();
    fileMap.set(loadFilePath, loadedString);

    logger.trace(`Loaded and cached ${uri.absolutePath}`);
    cachedString = loadedString;
  }

  const targetHash = uri.absoluteHash;
  const loadedObject = JSON.parse(cachedString);

  if (pointer.has(loadedObject, targetHash)) {
    logger.debug(`Fetching '${targetHash}' from '${loadFilePath}'`);
    return pointer.get(loadedObject, targetHash);
  } else {
    logger.debug(`Could not find '${targetHash}' from '${loadFilePath}'`);
    return undefined;
  }
});

const inputFileInfo = path.parse(options.in);
const outputObject = expander.expand(inputObject, inputFileInfo.dir);

function writeString(str: string): void {


  const outputPath = options.out ?? path.resolve(inputFileInfo.dir, `${inputFileInfo.name}.expanded.${inputFileInfo.ext}`);

  logger.info(`Writing to: ${outputPath}`);
  fs.writeFileSync(outputPath, str);
  logger.info(`Done expanding`);
}

if (options.compact) {

  import('json-stringify-pretty-compact')
    .then(lib => {
      writeString(lib.default(outputObject, {indent: 2, maxLength: 120}));
    })
    .catch(err => {
      logger.warn(`${err} -- You must include a dependency to 'json-stringify-pretty-compact' to get proper pretty compact files. Will fallback on JSON.stringify`);
      writeString(JSON.stringify(outputObject, undefined, 2));
    });
} else {
  writeString(JSON.stringify(outputObject, undefined, 2));
}
