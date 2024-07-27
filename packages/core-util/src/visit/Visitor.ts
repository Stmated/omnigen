import {AstNode, AstVisitor, VisitResult} from '@omnigen/core';
import {AbortVisitingWithResult} from './AbortVisitingWithResult.ts';

export class Visitor {

  public static create<V>(base: V, also: Partial<V>): V {

    // TODO: Need to figure out a way to cache these, so we do not create new ones over and over.
    //        But if we use this central one we can change the signature later and update everywhere.
    return {
      ...base,
      ...also,
    };
  }

  public static flatten<T>(result: VisitResult<T>): VisitResult<T> {
    if (Array.isArray(result)) {
      const defined: VisitResult<T>[] = [];
      for (const value of result) {
        const flat = Visitor.flatten(value);
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

      const flattened = Visitor.flatten(result);
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
      return Visitor.flattenToSingle(node.visit(visitor));
    } catch (e) {
      if (e instanceof AbortVisitingWithResult) {
        return e.result;
      }

      throw e;
    }
  }

  public static single<const T>(
    visitor: AstVisitor<T>,
    node: AstNode,
    fallback: T,
    reducer: (a: T, b: T) => T = (a, b) => a || b,
  ): T {

    const result = Visitor.visitWithResult(visitor, node);
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
