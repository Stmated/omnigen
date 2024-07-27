import {AstNode, AstVisitor, VisitResult} from '@omnigen/core';
import {Visitor} from './Visitor.ts';

export class VisitResultFlattener {

  public static flattenToSingle<T>(result: VisitResult<T>): T | Exclude<T, undefined>[] | undefined {
    return Visitor.flattenToSingle(result);
  }

  public static visitWithSingularResult<const T>(
    visitor: AstVisitor<T>,
    node: AstNode,
    fallback: T,
    reducer: (a: T, b: T) => T = (a, b) => a || b,
  ): T {
    return Visitor.single(visitor, node, fallback, reducer);
  }
}
