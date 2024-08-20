import {OmniSuperGenericTypeCapableType, OmniType} from '@omnigen/api';
import {OmniUtil} from '../parse';

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
