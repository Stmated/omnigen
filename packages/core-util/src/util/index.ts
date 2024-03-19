
export * from './ProtocolHandler.js';
export * from './Sorters.js';
export * from './ToString.js';
export * from './Case.js';
export * from './Util.ts';

export function assertUnreachable(x: never): never {
  throw new Error('Unreachable code was reached!');
}

export function assertDefined<T>(x: T): Exclude<T, undefined | null> {
  if (x === undefined || x === null) {
    throw new Error(`Undefined`);
  }

  // @ts-ignore
  return x;
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}
