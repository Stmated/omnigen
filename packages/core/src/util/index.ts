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
