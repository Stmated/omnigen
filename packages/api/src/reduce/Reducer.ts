import {AstVisitor, VisitFn} from '../visit';
import {AstNode} from '../ast';

export type ReducerResult<N extends AstNode> = N | undefined;

export type ReducerFn<N extends AstNode, V> = (node: N, reducer: V) => ReturnType<N['reduce']>;

export type Reducer<V extends AstVisitor<unknown>> = {
  [K in keyof V as K extends `visit${infer Type}` ? `reduce${Type}` : never]: V[K] extends VisitFn<infer N, any, infer V2>
    ? ReducerFn<N, Reducer<V2>>
    : V[K];
}

export const reduce = <const N extends AstNode, R>(node: N | undefined, reducer: Parameters<N['reduce']>[0], mapper: (v: Exclude<ReturnType<N['reduce']>, undefined>) => R) => {

  if (!node) {
    return undefined;
  }

  const reduced = node.reduce(reducer);
  if (reduced) {
    return mapper(reduced as Exclude<ReturnType<N['reduce']>, undefined>);
  }

  return undefined;
};
