import {JsonSchema9VisitorFactory} from '../visit/JsonSchema9VisitorFactory.ts';
import {JsonSchema9Visitor} from '../visit/JsonSchema9Visitor.ts';
import {DefaultJsonSchema9Visitor} from '../visit/DefaultJsonSchema9Visitor.ts';
import {Case, Util} from '@omnigen/core-util';

export type IdHint = {
  /**
   * The URI of a resource, usually very long and used to locate it. Maybe a document absolute file path, or a URL.
   */
  uri?: string;
  /**
   * The ID of an owning element, or at least one where the current element is situated inside.
   */
  id?: string;
  /**
   * The name of an owning element, for example the key inside a JSONSchema `components/{key}`, used as preference over tags.
   */
  name?: string;
  /**
   * A tag which tells something about the element, could be an endpoint name or a property name.
   */
  tag?: string;
  /**
   * Something extra to add if all else fails, but should be avoided if possible.
   */
  extra?: string;
  /**
   * If true this must be appended to a previous hint and not used by itself. Likely difference being no '/' to delimit to the previous.
   */
  suffix?: boolean;
};

interface Collected {
  id: string;
  exhausted: boolean;
  done: boolean;
}

export class ApplyIdJsonSchemaTransformerFactory implements JsonSchema9VisitorFactory {

  private static _uniqueIdCounter = 0;

  private readonly _hints: IdHint[] = [];

  constructor(absolutePath: string | undefined) {
    if (absolutePath) {
      this._hints.push({uri: absolutePath});
    }
  }

  public pushPath(hint: IdHint | string) {
    if (typeof hint == 'string') {
      this._hints.push({tag: hint});
    } else {
      this._hints.push(hint);
    }
  }

  public popPath() {
    this._hints.pop();
  }

  newIdFromContext(others: string[]): string {

    let bestUri = this.addSlash(this._hints.findLast(it => !!it.uri)?.uri || '');

    const parts: string[] = [];
    const tags: string[] = [];

    for (let i = this._hints.length - 1; i >= 0; i--) {

      const hint = this._hints[i];
      if (hint.suffix) {
        continue;
      }

      let changed = false;
      if (hint.uri) {
        bestUri = this.addSlash(hint.uri);
        changed = true;
      }

      if (hint.id) {
        parts.push(hint.id);
        tags.length = 0;
        changed = true;
      }

      if (hint.name) {
        parts.push(hint.name);
        tags.length = 0;
        changed = true;
      }

      if (hint.tag) {
        tags.push(hint.tag);
        changed = true;
      }

      if (changed) {

        const allParts = parts.concat(tags);
        const part = allParts.toReversed().join('/');
        const suffixes = this.getSuffixes(i);

        for (const suffix of suffixes) {

          const uri = Util.trimAny(`${bestUri}${part}${suffix}`, '/', false, true);
          if (!others.includes(uri)) {
            return uri;
          }
        }
      }
    }

    // If all else fails, then take the most specific id, and add a unique id to the end of it.
    // This might mess up reproducibility of runs, but there's not much we can do.
    return `${bestUri}_${ApplyIdJsonSchemaTransformerFactory._uniqueIdCounter++}`;
  }

  private addSlash(bestUri: string) {

    if (bestUri && !bestUri.endsWith('/')) {
      bestUri += '/';
    }

    return bestUri;
  }

