import {Migrator} from './Migrator.ts';
import {JSONSchema3to4} from './JSONSchema3to4.ts';
import {JSONSchema4to5} from './JSONSchema4to5.ts';
import {JSONSchema5to6} from './JSONSchema5to6.ts';
import {JSONSchema6to7} from './JSONSchema6to7.ts';
import {JSONSchema7to8} from './JSONSchema7to8.ts';
import {JSONSchema8to9} from './JSONSchema8to9.ts';
import {JSONSchema9ToCleanup} from './JSONSchema9ToCleanup.ts';
import {ObjectVisitor} from '@omnigen/core-json';

/**
 * Will search into the object and find any $schema and update from that version up until the latest.
 *
 * It will upgrade any deepest schemas first, and re-visit all children elements once a $schema is found.
 *
 * It is up to each individual migrator to abort diving deeper into an object if it finds a nested $schema.
 */
export class JsonSchemaMigrator {

  private static readonly _LAST_VERSION = 9;
  private readonly _next: Record<number, Migrator> = {
    [3]: new JSONSchema3to4(),
    [4]: new JSONSchema4to5(),
    [5]: new JSONSchema5to6(),
    [6]: new JSONSchema6to7(),
    [7]: new JSONSchema7to8(),
    [8]: new JSONSchema8to9(),
    [9]: new JSONSchema9ToCleanup(),
  };

  public migrate(doc: any): any {

    const visitor = new ObjectVisitor(args => {

      if (args.obj && typeof args.obj === 'object' && args.path[args.path.length - 1] !== 'properties') {

        const foundVersion = '$schema' in args.obj ? this.versionStringToNumber(args.obj.$schema) : undefined;
        if (foundVersion !== undefined && foundVersion !== -1) {
          args.onAfter = () => {

            for (let version = foundVersion; version < JsonSchemaMigrator._LAST_VERSION; version++) {
              const migrator = this._next[version];
              migrator.migrate(args.obj);
            }
          };
        }
      }

      return true;
    });

    visitor.visit(doc);
    return doc;
  }

  private versionStringToNumber(str: string): number {

    if (str.includes('json-schema')) {

      if (str.includes('draft-03')) {
        return 3;
      } else if (str.includes('draft-04')) {
        return 4;
      } else if (str.includes('draft-05')) {
        return 5;
      } else if (str.includes('draft-06')) {
        return 6;
      } else if (str.includes('draft-07')) {
        return 7;
      } else if (str.includes('2019-09')) {
        return 8;
      } else if (str.includes('2020-12')) {
        return 9;
      }
    }

    return -1;
  }
}

