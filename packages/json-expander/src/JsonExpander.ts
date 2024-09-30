import pointer from 'json-pointer';
import JsonUri from './JsonUri.ts';
import {pascalCase} from 'change-case';
import {createDebugLogger} from '@omnigen/core-debug';

const logger = createDebugLogger(import.meta.url);

/**
 * Default value if non other set is 'exists'
 */
type ExpandAttemptPredicate = 'path';
type ExpandAttemptResult = 'value' | 'ref' | 'clone';
type TransformKinds = 'lowercase' | 'uppercase' | 'pascal';

type ExpandUsingItem = string | number | object | Array<string | number | object>;
type ExpandUsing = Array<ExpandUsingItem>;
type ExpandAs = { with: string, transform?: TransformKinds | undefined };
type ExpandAtItem = { path: string, with?: string | ExpandAttempt[] | [...ExpandAttempt[], string], transform?: TransformKinds | undefined };
type ExpandAt = Array<ExpandAtItem>;
type ExpandAttempt = { attempt: string, as?: ExpandAttemptPredicate, giving?: ExpandAttemptResult, transform?: TransformKinds };

export type ExpandConfig = {
  using: ExpandUsing;
  at: ExpandAt;
  /**
   * Alter the key that will be used for the cloned item, as key in its parent object.
   */
  as?: ExpandAs;
  inline?: boolean;
};

type Loader = (path: JsonUri) => unknown | undefined;
type Replacer = (v: string) => unknown;
type Cleaner = () => void;

/**
 * Takes a JSON object and expands it according to a custom method of describing the expansion.
 *
 * This is not an existing standard. There is no RFC. But is something that I find very useful for things like
 */
export class JsonExpander {

  private readonly _loader: Loader | undefined;

  constructor(loader?: Loader) {
    this._loader = loader;
  }

  public expand(v: any, workingPath?: string): typeof v {

    if (workingPath) {
      logger.info(`Expanding using working path '${workingPath}'`);
    }

    const cleaners: Array<Cleaner> = [];
    this.recurse(v, JsonUri.EMPTY.resolve(workingPath ?? ''), [], cleaners);

    for (let i = cleaners.length - 1; i >= 0; i--) {
      cleaners[i]();
    }

    return v;
  }

