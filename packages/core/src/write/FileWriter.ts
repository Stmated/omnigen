import {AbstractWriter} from './AbstractWriter.js';
import {RenderedCompilationUnit} from '../ast/index.js';
import fs from 'fs/promises';
import path from 'path';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class FileWriter extends AbstractWriter {

  private readonly _outputBaseDir: string;

  constructor(outputBaseDir: string) {
    super();
    this._outputBaseDir = outputBaseDir;
  }

  async write(rcu: RenderedCompilationUnit): Promise<void> {

    const targetPath = path.resolve(this._outputBaseDir, ...rcu.directories, rcu.fileName);

    const directoryPath = path.dirname(targetPath);

    try {
      const created = await fs.mkdir(directoryPath, {recursive: true});
      if (created) {
        logger.info(`Created directory ${created}`);
      }
    } catch (ex) {
      logger.debug(ex, `Failed directory creation of '${directoryPath}', but will try to continue`);
    }

    try {
      logger.info(`Writing '${rcu.name}' to '${targetPath}'`);
      await fs.writeFile(targetPath, rcu.content, {encoding: 'utf8'});
      logger.debug(`Wrote '${rcu.name}' to '${targetPath}'`);
    } catch (ex) {
      logger.error(ex, `Could not write file ${targetPath}`);
      return Promise.reject(ex);
    }
  }
}
