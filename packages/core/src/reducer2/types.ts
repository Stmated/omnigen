import {DistributeStrictReadOnly, MaybeReadonly, StrictReadonly} from '@omnigen/api';
import {ReducerOpt2} from './ReducerOpt2';
import {IsExactly} from '../util';

export type IfImmutable<InOpt extends ReducerOpt2, True, False> = IsExactly<InOpt['immutable'], true, True, False>;

type FlattenUnion<T> = T extends Array<infer U> ? U : T;
type ExtractFunctionReturnTypes<A extends ReadonlyArray<any>> = {
  [K in keyof A]: {
    [P in keyof A[K]]: A[K][P] extends (...args: any[]) => any ? ReturnType<A[K][P]> : never;
  }[keyof A[K]]
}[number];

export type ResolvedRet<N extends object, D extends keyof N, O, A = N> = (N[D] extends keyof O ? O[N[D]] : (A | N))

export type FnRet<S extends ReadonlyArray<Spec2<any, any, any, any>>> = Exclude<FlattenUnion<ExtractFunctionReturnTypes<S>>, void>;
export type ReduceRet<N extends object, D extends keyof N, O, Opt extends ReducerOpt2, S extends ReadonlyArray<Spec2<N, D, O, Opt>>> = IfImmutable<Opt, FnRet<S> | undefined, ResolvedRet<N, D, O>>;
export type SpecRet<Opt extends ReducerOpt2> = IfImmutable<Opt, any, void>;
export type YieldRet<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> = IfImmutable<Opt, void, DistributeStrictReadOnly<ResolvedRet<N, D, O, undefined>>>;

export interface ProxyReducerInterface<N extends object, D extends keyof N, O, Opt extends ReducerOpt2, S extends ReadonlyArray<Spec2<N, D, O, Opt>>> {
  depth: number;

  reduce<Local extends N>(original: Local): ReduceRet<Local, D, O, Opt, S>;
}

export interface StatefulProxyReducerInterface<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2, S extends ReadonlyArray<Spec2<N, D, O, Opt>>> extends ProxyReducerInterface<N, D, O, Opt, S> {
  yieldBase(): YieldRet<FN, D, O, Opt>;
  callBase(): void;

  getId(node: MaybeReadonly<N>): number;
}

export type Fn<N, V> = ((n: N) => V);
export type MaybeFunction<N, V> = V | Fn<N, V>;

export interface MutableProxyReducerInterface<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2, S extends ReadonlyArray<Spec2<N, D, O, Opt>>> extends StatefulProxyReducerInterface<N, FN, D, O, Opt, S> {

  /**
   * Use this to chain setting properties to the currently reducing object. The chain must however end with a `set` to give back the actual object.
   */
  put<P extends keyof FN, V extends FN[P]>(prop: P, value: MaybeFunction<FN, V>): this;

  /**
   * Call this to persist this object to a map which will be used to not visit this object again and instead return the object in its now persisted state.
   *
   * TODO: Need a way to say that we do not want to persist, and make any parent spec `persist` into no-op -- so we can mark that it should be separately replaced for each call-site
   */
  persist(): this;

  replace(replacement: ResolvedRet<FN, D, O>): this;

  forget(): this;

  remove(): this;

  parent: StrictReadonly<N> | undefined;
}

export type ProxyReducerArg2<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2, S extends ReadonlyArray<Spec2<N, D, O, Opt>>> = IfImmutable<Opt,
  StatefulProxyReducerInterface<N, FN, D, O, Opt, S>,
  MutableProxyReducerInterface<N, FN, D, O, Opt, S>
>;

export const ANY_KIND = Symbol('ANY');

export type SpecFn2<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2, S extends ReadonlyArray<Spec2<N, D, O, Opt>>> = (n: DistributeStrictReadOnly<FN>, r: ProxyReducerArg2<N, FN, D, O, Opt, S>) => SpecRet<Opt>;
export type Spec2<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> =
  { [K in N[D] & string]?: SpecFn2<N, Extract<N, Record<D, K>>, D, O, Opt, any> }
  | { [ANY_KIND]?: SpecFn2<N, N, D, O, Opt, any> };
