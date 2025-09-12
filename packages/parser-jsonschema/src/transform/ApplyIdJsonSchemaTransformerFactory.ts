import {JsonSchema9VisitorFactory} from '../visit/JsonSchema9VisitorFactory';
import {JsonSchema9Visitor} from '../visit/JsonSchema9Visitor';
import {Case, Util} from '@omnigen/core';
import {JSONSchema9} from '../definitions';

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
   * Something silly that should almost never be used, unless we're out of options. This could be an integer index or similar.
   */
  superfluous?: string;
  /**
   * If true this must be appended to a previous hint and not used by itself. Likely difference being no '/' to delimit to the previous.
   */
  suffix?: boolean;

  /**
   * If true, this must be included in the name, in the relative position that it is found.
   */
  required?: boolean;
};

export class ApplyIdJsonSchemaTransformerFactory<S extends JSONSchema9, V extends JsonSchema9Visitor<S>> implements JsonSchema9VisitorFactory<S, V> {

  private static _uniqueIdCounter = 0;

  private readonly _hints: IdHint[] = [];
  private readonly _baseVisitor: V;

  constructor(baseVisitor: V) {
    this._baseVisitor = baseVisitor;
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

    const bestUri = '';

    const parts: string[] = [];
    const tags: string[] = [];

    for (let i = this._hints.length - 1; i >= 0; i--) {

      const hint = this._hints[i];
      if (hint.suffix || hint.required) {
        continue;
      }

      let changed = false;

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

        const allParts = parts.concat(tags).reverse();
        this.pushRequired(i, allParts);

        const part = allParts.join('/');
        const suffixes = this.getSuffixes(i);

        for (const suffix of suffixes) {

          const uri = Util.trimAny(`${bestUri}${part}${suffix}`, '/', false, true);
          if (!others.includes(uri)) {
            return uri;
          }
        }
      }
    }

    // TODO: If no match so far, and all hints are suffixes, then we will take what we can from them and try again.
    const isOnlyAdditions = this._hints.filter(it => it.suffix || it.required).length === this._hints.length;
    if (isOnlyAdditions) {

      const suffixes = this.getSuffixes();
      for (const onlySuffix of suffixes) {

        const suffixParts: string[] = [];
        this.pushRequired(-1, suffixParts);
        suffixParts.push(onlySuffix);
        const suffix = suffixParts.join('');

        if (suffix && !others.includes(suffix)) {
          return suffix;
        }
      }
    }

