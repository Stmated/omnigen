import {AnyDoc, Migrator} from './Migrator';

export class JSONSchema6to7 implements Migrator {

  migrate(doc: AnyDoc): AnyDoc {

    doc.$schema = 'http://json-schema.org/draft-07/schema';
    return doc;
  }
}
