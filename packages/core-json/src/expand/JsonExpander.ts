import pointer, {JsonObject} from 'json-pointer';
import {ObjectVisitor} from '../visit/ObjectVisitor';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonPathResolver} from '../resolve/JsonPathResolver.ts';
import {DocumentStore, JsonPathFetcher} from '../resolve/JsonPathFetcher.ts';
import {Case} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

export type ExpandUsingValue = string | number | object | Array<string | number | object>;

export type JsonPointerPath = string;

export type TransformKinds = 'lowercase' | 'uppercase' | 'pascal';
export type ExpandNeedleMeta = { with?: string, transform?: TransformKinds };
export type ExpandNeedleObj = ExpandNeedleWithMeta | ExpandNeedleWithAttempts;

export type ExpandNeedleWithMeta = { path: JsonPointerPath } & ExpandNeedleMeta;
export type ExpandNeedleWithAttempts = { path: JsonPointerPath } & {attempts: Array<ExpandAttempt>};
export type ExpandAttempt = JsonPointerPath | ExpandNeedleMeta;
export type ExpandNeedle = JsonPointerPath | ExpandNeedleObj;
export type ExpandFind = ExpandNeedle | ExpandNeedle[];

type Predicate = (v: string) => boolean;

export interface ExpandOptions {
  using: ExpandUsingValue[];
  at: ExpandFind;
  /**
   * Only required if the parent is an object, so we can know what key to use.
   */
  as?: ExpandNeedleMeta;
  inline?: boolean;
}

/**
 * Takes a JSON object and expands it according to a custom method of describing the expansion.
 *
 * This is not an existing standard. There is no RFC. But is something that I find very useful for things like
 */
export class JsonExpander {

  public expand(original: JsonObject, workingPath?: string | undefined): typeof original {

    if (workingPath) {
      logger.info(`Expanding using working path '${workingPath}'`);
    }

    const documentStore = new DocumentStore();
    if (workingPath) {
      documentStore.documents.set(workingPath, original);
    }

    const cleanup: (() => void)[] = [];
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

      const lastKey = args.path[args.path.length - 1];
      const parentPath = `/${args.path.slice(0, -1).join('/')}`;
      const parent = pointer.get(original, parentPath);
      if (Array.isArray(parent)) {
        const ourIndex = parent.indexOf(current);
        if (ourIndex === -1) {
          throw new Error(`Could not find the expansion object (${current}) inside array ${parent}`);
        }
        cleanup.push(() => parent.splice(ourIndex, 1));

      } else if (typeof parent === 'object' && parent) {

        // Also remove the object which contains the expansion from its parent.
        // It will be re-added in its expanded form as different keys.
        cleanup.push(() => delete parent[lastKey]);

      } else {
        throw new Error(`Parent of the expansion object must be an array or an object`);
      }

      const findArray = Array.isArray(options.at) ? options.at : [options.at];
      const attemptFailures: string[] = [];

      for (const source of options.using) {

        const clone = (JSON.parse(JSON.stringify(current)));

        for (const findItem of findArray) {

          if (typeof findItem === 'string') {
            this.updateItem(findItem, source, clone);
          } else if ('attempts' in findItem) {

            attemptFailures.length = 0;
            for (let i = 0; i < findItem.attempts.length; i++) {

              const attempt = findItem.attempts[i];
              let found = false;

              const predicate: Predicate = v => {

                const rootPath = workingPath ? JsonPathResolver.toAbsoluteUriParts(undefined, workingPath) : undefined;
                logger.silent(`RootPath: ${JSON.stringify(rootPath)}`);

                const resolvedPath = JsonPathResolver.toAbsoluteUriParts(rootPath, v);
                logger.silent(`ResolvedPath: ${JSON.stringify(resolvedPath)}`);

                const target = JsonPathFetcher.get(resolvedPath, documentStore);
                return target !== undefined;
              };

              if (typeof attempt === 'string') {
                found = this.updateItem({path: findItem.path}, attempt, clone, predicate);
              } else {
                found = this.updateItem({path: findItem.path, ...attempt}, source, clone, predicate);
              }

              if (found) {
                logger.silent(`Found as attempt ${i} for ${findItem.path}`);
                break;
              } else {
                const attemptString = JSON.stringify(attempt);
                logger.silent(`Could not find '${attemptString}' for ${findItem.path}`);
                attemptFailures.push(attemptString);
              }
            }

            if (attemptFailures.length == findItem.attempts.length) {
              throw new Error(`Could not find any of the attempts of ${attemptFailures.join(', ')}`);
            }

          } else {
            this.updateItem(findItem, source, clone);
          }
        }

        if (Array.isArray(parent)) {

          logger.trace(`Adding expanded object for '${source}' to: ${parentPath}`);
          parent.push(clone);
        } else {

          let targetKey: ExpandUsingValue;
          if (options.as) {
            targetKey = this.transform(source, options.as);
          } else {
            targetKey = source;
          }

          if (typeof targetKey === 'string' || typeof targetKey === 'number') {

            logger.trace(`Adding expanded object for '${source}' to: ${parentPath} as ${targetKey}`);
            parent[targetKey] = clone;
          } else {
            throw new Error(`Expansion target key must be a string or number`);
          }
        }
      }

      return true;
    });

    visitor.visit(original);

    for (let i = cleanup.length - 1; i >= 0; i--) {
      cleanup[i]();
    }

    return original;
  }

  private updateItem(findItem: JsonPointerPath | ExpandNeedleWithMeta, source: ExpandUsingValue, clone: any, predicate?: Predicate): boolean {

    if (typeof findItem === 'string') {
      findItem = {path: findItem};
    }

    const changedValue = this.transform(source, findItem);

    if (predicate && typeof changedValue === 'string' && !predicate(changedValue)) {
      return false;
    }

    logger.silent(`Setting '${findItem.path}' to '${changedValue}`);
    pointer.set(clone, findItem.path, changedValue);
    return true;
  }

  private transform(source: ExpandUsingValue, meta: ExpandNeedleMeta): ExpandUsingValue {

    if (meta.with) {

      const array = Array.isArray(source) ? source : [source];
      source = meta.with.replace(/\$(\d)/g, (match, group) => {
        const sourceIndex = Math.min(Number.parseInt(group), array.length - 1);
        let sourceValue = array[sourceIndex];

        // We possibly translate the source; we do not want to transform the whole `meta.with` string.
        if (typeof sourceValue === 'string' && meta.transform) {
          sourceValue = this.doTransform(sourceValue, meta.transform);
        }

        return sourceValue;
      });
    } else if (Array.isArray(source)) {

      // There is no 'with' and the source is an array. We will pick the first value.
      source = source[0];

      // And then possibly transform the whole source.
      if (typeof source === 'string' && meta.transform) {
        source = this.doTransform(source, meta.transform);
      }
    }

    return source;
  }

  private doTransform(value: string, transform: TransformKinds) {

    if (transform === 'lowercase') {
      return value.toLowerCase();
    } else if (transform === 'uppercase') {
      return value.toUpperCase();
    } else if (transform === 'pascal') {
      return Case.pascal(value);
    } else {
      throw new Error(`Invalid expansion transform ${transform}`);
    }
  }
}
