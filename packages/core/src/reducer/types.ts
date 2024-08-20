import {DistributeReadOnly, DistributeWriteable} from '@omnigen/api';
import {ReducerOpt} from './ReducerOpt.ts';

export type IsExactly<T, Condition, True, False> = [T] extends [Condition] ? True : False;
export type IfImmutable<InOpt extends ReducerOpt, True, False> = IsExactly<InOpt['immutable'], true, True, False>;

export type Simplify<T> = {[KeyType in keyof T]: T[KeyType]} & {};

export type ReduceRet<N, D extends keyof N, O, Opt extends ReducerOpt> = IfImmutable<Opt, void, (N[D] extends keyof O ? O[N[D]] : N)>;
export type NextRet<N, D extends keyof N, O, Opt extends ReducerOpt> = IfImmutable<Opt, void, (N[D] extends keyof O ? O[N[D]] : (undefined | N))>;
export type SpecRet<N, D extends keyof N, O, Opt extends ReducerOpt> = IfImmutable<Opt, void, void | (N[D] extends keyof O ? O[N[D]] : (null | N))>;

export interface ProxyReducerInterface<N, D extends keyof N, O, Opt extends ReducerOpt> {
  depth: number;
  reduce<FN extends N>(original: FN): ReduceRet<FN, D, O, Opt>;
  next<FN extends N>(original: FN): NextRet<FN, D, O, Opt>;
}

export type ProxyReducerArg<N, D extends keyof N, O, Opt extends ReducerOpt> = Omit<ProxyReducerInterface<N, D, O, Opt>, 'reduce'>;

export type SpecFnNode<N, Opt extends ReducerOpt> = IfImmutable<Opt, DistributeReadOnly<N>, DistributeWriteable<N>>;
export type SpecFn<N, FN extends N, D extends keyof N, O, Opt extends ReducerOpt> = (n: SpecFnNode<FN, Opt>, r: ProxyReducerArg<N, D, O, Opt>) => SpecRet<FN, D, O, Opt>;
export type SpecObjects<N, D extends keyof N, O, Opt extends ReducerOpt> = { [K in N[D] & string]?: SpecFn<N, Extract<N, Record<D, K>>, D, O, Opt> };
export type SpecAny<N, D extends keyof N, O, Opt extends ReducerOpt> = { true?: SpecFn<N, N, D, O, Opt> };
export type Spec<N, D extends keyof N, O, Opt extends ReducerOpt> = SpecObjects<N, D, O, Opt> & SpecAny<N, D, O, Opt>;
