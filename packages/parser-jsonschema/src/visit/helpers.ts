
export type ToSingle<T> = T extends Array<infer Item> ? Item : T;
export type DocVisitorTransformer<T, V> = (v: T, visitor: V) => typeof v | undefined;
export type DocVisitorUnknownTransformer<T> = { path: [string, ...string[]], value: T };
export type ToDefined<T> = Exclude<T, undefined>;
export type ToArray<T> = T extends Array<any> ? T : undefined;
export type ToResolved<T> = T extends {$ref: any} ? Exclude<T, {$ref: any}> : T;
export type Entry<T> = {key: string, value: T};

export function safeSet<O extends object, OK extends keyof O & string, V extends Pick<Record<PropertyKey, DocVisitorTransformer<O[OK], any>>, OK>>(owner: O, visitor: V, prop: OK, handled: string[]): void {

  handled.push(prop);

  const transformer = visitor[prop];
  const transformed = transformer(owner[prop], visitor);

  if (transformed === undefined) {
    if (prop in owner) {
      delete owner[prop];
    }
  } else {
    owner[prop] = transformed;
  }
}

export function visitUniformObject<T extends object>(obj: T, mapper: { (child: T[typeof key], key: Extract<keyof T, string>): typeof child | Entry<typeof child> | undefined }): T {

  const newObj: Partial<T> = {};
  let changeCount = 0;

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }

    const value = obj[key];
    const res = mapper(value, key);

    let resKey: string;
    let resValue: typeof value | undefined;
    if (res && typeof res == 'object' && 'key' in res && 'value' in res) {
      resKey = res.key;
      resValue = res.value;
    } else {
      resKey = key;
      resValue = res;
    }

    if (resValue !== undefined) {
      if (resValue != value) {
        changeCount++;
      }

      // @ts-ignore
      newObj[resKey] = resValue;
    } else {
      changeCount++;
    }
  }

  return ((changeCount > 0) ? newObj as T : obj);
}

export function visitUniformArray<A extends Array<any>>(array: A, mapper: { (item: ToSingle<A>, idx: number): typeof item | undefined }): A {

  const newArr: Array<ToSingle<A>> = [];
  let changeCount = 0;
  for (let i = 0; i < array.length; i++) {
    const item = array[i];

    const res = mapper(item, i);
    if (res !== undefined && res != item) {
      changeCount++;
      newArr.push(res);
    } else if (res === undefined) {
      changeCount++;
    }
  }

  return ((changeCount > 0) ? newArr as A : array);
}

type OnPopCallback = () => void;
type OnPopRegistrator = (callback: OnPopCallback) => void;
type PathItem = (string | number);
type Interceptor = (obj: unknown, path: PathItem[], onPop: OnPopRegistrator) => typeof obj | undefined;

/**
 * TODO: Rewrite into always returning void, make this just a walker, then ObjectReducer can be used to reshape the object
 */
export class SimpleObjectWalker<T> {

  private readonly _obj: T;

  constructor(obj: T) {
    this._obj = obj;
  }

  public walk(interceptor: Interceptor): unknown {
    return this.walkInto(this._obj, interceptor, []);
  }

  private walkInto(obj: unknown, interceptor: Interceptor, path: PathItem[]): unknown {

    if (Array.isArray(obj)) {
      return this.walkIntoArray(obj, path, interceptor);
    } else if (obj && typeof obj == 'object') {
      return this.walkIntoObject(obj, path, interceptor);
    } else {
      return obj;
    }
  }

  private walkIntoObject<T extends object>(obj: T, path: PathItem[], interceptor: Interceptor): object {

    const onPopCallbacks: OnPopCallback[] = [];
    const onPopRegistration: OnPopRegistrator = onPop => onPopCallbacks.push(onPop);

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      try {

        path.push(key);

        const original = (obj as any)[key];
        const intercepted = interceptor(original, path, onPopRegistration);
        if (intercepted !== undefined) {
          (obj as any)[key] = intercepted;
        } else {
          delete obj[key];
        }

        const folded = this.walkInto(intercepted, interceptor, path);
        if (folded !== obj[key]) {
          if (folded !== undefined) {
            (obj as any)[key] = folded;
          } else {
            delete obj[key];
          }
        }

      } finally {
        path.pop();
        onPopCallbacks.forEach(it => it());
        onPopCallbacks.length = 0;
      }
    }

    return obj;
  }

  private walkIntoArray<T, A extends Array<T>>(obj: A, path: PathItem[], interceptor: Interceptor): T[] {

    const newArray: T[] = [];
    let changeCount = 0;
    const onPopCallbacks: OnPopCallback[] = [];
    const onPopRegistration: OnPopRegistrator = onPop => onPopCallbacks.push(onPop);

    for (let i = 0; i < obj.length; i++) {

      try {
        path.push(i);

        const original = obj[i];
        const intercepted = interceptor(original, path, onPopRegistration);
        if (intercepted !== undefined) {
          newArray.push(intercepted as T);
          if (intercepted !== original) {
            changeCount++;
          }
        } else {
          if (original !== undefined) {
            changeCount++;
          }
        }

        const folded = this.walkInto(intercepted, interceptor, path);
        if (folded !== newArray[i]) {
          newArray[i] = folded as T;
          changeCount++;
        }

      } finally {
        path.pop();
        onPopCallbacks.forEach(it => it());
        onPopCallbacks.length = 0;
      }
    }

    if (changeCount > 0) {
      return newArray;
    } else {
      return obj;
    }
  }
}
