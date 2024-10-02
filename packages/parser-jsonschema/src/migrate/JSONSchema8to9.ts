import {AnyDoc, Migrator} from './Migrator';
import {ObjectVisitor} from '@omnigen/core-json';

export class JSONSchema8to9 implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    const visitor = new ObjectVisitor(args => {

      if (args.obj && typeof args.obj === 'object' && args.path[args.path.length - 1] !== 'properties') {

        if (args.path.length > 1 && '$schema' in args.obj) {
          return false;
        }

        if ('items' in args.obj) {

          if (Array.isArray(args.obj.items)) {
            args.obj.prefixItems = args.obj.items;
            if (args.obj.additionalItems !== undefined) {
              args.obj.items = args.obj.additionalItems;
              delete args.obj.additionalItems;
            } else {
              delete args.obj.items;
            }
          }
        }
      }

      return true;
    });

    visitor.visit(doc);
    doc.$schema = 'https://json-schema.org/draft/2020-12/schema';
    return doc;

  }
}
