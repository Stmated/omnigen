import {AnyDoc, Migrator} from './Migrator';

export class JSONSchema3to4 implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    doc.$schema = 'http://json-schema.org/draft-04/schema';
    return doc;
  }
}