  getSuffixes(i: number): string[] {

    let name = '';
    const suffixes: string[] = [];
    const suffixesWithExtra: string[] = [];
    const tags: string[] = [];
    const extras: string[] = [];

    for (let s = i + 1; s < this._hints.length && this._hints[s].suffix; s++) {

      const hint = this._hints[s];
      let changed = false;
      if (hint.name) {
        name = Case.pascal(hint.name);
        tags.length = 0;
        extras.length = 0;
        changed = true;
      } else if (hint.tag) {
        tags.push(hint.tag);
        extras.length = 0;
        changed = true;
      } else if (hint.extra) {
        extras.push(hint.extra);
        changed = true;
      }

      if (changed) {

        const newSuffix = `${name}${tags.map(it => Case.pascal(it)).join('')}`;
        if (newSuffix && !suffixes.includes(newSuffix)) {
          suffixes.push(newSuffix);
        }

        if (extras) {

          for (let i = 0; i < extras.length; i++) {

            const withExtra = `${newSuffix}${Case.pascal(extras[i])}`;
            if (!suffixesWithExtra.includes(withExtra)) {
              suffixesWithExtra.push(withExtra);
            }
          }

          const extrasStr = extras.map(it => Case.pascal(it)).join('');

          const joinedWithExtra = `${newSuffix}${extrasStr}`;
          if (!suffixesWithExtra.includes(joinedWithExtra)) {
            suffixesWithExtra.push(joinedWithExtra);
          }
        }
      }
    }

    suffixes.reverse();
    suffixes.push('');
    suffixes.push(...suffixesWithExtra);

    return suffixes;
  }

  create(): JsonSchema9Visitor {

    const registeredIds: string[] = [];

    return {
      ...DefaultJsonSchema9Visitor,
      schema: (v, visitor) => {

        if (v.$ref) {
          return DefaultJsonSchema9Visitor.schema(v, DefaultJsonSchema9Visitor);
        }

        if (!v.$id) {

          const typeExtras: string[] = [];
          if (v.format) {
            typeExtras.push(v.format);
          }
          if (v.const !== undefined) {
            typeExtras.push(`const`);
          }
          if (v.enum && v.enum.length > 0) {
            typeExtras.push(`enum`);
          }

          const typeExtra = typeExtras.map(it => Case.pascal(it)).join('');
          const hints: IdHint[] = [];
          if (v.type) {
            const typeStrings = (v.type ? (Array.isArray(v.type) ? v.type : [v.type]) : []);
            if (typeExtra) {
              hints.push(...typeStrings.map(it => ({extra: `${Case.pascal(it)}${typeExtra}`, suffix: true})));
            } else {
              hints.push(...typeStrings.map(it => ({extra: it, suffix: true})));
            }
          } else if (typeExtra) {
            hints.push({extra: typeExtra, suffix: true});
          }

          if (v.properties) {
            const keys = Object.keys(v.properties);
            if (keys.length == 1) {
              hints.push({extra: `With${Case.pascal(keys[0])}`, suffix: true});
            } else {
              // Do something here? Like creating a tag that is a join of all property names, if there are fewer than, say... 4?
            }
          }

          if (v.title) {
            hints.push({name: v.title});
          }

          if (!hints.find(it => it.name || it.tag)) {

            // There was nothing inside the schema which unique identifies it, so will add a suffix to differentiate it from its parent/owner or similar.
            hints.splice(0, 0, {extra: `Schema`, suffix: true});
          }

          try {
            hints.forEach(it => this._hints.push(it));
            return DefaultJsonSchema9Visitor.schema(v, visitor);
          } finally {
            hints.forEach(_ => this._hints.pop());
          }

        } else {

          try {
            this._hints.push({id: v.$id});
            return DefaultJsonSchema9Visitor.schema(v, visitor);
          } finally {
            this._hints.pop();
          }
        }
      },

      schema_option: (item, visitor) => {

        try {
          this.pushPath({extra: `${item.idx}`, suffix: true});
          return DefaultJsonSchema9Visitor.schema_option(item, visitor);
        } finally {
          this.popPath();
        }
      },

      $id: v => {
        if (!v) {

          const newId = this.newIdFromContext(registeredIds);
          if (registeredIds.includes(newId)) {
            throw new Error(`ID '${newId}' has already been assigned, there seems to be a uniqueness problem with your schema`);
          }

          registeredIds.push(newId);
          return newId;
        }

        return v;
      },
      $defs_option: (e, visitor) => {
        try {
          this.pushPath({name: e.key});
          return DefaultJsonSchema9Visitor.$defs_option(e, visitor);
        } finally {
          this.popPath();
        }
      },
      properties_option: (e, visitor) => {
        try {
          this._hints.push({name: e.key, suffix: true});
          return DefaultJsonSchema9Visitor.properties_option(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
    };
  }
}
