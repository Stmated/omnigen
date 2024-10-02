import {ArrayKeys, DistributeReadOnly, ToArrayItem} from '@omnigen/api';
import {ReducerOpt2} from './ReducerOpt2';
import {IsExactly} from '../util';

export type IfImmutable<InOpt extends ReducerOpt2, True, False> = IsExactly<InOpt['immutable'], true, True, False>;

export type ResolvedRet<N extends object, D extends keyof N, O, A = N> = (N[D] extends keyof O ? O[N[D]] : (A | N))

export type ReduceRet<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> = IfImmutable<Opt, void, ResolvedRet<N, D, O>>;
export type NextRet<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> = IfImmutable<Opt, void, ResolvedRet<N, D, O, undefined>>;
export type SpecRet<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> = IfImmutable<Opt, void, ResolvedRet<N, D, O, undefined>>;

export interface ProxyReducerInterface<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> {
  depth: number;
  /**
   * Entrypoint. Never call recursively or inside a reducer spec.
   *
   * TODO: Should add some kind of check that we do not call it recursively inside its own spec
   */
  reduce<Local extends N>(original: Local): ReduceRet<Local, D, O, Opt>;
}

export interface StatefulProxyReducerInterface<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2> extends ProxyReducerInterface<N, D, O, Opt> {
  next(): RegularSpecFnRet2<N, FN, D, O, Opt>;
}

export type Fn<N, V> = ((n: N) => V);
export type MaybeFunction<N, V> = V | Fn<N, V>;

export type Mapper<N extends object, FN extends N, D extends keyof N, O, P extends ArrayKeys<FN>, I extends ToArrayItem<FN[P]>> = ((item: I) => ResolvedRet<FN, D, O, ToArrayItem<FN[P]>>);
export type Filter<T, S extends T> = (item: T) => item is S;

// export type OptionalMapper<N extends object, FN extends N, D extends keyof N, O, P extends ArrayKeys<FN>, I extends ToArrayItem<FN[P]>, M extends Mapper<N, FN, D, O, P, I>> =

export interface MutableProxyReducerInterface<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2> extends StatefulProxyReducerInterface<N, FN, D, O, Opt> {
  /**
   * Use this to set the property of the currently reducing object, and return either the current object or a cloned object with the new value set.
   */
  set<P extends keyof FN, V extends FN[P]>(prop: P, value: MaybeFunction<FN, V>): FN;
  /**
   * Use this to chain setting properties to the currently reducing object. The chain must however end with a `set` to give back the actual object.
   */
  put<P extends keyof FN, V extends FN[P]>(prop: P, value: MaybeFunction<FN, V>): this;

  /**
   * Call this to persist this object to a map which will be used to not visit this object again and instead return the object in its now persisted state.
   *
   * TODO: Need a way to say that we do not want to persist, and make any parent spec `persist` into no-op -- so we can mark that it should be separately replaced for each call-site
   */
  persist(replacement?: ResolvedRet<FN, D, O, FN>): this;

  commit(): FN;

  parent: Readonly<N> | undefined;
  // parents: ReadonlyArray<RecursiveValue<Readonly<N>>>;
}

export type ProxyReducerArg2<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2> = IfImmutable<Opt,
  StatefulProxyReducerInterface<N, FN, D, O, Opt>,
  MutableProxyReducerInterface<N, FN, D, O, Opt>
>;

export type RegularSpecFnRet2<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2> = SpecRet<FN, D, O, Opt>;

export type RegularSpecFn2<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2> = (n: DistributeReadOnly<FN>, r: ProxyReducerArg2<N, FN, D, O, Opt>) => RegularSpecFnRet2<N, FN, D, O, Opt>;

export type SpecFn2<N extends object, FN extends N, D extends keyof N, O, Opt extends ReducerOpt2> = RegularSpecFn2<N, FN, D, O, Opt>;
export type SpecObjects2<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> = { [K in N[D] & string]?: SpecFn2<N, Extract<N, Record<D, K>>, D, O, Opt> };
export type SpecAny2<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> = { true?: SpecFn2<N, N, D, O, Opt> };
export type Spec2<N extends object, D extends keyof N, O, Opt extends ReducerOpt2> = Omit<SpecObjects2<N, D, O, Opt>, 'true'> & SpecAny2<N, D, O, Opt>;
