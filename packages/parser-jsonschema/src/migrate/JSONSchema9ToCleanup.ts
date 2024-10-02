import {AnyDoc, Migrator} from './Migrator';
import {ObjectVisitor} from '@omnigen/core-json';

export class JSONSchema9ToCleanup implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    const visitor = new ObjectVisitor(args => {

      const obj = args.obj;
      if (obj && obj === 'object' && 'type' in obj && Array.isArray(obj.type)) {

        if (obj.type.length === 0) {
          args.replaceWith = undefined;
        } else if (obj.type.length === 1) {
          args.replaceWith = obj.type[0];
        } else if (obj.type.length > 1) {
          // TODO: Perhaps transform the document so that multiple "type" are converted into "oneOf"-form -- but any $ref paths then need to be properly redirected
        }
      }

      // if (reduced && typeof reduced === 'object' && args.path[args.path.length - 1] !== 'properties') {
      //
      //   if ('definitions' in reduced && '$defs' in reduced) {
      //
      //     const merged = {
      //       ...reduced['definitions'],
      //       ...reduced['$defs'],
      //     };
      //
      //     reduced['$defs'] = merged;
      //     delete reduced['definitions'];
      //
      //   } else if ('definitions' in reduced) {
      //     reduced['$defs'] = reduced['definitions'];
      //     delete reduced['definitions'];
      //   }
      // }

      // if (args.path[args.path.length - 1] === '$ref' && args.path[args.path.length - 2] !== 'properties') {
      //   if (typeof reduced !== 'string') {
      //     throw new Error(`$ref must be a string`);
      //   }
      //
      //   return reduced.replace('/definitions/', '/$defs/');
      // }

      return true;
    });

    visitor.visit(doc);
    return doc;
  }
}
