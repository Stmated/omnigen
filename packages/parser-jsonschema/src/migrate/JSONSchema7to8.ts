import {AnyDoc, Migrator} from './Migrator.ts';
import {ObjectVisitor} from '@omnigen/core-json';

export class JSONSchema7to8 implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    const visitor = new ObjectVisitor(args => {

      if (args.obj && typeof args.obj === 'object' && args.path[args.path.length - 1] !== 'properties') {

        if (args.path.length > 1 && '$schema' in args.obj) {
          return false;
        }

        if ('dependencies' in args.obj) {

          const deps = args.obj.dependencies;
          for (const prop in deps) {
            if (!Object.prototype.hasOwnProperty.call(deps, prop)) {
              continue;
            }

            const newKey = Array.isArray(deps[prop]) ? 'dependentRequired' : 'dependentSchemas';
            args.obj[newKey] ||= {};
            args.obj[newKey][prop] = deps[prop];
          }

          delete args.obj['dependencies'];
        }
      }

      return true;
    });

    visitor.visit(doc);
    doc.$schema = 'https://json-schema.org/draft/2019-09/schema';
    return doc;
  }
}
