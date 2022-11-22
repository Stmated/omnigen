import {OmniType} from './OmniModel.js';
import hash from 'object-hash';
import crypto from 'crypto';
import {Naming} from './Naming.js';
import {TypeName} from './TypeName.js';

export class HashUtil {

  public static getStructuralHashOf(item: OmniType, parent?: OmniType, otherHashes?: Map<any, string>): string {

    // TODO: This is way too hacky and weird. Need to have a better solution. Custom that visits type?

    let result = hash(item, {
      algorithm: 'md5',
      encoding: 'base64',
      respectType: false,
      excludeKeys: key => {
        return key == 'parent' || key == 'owner' || key == 'debug';
      },
      replacer: v => {
        // If values exists among already hashed objects, then use that instead.
        // This way we *should* be able to avoid recursive calculations.
        const otherHash = otherHashes?.get(v);
        if (otherHash) {
          return otherHash;
        }

        if (typeof v == 'object' && 'name' in v) {

          // A hack, but should be safe for our code. Better ways should exist.
          const resolvedName = Naming.unwrap(v.name as TypeName);
          if (resolvedName && resolvedName !== v.name) {
            return {...v, name: resolvedName};
          }
        }

        return v;
      },
    });

    if (parent) {
      const parentHash = otherHashes?.get(parent);
      if (parentHash) {
        result = crypto.createHash('md5').update(result).update(parentHash).digest('base64');
      }
    }

    return result;
  }
}
