
export type AnyDoc = Record<string, unknown> & { $schema: string };

export interface Migrator {

  migrate: (doc: AnyDoc) => AnyDoc;
}
