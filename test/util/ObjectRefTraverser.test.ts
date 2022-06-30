import {LoggerUtils} from '..';

LoggerUtils.registerLoggerFix();

import {LoggerFactory, ObjectRefTraverser} from '@util';
import assert = require('assert');
import * as fs from 'fs/promises';

export const logger = LoggerFactory.create(__filename);

describe('Test ObjectRefTraverser', () => {

  test('Test Local', async () => {

    const obj = {
      a: {
        value: 'x'
      },
      b: {
        $ref: '#/a/value'
      }
    };

    const traverser = new ObjectRefTraverser(obj);

    logger.info('Before Traverse');
    traverser.traverse(
      obj,
      resolved => {
        logger.info(resolved, 'In Resolved');
      },
      error => {
        logger.info(error, 'In Error');
      }
    );
    logger.info('After Traverse');

    logger.info('Before Traverse');
    traverser.traverse(
      obj.b,
      resolved => {
        logger.info(resolved, 'In Resolved');
      },
      error => {
        logger.info(error, 'In Error');
      }
    );
    logger.info('After Traverse');
  });

  test('Test External', async () => {

    const obj = (await readFile('a.json')) as any;

    const traverser = new ObjectRefTraverser(obj);

    logger.info('Before Traverse');
    traverser.traverse(
      obj['c'],
      resolved => {
        logger.info(resolved, 'In Resolved');
      },
      error => {
        logger.info(error, 'In Error');
      }
    );
    logger.info('After Traverse');
  });
});

async function readFile(filename: string): Promise<unknown> {

  const buffer = await fs.readFile(`./test/examples/json/${filename}`);
  return JSON.parse(buffer.toString());
}
