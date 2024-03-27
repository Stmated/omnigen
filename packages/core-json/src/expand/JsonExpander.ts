import pointer, {JsonObject} from 'json-pointer';
import {ObjectVisitor} from '../visitor';

export type ExpandUsingValue = string | number | object;
export type ExpandUsing = ExpandUsingValue[];

export type JsonPointerPath = string;

export type ExpandNeedleObj = {path: JsonPointerPath, prefix?: string, suffix?: string};
export type ExpandNeedle = JsonPointerPath | ExpandNeedleObj;
export type ExpandFind = ExpandNeedle | ExpandNeedle[];

export interface ExpandOptions {
  using: ExpandUsing;
  find: ExpandFind;
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
      if (current && typeof current === 'object' && '$expand' in current) {

        const options = current.$expand as ExpandOptions;
        delete current.$expand;

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

        const findArray = Array.isArray(options.find) ? options.find : [options.find];

        for (const source of options.using) {

          const clone = {...current};

          for (const findItem of findArray) {

            if (typeof findItem === 'string') {
              pointer.set(clone, findItem, source);
            } else {

              const changedValue = `${findItem.prefix ?? ''}${source}${findItem.suffix ?? ''}`;
              pointer.set(clone, findItem.path, changedValue);
            }
          }

          parent.push(clone);
        }
      }

      return true;
    });

    visitor.visit(original);

    return original;
  }
}
