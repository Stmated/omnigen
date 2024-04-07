import pointer, {JsonObject} from 'json-pointer';
import {ObjectVisitor} from '../visitor';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export type ExpandUsingValue = string | number | object;
export type ExpandUsing = ExpandUsingValue[];

export type JsonPointerPath = string;

export type ExpandNeedleMeta = { prefix?: string, suffix?: string };
export type ExpandNeedleObj = { path: JsonPointerPath } & ExpandNeedleMeta;

export type ExpandNeedle = JsonPointerPath | ExpandNeedleObj;
export type ExpandFind = ExpandNeedle | ExpandNeedle[];

export interface ExpandOptions {
  using: ExpandUsing;
  at: ExpandFind;
  inline?: boolean;
}

/**
 * Takes a JSON object and expands it according to a custom method of describing the expansion.
 *
 * This is not an existing standard. There is no RFC. But is something that I find very useful for things like
 */
export class JsonExpander {

  public expand(original: JsonObject): typeof original {

    const visitor = new ObjectVisitor(args => {

      const current = args.obj;
      if (!(current && typeof current === 'object')) {
        return true;
      }

      const optionKey = '$expand' in current
        ? '$expand'
        : 'x-expand' in current
          ? 'x-expand'
          : undefined;

      if (!optionKey) {
        return true;
      }

      const options = current[optionKey] as ExpandOptions;
      delete current[optionKey];

      logger.info(`Expanding '${args.path.join('/')}' with ${JSON.stringify(options.using)}`);

      const parentPath = `/${args.path.slice(0, -1).join('/')}`;
      const parent = pointer.get(original, parentPath);
      if (!Array.isArray(parent)) {
        throw new Error(`Parent of the expansion object must be an array`);
      }

      const ourIndex = parent.indexOf(current);
      if (ourIndex === -1) {
        throw new Error(`Could not find the expansion object (${current}) inside array ${parent}`);
      }
      parent.splice(ourIndex, 1);

      const findArray = Array.isArray(options.at) ? options.at : [options.at];

      for (const source of options.using) {

        const clone = (JSON.parse(JSON.stringify(current)));

        for (const findItem of findArray) {

          if (typeof findItem === 'string') {

            logger.silent(`Setting '${findItem}' to '${source}`);
            pointer.set(clone, findItem, source);
          } else {

            const changedValue = `${findItem.prefix ?? ''}${source}${findItem.suffix ?? ''}`;
            logger.silent(`Setting '${findItem.path}' to '${changedValue}`);

            pointer.set(clone, findItem.path, changedValue);
          }
        }

        logger.debug(`Adding expanded object for '${source}' to: ${parentPath}`);
        parent.push(clone);
      }

      return true;
    });

    visitor.visit(original);

    return original;
  }
}