  private recurse(v: any, path: JsonUri, ancestors: Array<Record<string, any> | Array<any>>, cleaners: Array<Cleaner>): typeof v {

    if (Array.isArray(v)) {
      try {
        ancestors.push(v);
        for (let i = 0; i < v.length; i++) {
          this.recurse(v[i], path.pushHash(`${i}`), ancestors, cleaners);
        }
      } finally {
        ancestors.pop();
      }
    } else if (v && typeof v === 'object') {

      if ('x-expand' in v) {

        const options = v['x-expand'] as unknown as ExpandConfig;
        delete v['x-expand'];

        logger.info(`Expanding '${path.toString()}' with ${JSON.stringify(options.using)}`);

        if (ancestors.length === 0) {
          throw new Error(`x-expand must not be the root`);
        }

        const root = ancestors[0];

        const parent = ancestors[ancestors.length - 1];
        if (Array.isArray(parent)) {
          const ourIndex = parent.indexOf(v);
          if (ourIndex === -1) {
            throw new Error(`Could not find the expansion object (${v}) inside array ${parent}`);
          }
          cleaners.push(() => parent.splice(ourIndex, 1));

        } else {

          const lastKey = path.tail;

          if (lastKey) {

            // Also remove the object which contains the expansion from its parent.
            // It will be re-added in its expanded form as different keys.
            cleaners.push(() => delete parent[lastKey]);
          }
        }

        for (const source of options.using) {

          const clone = JSON.parse(JSON.stringify(v));

          for (const findItem of options.at) {

            // noinspection SuspiciousTypeOfGuard
            if (typeof findItem === 'string') {
              throw new Error(`The items inside array 'at' must not be a simple string (${findItem}), it should be a {"path": "${findItem}"}-object`);
            }

            if (Array.isArray(findItem.with)) {

              for (let i = 0; i < findItem.with.length; i++) {

                const attempt = findItem.with[i];
                let found = false;
                if (typeof attempt === 'string') {

                  found = this.updateItem({path: findItem.path, with: attempt, transform: findItem.transform}, source, clone);

                } else {
                  const replacer: Replacer = newPath => {

                    if (attempt.as === undefined || attempt.as === 'path') {
                      const resolvedPath = path.resolve(newPath);
                      logger.silent(`ResolvedPath: ${JSON.stringify(resolvedPath)}`);

                      if (!path.isSameFile(resolvedPath)) {

                        if (!this._loader) {
                          throw new Error(`Need to have been given a loader to be able to read other files`);
                        }

                        return this._loader(resolvedPath);
                      } else {
                        return pointer.get(root, resolvedPath.absoluteHash);
                      }
                    } else {
                      throw new Error(`Unknown attempt type '${attempt.as}'`);
                    }
                  };

                  found = this.updateItem({path: findItem.path, with: attempt.attempt, transform: attempt.transform ?? findItem.transform}, source, clone, replacer, attempt.giving);
                }

                if (found) {
                  logger.silent(`Found as attempt ${i} for ${findItem.path}`);
                  break;
                } else {
                  const attemptString = JSON.stringify(attempt);
                  logger.silent(`Could not find '${attemptString}' for ${findItem.path}`);
                }
              }

            } else {
              this.updateItem(findItem, source, clone);
            }
          }

          if (Array.isArray(parent)) {

            logger.trace(`Adding expanded object for '${source}' to: ${path.parentHash?.toString()}`);
            parent.push(clone);
          } else {

            let targetKey: ExpandUsingItem;
            if (options.as) {
              targetKey = this.transform(source, options.as);
            } else {
              targetKey = source;
            }

            if (typeof targetKey === 'string' || typeof targetKey === 'number') {

              logger.trace(`Adding expanded object for '${source}' to: ${path.parentHash?.toString()} as ${targetKey}`);
              parent[targetKey] = clone;
            } else {
              throw new Error(`Expansion target key must be a string or number`);
            }
          }
        }

      } else {

        try {
          ancestors.push(v);
          for (const key in v) {
            if (!Object.prototype.hasOwnProperty.call(v, key)) {
              continue;
            }

            this.recurse(v[key], path.pushHash(key), ancestors, cleaners);
          }
        } finally {
          ancestors.pop();
        }
      }
    }

    return v;
  }

  private updateItem(findItem: ExpandAtItem, source: ExpandUsingItem, clone: any, replacer?: Replacer, attemptResult?: ExpandAttemptResult): boolean {

    let changedValue = this.transform(source, {...findItem, with: findItem.with ?? ''}) as unknown;

    if (replacer && typeof changedValue === 'string') {
      const res = replacer(changedValue);
      if (res === undefined) {
        return false;
      } else if (attemptResult === 'clone') {
        changedValue = JSON.parse(JSON.stringify(res));
      } else if (attemptResult === 'ref') {
        changedValue = res;
      }
    }

    logger.silent(`Setting '${findItem.path}' to '${changedValue}`);
    pointer.set(clone, findItem.path, changedValue);
    return true;
  }

  private transform(source: ExpandUsingItem, meta: ExpandAs | ExpandAtItem): ExpandUsingItem {

    if (meta.with) {

      if (typeof meta.with === 'string') {
        const array = Array.isArray(source) ? source : [source];
        source = meta.with.replace(/\$(\d)/g, (_, group) => {
          const sourceIndex = Math.min(Number.parseInt(group), array.length - 1);
          let sourceValue = array[sourceIndex];

          // We possibly translate the source; we do not want to transform the whole `meta.with` string.
          if (typeof sourceValue === 'string' && meta.transform) {
            sourceValue = this.doTransform(sourceValue, meta.transform);
          }

          return sourceValue;
        });
      } else {

        // TODO: Add support for this
        throw new Error(`Not yet supported to have an array inside 'with' for this context`);
      }
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
      return pascalCase(value);
    } else {
      throw new Error(`Invalid expansion transform ${transform}`);
    }
  }
}
