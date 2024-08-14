import {OmniSuperTypeCapableType, OmniType, ReadonlyArrayable} from '@omnigen/api';
import {OmniUtil} from './OmniUtil.ts';

/**
 * Translates incoming `FN` into an alternative Return type.
 */
export type Ret<FN extends object, D extends keyof FN, O>
  = FN[D] extends keyof O
  ? O[FN[D]]
  : (FN | undefined)
  ;

export interface ReducerArgs<N extends object, D extends keyof N, O> {
  dispatcher: Reducer<N, D, O>,
  base: ReducerSpec<N, D, O>,
}

export const ANY = Symbol('Receiver of all');

export type OmniReducerFn<N extends object, FN extends N, D extends keyof N, O> = (node: FN, args: ReducerArgs<N, D, O>) => Ret<FN, D, O>;
export type OmniPropReducerFn<N extends object, V, D extends keyof N, O> = (v: V, args: ReducerArgs<N, D, O>) => V;

export type ReducerSpecObject<N extends object, FN extends N, D extends keyof N, O> = OmniReducerFn<N, FN, D, O>;
export type ReducerSpecObjects<N extends object, D extends keyof N, O> = { [K in N[D] & string]: ReducerSpecObject<N, Extract<N, Record<D, K>>, D, O> };
export type ReducerSpecAny<N extends object, D extends keyof N, O> = { [ANY]?: OmniReducerFn<N, N, D, O> };
export type ReducerSpec<N extends object, D extends keyof N, O> = ReducerSpecObjects<N, D, O> & ReducerSpecAny<N, D, O> & ReducerSpecProps<N, D, O>;

export interface Reducer<N extends object, D extends keyof N, O> {
  reduce<FN extends N>(node: FN): Ret<FN, D, O>;
}

type Join<K, P> = K extends string | number ? `${K}.${P & string}` : never;

// To distribute over the union and construct the required key-value pairs
type DistributeKeys<T extends object, D extends keyof T, O> =
  T extends unknown
    ? { [K in Exclude<keyof T, D> as Join<T[D], K>]?: OmniPropReducerFn<T, T[K], D, O>; }
    : never;

// Helper type to convert union to intersection
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type ReducerSpecProps<T extends object, D extends keyof T, O> = UnionToIntersection<DistributeKeys<T, D, O>>;

export function assertSuperType(type: undefined): undefined;
export function assertSuperType(type: OmniType): OmniSuperTypeCapableType;
export function assertSuperType(type: OmniType | undefined): OmniSuperTypeCapableType | undefined;
export function assertSuperType(type: OmniType | undefined): OmniSuperTypeCapableType | undefined {

  if (!type) {
    return undefined;
  }

  // NOTE: The special case could be a lie, but should hopefully be true.
  //        The real solution is to have stricter generics and resolving the type everywhere.
  if (OmniUtil.asSuperType(type, true, t => PROP_KEY_RECURSIVE_ORIGINAL in t ? true : undefined)) {
    return type;
  } else {
    throw new Error(`${OmniUtil.describe(type)} should have been supertype compatible`);
  }
}

export type EqualityResult = boolean | undefined;
export const PROP_KEY_RECURSIVE_USE_COUNT = Symbol('Use-Counter');
export const PROP_KEY_RECURSIVE_ORIGINAL = Symbol('Original');
export const PROP_KEY_ID = Symbol('ID');
export const PROP_KEY_GENERATION = Symbol('Generation');

export interface Placeholder<N extends object> {
  [PROP_KEY_RECURSIVE_USE_COUNT]: number;
  [PROP_KEY_RECURSIVE_ORIGINAL]?: N;
}

export interface ReducerOptions<N extends object, K extends keyof N, O> {
  readonly reducer: ReadonlyArrayable<Partial<ReducerSpec<N, K, O>>>;
  readonly track?: boolean;
}

export type IncomingReducerOptions<N extends object, D extends keyof N, O> = ReducerOptions<N, D, O> | Partial<ReducerSpec<N, D, O>>;

