
type OnPopCallback = () => void;
type OnPopRegistrator = (callback: OnPopCallback) => void;
export type PathItem = (string | number);
type Interceptor = (obj: unknown, path: PathItem[], onPop: OnPopRegistrator) => typeof obj | undefined;

/**
 * TODO: Rewrite into always returning void, make this just a walker, then ObjectReducer can be used to reshape the object
 */
export class ObjectReducer<T> {

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