    // If all else fails, then take the most specific id, and add a unique id to the end of it.
    // This might mess up reproducibility of runs, but there's not much we can do.
    return `${bestUri}_${ApplyIdJsonSchemaTransformerFactory._uniqueIdCounter++}`;
  }

  private pushRequired(i: number, allParts: string[]) {

    for (let n = i - 1; n >= 0; n--) {
      if (this._hints[n].required) {
        const req = this._hints[n];
        const reqValue = req.id ?? req.name ?? req.tag ?? req.extra;
        if (reqValue) {
          allParts.splice(0, 0, reqValue);
        }
      }
    }

    for (let n = i + 1; n < this._hints.length; n++) {
      if (this._hints[n].required) {
        const req = this._hints[n];
        const reqValue = req.id ?? req.name ?? req.tag ?? req.extra;
        if (reqValue) {
          allParts.push(reqValue);
        }
      }
    }
  }

  create(): V {

    const registeredIds: string[] = [];

    // TODO: Should do this somehow first
    // const idVisitor: JsonSchema9Visitor = {
    //   ...this._baseVisitor,
    //   $id: v => {
    //     registeredIds.push(v);
    //   }
    // };

    return {
      ...this._baseVisitor,
      schema: (v, visitor) => {

        if (v.$ref && Object.keys(v).length === 1) {

          // Skip this one, since it is a clean redirect.
          return this._baseVisitor.schema(v, this._baseVisitor);
        }

        const setCustomId = () => {
          const newId = this.newIdFromContext(registeredIds);
          if (registeredIds.includes(newId)) {
            throw new Error(`ID '${newId}' has already been assigned, there seems to be a uniqueness problem with your schema`);
          }
          (v as any)['x-omnigen-id'] = newId;
          registeredIds.push(newId);
        }

        if (!v.$id) {

          const hints = this.getSchemaHints(v);

          try {
            hints.forEach(it => this._hints.push(it));

            if (!this._hints.find(it => it.name || it.tag)) {

              // There was nothing inside the schema which uniquely identifies it, so will add a suffix to differentiate it from its parent/owner or similar.
              const hint: IdHint = {extra: `Schema`, suffix: true};
              hints.push(hint);
              this._hints.push(hint);
            }

            setCustomId();

            return this._baseVisitor.schema(v, visitor);
          } finally {
            hints.forEach(_ => this._hints.pop());
          }

        } else {

          try {

            // TODO: We should search through the whole document once before visiting it, and accumulate all the $id -- since those should take precedence, and not find the first one.
            this._hints.push({id: v.$id});
            // Set even for those with $id, since we want a stable and safe name that we can trust internally.
            setCustomId();
            //registeredIds.push(v.$id);
            return this._baseVisitor.schema(v, visitor);
          } finally {
            this._hints.pop();
          }
        }
      },

      schema_option: (item, visitor) => {

        try {
          this.pushPath({superfluous: `${item.idx}`, suffix: true});
          return this._baseVisitor.schema_option(item, visitor);
        } finally {
          this.popPath();
        }
      },
      // $id: v => {
      //   return v;
      // },
      $defs_option: (e, visitor) => {
        try {
          this.pushPath({name: e.key});
          return this._baseVisitor.$defs_option(e, visitor);
        } finally {
          this.popPath();
        }
      },
      not: (e, visitor) => {

        if (e !== undefined) {
          let notPart: string;
          if (typeof e === 'object') {
            notPart = 'Matching';
          } else {
            if (e) {
              notPart = 'Anything';
            } else {
              notPart = 'Nothing';
            }
          }

          try {
            this.pushPath({tag: `Not${notPart}`, suffix: true});
            return this._baseVisitor.not(e, visitor);
          } finally {
            this.popPath();
          }
        }

        return this._baseVisitor.not(e, visitor);
      },
      patternProperties: (e, visitor) => {
        try {
          this._hints.push({extra: 'PatternProperties', suffix: true});
          return this._baseVisitor.patternProperties(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
      properties_option: (e, visitor) => {
        try {
          this._hints.push({name: e.key, suffix: true});
          return this._baseVisitor.properties_option(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
      dependent_schema: (e, visitor) => {
        try {
          this._hints.push({name: `dependent/${e.key}`, suffix: true});
          return this._baseVisitor.dependent_schema(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
      items: (e, visitor) => {
        try {
          this._hints.push({tag: 'Item', suffix: true});
          return this._baseVisitor.items(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
      if: (e, visitor) => {
        try {
          this._hints.push({tag: 'If', suffix: true});
          return this._baseVisitor.if(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
      then: (e, visitor) => {
        try {
          this._hints.push({tag: 'Then', suffix: true});
          return this._baseVisitor.then(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
      else: (e, visitor) => {
        try {
          this._hints.push({tag: 'Else', suffix: true});
          return this._baseVisitor.else(e, visitor);
        } finally {
          this._hints.pop();
        }
      },
      additionalProperties: (e, v) => {
        try {
          this._hints.push({tag: 'Additional', suffix: true});
          return this._baseVisitor.additionalProperties(e, v);
        } finally {
          this._hints.pop();
        }
      },
    };
  }

  private getSchemaHints(v: JSONSchema9) {

    const hints: IdHint[] = [];

    const typeExtras: string[] = [];
    if (v.format) {
      // typeExtras.push(v.format);
      hints.push({tag: v.format, suffix: true});
    }
    if (v.const !== undefined) {
      typeExtras.push(`const`);
    }
    if (v.enum && v.enum.length > 0) {
      typeExtras.push(`enum`);
    }

    const typeExtra = typeExtras.map(it => Case.pascal(it)).join('');

    if (v.type) {
      const typeStrings = (v.type ? (Array.isArray(v.type) ? v.type : [v.type]) : []);
      if (typeExtra) {
        hints.push(...typeStrings.map(it => ({superfluous: `${Case.pascal(it)}${typeExtra}`, suffix: true} satisfies IdHint)));
      } else {
        hints.push(...typeStrings.map(it => ({superfluous: it, suffix: true} satisfies IdHint)));
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

    if (v.required) {
      const keys = Object.values(v.required);
      if (keys.length == 1) {
        hints.push({extra: `With${Case.pascal(keys[0])}`, suffix: true});
      } else {
        // Do something here? Like creating a tag that is a join of all property names, if there are fewer than, say... 4?
      }
    }

    if (v.$dynamicRef) {
      hints.push({tag: v.$dynamicRef.replaceAll('#', ''), suffix: true});
    }

    if (v.title) {
      hints.push({name: v.title});
    }

    return hints;
  }

  getSuffixes(i?: number): string[] {

    let name = '';
    const suffixes: string[] = [];
    const suffixesWithExtra: string[] = [];
    const suffixesWithSuperfluous: string[] = [];
    const tags: string[] = [];
    const extras: string[] = [];
    const superfluous: string[] = [];

    for (let s = (i === undefined ? 0 : i + 1); s < this._hints.length && (this._hints[s].suffix || this._hints[s].required); s++) {

      const hint = this._hints[s];
      if (hint.required) {
        continue;
      }

      let changed = false;
      if (hint.name) {
        name = Case.pascal(hint.name);
        tags.length = 0;
        extras.length = 0;
        superfluous.length = 0;
        changed = true;
      } else if (hint.tag) {
        tags.push(hint.tag);
        extras.length = 0;
        superfluous.length = 0;
        changed = true;
      } else if (hint.extra) {
        extras.push(hint.extra);
        superfluous.length = 0;
        changed = true;
      } else if (hint.superfluous) {
        superfluous.push(hint.superfluous);
        changed = true;
      }

      if (changed) {

        const newSuffix = `${name}${tags.map(it => Case.pascal(it)).join('')}`;
        if (newSuffix && !suffixes.includes(newSuffix)) {
          suffixes.push(newSuffix);
        }

        const extrasStr = extras.map(it => Case.pascal(it)).join('');
        const joinedWithExtra = `${newSuffix}${extrasStr}`;

        if (extras) {

          for (let i = 0; i < extras.length; i++) {

            const withExtra = `${newSuffix}${Case.pascal(extras[i])}`;
            if (!suffixesWithExtra.includes(withExtra)) {
              suffixesWithExtra.push(withExtra);
            }
          }

          if (!suffixesWithExtra.includes(joinedWithExtra)) {
            suffixesWithExtra.push(joinedWithExtra);
          }
        }

        if (superfluous) {

          for (let i = 0; i < superfluous.length; i++) {

            const withSuperfluous = `${joinedWithExtra}${Case.pascal(superfluous[i])}`;
            if (!suffixesWithSuperfluous.includes(withSuperfluous)) {
              suffixesWithSuperfluous.push(withSuperfluous);
            }
          }
        }
      }
    }

    suffixes.reverse();
    suffixes.push('');
    suffixes.push(...suffixesWithExtra);
    suffixes.push(...suffixesWithSuperfluous);

    return suffixes;
  }
}
