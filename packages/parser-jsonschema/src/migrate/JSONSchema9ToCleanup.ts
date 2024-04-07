import {AnyDoc, Migrator} from './Migrator.ts';

export class JSONSchema9ToCleanup implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    // const local = new ObjectVisitor((args, next) => {
    //
    //   const reduced = next(args);
    //
    //   // if (reduced && typeof reduced === 'object' && args.path[args.path.length - 1] !== 'properties') {
    //   //
    //   //   if ('definitions' in reduced && '$defs' in reduced) {
    //   //
    //   //     const merged = {
    //   //       ...reduced['definitions'],
    //   //       ...reduced['$defs'],
    //   //     };
    //   //
    //   //     reduced['$defs'] = merged;
    //   //     delete reduced['definitions'];
    //   //
    //   //   } else if ('definitions' in reduced) {
    //   //     reduced['$defs'] = reduced['definitions'];
    //   //     delete reduced['definitions'];
    //   //   }
    //   // }
    //
    //   // if (args.path[args.path.length - 1] === '$ref' && args.path[args.path.length - 2] !== 'properties') {
    //   //   if (typeof reduced !== 'string') {
    //   //     throw new Error(`$ref must be a string`);
    //   //   }
    //   //
    //   //   return reduced.replace('/definitions/', '/$defs/');
    //   // }
    //
    //   return reduced;
    // });

    return doc;
  }
}
