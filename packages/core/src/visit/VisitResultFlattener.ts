import {AbortVisitingWithResult, AstVisitor, VisitResult} from './AstVisitor.js';
import {AbstractStNode} from '../ast/index.js';

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

  public static visitWithResult<T>(visitor: AstVisitor<T>, node: AbstractStNode): T | T[] | undefined {

    try {

      const flattened = VisitResultFlattener.flatten(node.visit(visitor));
      if (flattened) {
        if (Array.isArray(flattened)) {
          if (flattened.length > 0) {
            return flattened as T[];
          }
        } else {
          return flattened;
        }
      }

      return undefined;

    } catch (e) {
      if (e instanceof AbortVisitingWithResult<T>) {
        return e.result;
      }

      throw e;
    }
  }
}
