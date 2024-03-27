import {AnyDoc, Migrator} from './Migrator.ts';

export class JSONSchema4to5 implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    doc.$schema = 'http://json-schema.org/draft-05/schema';
    return doc;
  }
}
