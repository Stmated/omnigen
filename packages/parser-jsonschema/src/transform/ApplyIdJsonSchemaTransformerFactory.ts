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

  collect(tags: number, acceptable: (id: string) => boolean): Collected {

    const parts: string[] = [];
    let unusedTags = 0;

    let bestUri = this._hints.findLast(it => !!it.uri)?.uri || '';
    if (bestUri) {
      bestUri += '/';
    }

    let i = this._hints.length - 1;
    for (; i >= 0; i--) {

      const hint = this._hints[i];
      if (hint.suffix) {
        // We do not add the suffix itself to the parts, the suffix is added to whatever else we find.
        continue;
      }

      const suffixes: string[] = [];
      let suffixIndex = i;

      while (this._hints[suffixIndex + 1]?.suffix) {
        suffixIndex++;
      }

      while (suffixIndex > i) {

        const suffixHint = this._hints[suffixIndex];
        const important = suffixHint.id ?? suffixHint.name;
        if (important) {
          suffixes.push(Case.pascal(important));
        } else if (suffixHint.tag) {
          if (tags > 0) {
            suffixes.push(Case.pascal(suffixHint.tag));
            tags--;
          } else {
            unusedTags++;
          }
        }

        suffixIndex--;
      }

      const suffix = suffixes.reverse().join('');

      if (hint.id) {
        parts.push(`${hint.id}${suffix}`);
      }

      if (hint.name) {
        parts.push(`${hint.name}${suffix}`);
      }

      if (hint.tag) {
        if (tags > 0) {
          parts.push(`${hint.tag}${suffix}`);
          tags--;
        } else {
          unusedTags++;
        }
      }

      // TODO: Add "const" or "enum" to the tags, to differentiate, so we do not end up with names like TagOrSpeciesOrString4String -- there should be some better option

      const id = Util.trimAny(`${bestUri}${parts.reverse().join('/')}`, '/', false, true);
      if (acceptable(id)) {
        return {
          id: id,
          exhausted: false,
          done: true,
        };
      }
    }

    return {
      id: parts.reverse().join('/'),
      exhausted: (unusedTags == 0),
      done: false,
    };
  }

  newIdFromContext(others: string[]): string {

    let tagCount = 0;
    let collected: Collected;
    do {

      collected = this.collect(tagCount, id => !others.includes(id));
      if (collected.done) {
        return collected.id;
      }
      tagCount++;

    } while (!collected.exhausted);

    // If all else fails, then take the most specific id, and add a unique id to the end of it.
    // This might mess up reproducibility of runs, but there's not much we can do.
    return `${collected.id}_${ApplyIdJsonSchemaTransformerFactory._uniqueIdCounter++}`;
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
          const tags: string[] = [];
          if (v.type) {
            const typeStrings = (v.type ? (Array.isArray(v.type) ? v.type : [v.type]) : []);
            if (typeExtra) {
              tags.push(...typeStrings.map(it => `${Case.pascal(it)}${typeExtra}`));
            } else {
              tags.push(...typeStrings);
            }
          } else if (typeExtra) {
            tags.push(typeExtra);
          }

          if (v.properties) {
            const keys = Object.keys(v.properties);
            if (keys.length == 1) {
              tags.push(`With${Case.pascal(keys[0])}`);
            } else {
              // Do something here? Like creating a tag that is a join of all property names, if there are fewer than, say... 4?
            }
          }

          const names: string[] = [];
          if (v.title) {
            names.push(v.title);
          }

          try {
            names.forEach(it => this._hints.push({name: it}));
            tags.forEach(it => this._hints.push({tag: it, suffix: true}));
            return DefaultJsonSchema9Visitor.schema(v, visitor);
          } finally {
            tags.forEach(_ => this._hints.pop());
            names.forEach(_ => this._hints.pop());
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
          this.pushPath({tag: `${item.idx}`, suffix: true});
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
