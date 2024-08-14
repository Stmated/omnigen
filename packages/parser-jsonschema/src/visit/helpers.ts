
export type ToSingle<T> = T extends Array<infer Item> ? Item : T;
export type DocVisitorTransformer<T, V> = (v: T, visitor: V) => typeof v | undefined;
export type DocVisitorUnknownTransformer<T> = { path: [string, ...string[]], value: T };
export type ToArray<T> = T extends Array<any> ? T : undefined;
export type ToResolved<T> = T extends {$ref: any} ? Exclude<T, {$ref: any}> : T;
export type Entry<T> = {key: string, value: T};

export function safeSet<O extends object, OK extends keyof O & string, V extends Pick<Record<PropertyKey, DocVisitorTransformer<O[OK], any>>, OK>>(
  owner: O,
  visitor: V,
  prop: OK, 
  handled: string[],
): void {

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
