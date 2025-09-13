import {JsonSchema9VisitorFactory} from '../visit/JsonSchema9VisitorFactory';
import {JsonSchema9Visitor} from '../visit/JsonSchema9Visitor';
import {JSONSchema9, PROP_ID} from '../definitions';

export class ApplyIdJsonSchemaTransformerFactory<S extends JSONSchema9, V extends JsonSchema9Visitor<S>> implements JsonSchema9VisitorFactory<S, V> {

  private static _uniqueIdCounter = 0;

  private readonly _hints: string[] = [];
  private readonly _baseVisitor: V;

  constructor(baseVisitor: V) {
    this._baseVisitor = baseVisitor;
  }

  public pushPath(hint: string) {
    this._hints.push(hint);
  }

  public popPath() {
    this._hints.pop();
  }

  newIdFromContext(): string {

    const bestUri = this._hints.join('_');

    // If all else fails, then take the most specific id, and add a unique id to the end of it.
    // This might mess up reproducibility of runs, but there's not much we can do.
    return `${bestUri}_${ApplyIdJsonSchemaTransformerFactory._uniqueIdCounter++}`;
  }

  create(): V {

    return {
      ...this._baseVisitor,
      schema: (v, visitor) => {

        if (v.$ref && Object.keys(v).length === 1) {

          // Skip this one, since it is a clean redirect.
          return this._baseVisitor.schema(v, this._baseVisitor);
        }

        const setCustomId = () => {
          const vAny = (v as any);
          if (vAny[PROP_ID]) {
            return;
          }

          vAny[PROP_ID] = this.newIdFromContext();
        }

        if (!v.$id) {
          setCustomId();
          return this._baseVisitor.schema(v, visitor);
        } else {
          this._hints.push(v.$id);
          try {
            setCustomId();
            return this._baseVisitor.schema(v, visitor);
          } finally {
            this._hints.pop();
          }
        }
      },
      $defs_option: (e, visitor) => {
        try {
          this.pushPath(e.key);
          return this._baseVisitor.$defs_option(e, visitor);
        } finally {
          this.popPath();
        }
      },
    };
  }
}
