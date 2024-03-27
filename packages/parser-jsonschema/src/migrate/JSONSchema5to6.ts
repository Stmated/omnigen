import {AnyDoc, Migrator} from './Migrator.ts';
import {ObjectVisitor} from '@omnigen/core-json';

export class JSONSchema5to6 implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    const visitor = new ObjectVisitor(args => {

      if (args.obj && typeof args.obj === 'object' && args.path[args.path.length - 1] !== 'properties') {

        if (args.path.length > 1 && '$schema' in args.obj) {
          return false;
        }

        if ('id' in args.obj) {
          if (typeof args.obj.id !== 'string') {
            throw new Error(`json-schema-migrate: schema id must be string`);
          }

          args.obj.$id = args.obj.id;
          delete args.obj.id;
        }

        if ('exclusiveMinimum' in args.obj && 'minimum' in args.obj && args.obj.exclusiveMinimum === true) {
          args.obj.exclusiveMinimum = args.obj.minimum;
          delete args.obj.minimum;
        }

        if ('exclusiveMaximum' in args.obj && 'maximum' in args.obj && args.obj.exclusiveMaximum === true) {
          args.obj.exclusiveMaximum = args.obj.maximum;
          delete args.obj.maximum;
        }
      }

      return true;

      // if (args.path[args.path.length - 1] === 'id') {
      //   if ((version === 'draft2019' || version === 'draft2020') && id.includes('#')) {
      //     const [$id, $anchor, ...rest] = id.split('#');
      //     if (rest.length > 0) {
      //       throw new Error(`json-schema-migrate: invalid schema id ${id}`);
      //     }
      //     if ($id) dataSchema.$id = $id;
      //     if ($anchor && $anchor !== '/') dataSchema.$anchor = $anchor;
      //   } else {
      //     dataSchema.$id = id;
      //   }
      // }
    });

    visitor.visit(doc);
    doc.$schema = 'http://json-schema.org/draft-06/schema';
    return doc;
  }
}
