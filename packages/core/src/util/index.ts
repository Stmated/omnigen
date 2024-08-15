import {OmniSuperGenericTypeCapableType, OmniType} from '@omnigen/api';
import {OmniUtil} from '../parse';

export * from './ProtocolHandler';
export * from './Sorters';
export * from './ToString';
export * from './Case';
export * from './Util';
export * from './CombineTypeUtils';
export * from './TsTypes';

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

type ExtractByType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];
type PickByType<T, U> = Pick<T, ExtractByType<T, U>>;

export function assertDiscriminator<const T, const K extends keyof PickByType<NonNullable<T>, string> & string, const V extends NonNullable<T>[K]>(x: T, k: K, v: V): Extract<T, Record<K, V>> {
  if (x === undefined || x === null) {
    throw new Error(`A reduced node became 'undefined' when it is required.`);
  }

  if (x[k] !== v) {
    throw new Error(`Expected ${k} to be ${v}`);
  }

  // @ts-ignore
  return x;
}

export function assertGenericSuperType(type: OmniType | undefined): OmniSuperGenericTypeCapableType {
  const superType = OmniUtil.asGenericSuperType(type);
  if (superType) {
    return superType;
  } else {
    throw new Error(`${OmniUtil.describe(type)} should have been generic supertype compatible`);
  }
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

function expectToBeInstanceOf<const T, const C extends new(...args: any[]) => T>(value: T, clss: C): asserts value is InstanceType<C> {
  if (!(value instanceof clss)) {
    throw new Error(`Expected value to be an instance of ${clss.name}`);
  }
}

export function expectToBeDefined<T>(val?: T): asserts val is NonNullable<T> {
  if (!val) {
    throw new Error(`Expected value ${val} to be defined`);
  }
}

export function expectPropertyToBe<O, K extends keyof O, const V extends O[K]>(owner: O, key: K, compareVal: V): asserts owner is Extract<O, Record<K, V>> {
  if (owner[key] !== compareVal) {
    throw new Error(`${owner[key]} should have been ${compareVal}`);
  }
}

export interface ExpectTs {
  toBeDefined: typeof expectToBeDefined,
  toBeInstanceOf: typeof expectToBeInstanceOf,
  propertyToBe: typeof expectPropertyToBe,
}

export const expectTs: ExpectTs = {
  toBeDefined: expectToBeDefined,
  toBeInstanceOf: expectToBeInstanceOf,
  propertyToBe: expectPropertyToBe,
} as const;
