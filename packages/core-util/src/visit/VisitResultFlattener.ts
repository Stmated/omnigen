import {AstNode, AstVisitor, VisitResult} from '@omnigen/core';
import {AbortVisitingWithResult} from './AbortVisitingWithResult.js';

export class VisitResultFlattener {

  public static flatten<T>(result: VisitResult<T>): VisitResult<T> {
    if (Array.isArray(result)) {
      const defined: VisitResult<T>[] = [];
      for (const value of result) {
        const flat = VisitResultFlattener.flatten(value);
        if (flat) {
          defined.push(flat);
        }
      }

      if (defined.length == 0) {
        return undefined;
      } else if (defined.length == 1) {
        return defined[0];
      } else {
        return defined;
      }
    } else {
      return result;
    }
  }

  public static flattenToSingle<T>(result: VisitResult<T>): T | Exclude<T, undefined>[] | undefined {

    try {

      const flattened = VisitResultFlattener.flatten(result);
      if (flattened) {
        if (Array.isArray(flattened)) {
          if (flattened.length > 0) {
            const filteredFlattened: Exclude<T, undefined>[] = [];
            for (const item of flattened) {
              if (item) {

                // NOTE: This can very likely be wrong. There is a bug waiting here. But that is for another day.
                //        The structure might be nested with arrays inside arrays
                filteredFlattened.push(item as any);
              }
            }

            return filteredFlattened;
          }
        } else {
          return flattened;
        }
      }

      return undefined;

    } catch (e) {
      if (e instanceof AbortVisitingWithResult) {
        return e.result;
      }

      throw e;
    }
  }

  public static visitWithResult<T>(visitor: AstVisitor<T>, node: AstNode): T | T[] | undefined {
    try {
      return VisitResultFlattener.flattenToSingle(node.visit(visitor));
    } catch (e) {
      if (e instanceof AbortVisitingWithResult) {
        return e.result;
      }

      throw e;
    }
  }

  public static visitWithSingularResult<T>(
    visitor: AstVisitor<T>,
    node: AstNode,
    fallback: T,
    reducer: (a: T, b: T) => T = (a, b) => a || b,
  ): T {

    const result = VisitResultFlattener.visitWithResult(visitor, node);
    if (result == undefined) {
      return fallback;
    }

    if (Array.isArray(result)) {
      return result.reduce(reducer);
    } else {
      return result;
    }
  }
}
