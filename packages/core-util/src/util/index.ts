
export * from './ProtocolHandler.js';
export * from './Sorters.js';
export * from './ToString.js';
export * from './Case.js';
export * from './Util.ts';
export * from './CombineTypeUtils.ts';

export function assertUnreachable(x: never): never {
  throw new Error(`Unreachable code was reached, with: ${getShallowPayloadString(x)}`);
}

export function assertDefined<T>(x: T): Exclude<T, undefined | null | void> {
  if (x === undefined || x === null) {
    throw new Error(`A reduced node became 'undefined' when it is required.`);
  }

  // @ts-ignore
  return x;
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}

export function getShallowPayloadString<T>(origin: T, maxDepth = 1) {
  return getShallowPayloadStringInternal(origin, 0, maxDepth);
}

export function getShallowPayloadStringInternal<T>(origin: T, depth: number, maxDepth: number): string {

  return JSON.stringify(origin, (key, value) => {
    if (value && typeof value === 'object' && key) {
      if (depth < maxDepth) {
        return JSON.parse(getShallowPayloadStringInternal(value, depth + 1, maxDepth));
      }
      return '[...]';
    }
    return value;
  });
}
