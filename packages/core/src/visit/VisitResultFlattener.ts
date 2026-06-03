import {AstNode, AstVisitor, VisitResult} from '@omnigen/api';
import {Visitor} from './Visitor';

export class VisitResultFlattener {

  public static flattenToSingle<T>(result: VisitResult<T>): T | Exclude<T, undefined>[] | undefined {
    return Visitor.flattenToSingle(result);
  }

  public static visitWithSingularResult<const T, F>(
    visitor: AstVisitor<T>,
    node: AstNode,
    fallback: F,
    reducer: <A extends T, B extends T>(a: A, b: B) => A | B = (a, b) => a || b,
  ): ReturnType<typeof reducer> | F {
    return Visitor.single(visitor, node, fallback, reducer);
  }
}
