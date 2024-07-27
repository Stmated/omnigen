export interface VisitorArgs<T = any> {
  obj: T;
  path: (string | number)[];
  onAfter?: () => void;
  replaceWith?: unknown;
}

/**
 * Return true to continue visiting children, otherwise false to stop traversing downwards.
 */
export type Visitor = (args: VisitorArgs) => boolean;

const UNDEFINED_MARKER = '__-th1s-1s-n0-v4lu3-__';

export class ObjectVisitor {

  private readonly _visitor: Visitor;
  constructor(reducer: Visitor) {
    this._visitor = reducer;
  }

  public visit(obj: any): any {
    return this.visitInto({
      obj: obj,
      path: [],
      replaceWith: UNDEFINED_MARKER,
    });
  }

  private visitInto(args: VisitorArgs): boolean {

    if (args.onAfter) {
      throw new Error(`onAfter should not be set by anyone other than the visitor`);
    }

    if (!this._visitor(args)) {
      return false;
    }

    if (Array.isArray(args.obj)) {

      for (let i = 0; i < args.obj.length; i++) {

        try {
          args.path.push(i);
          const a: VisitorArgs = {obj: args.obj[i], path: args.path, replaceWith: UNDEFINED_MARKER};
          this.visitInto(a);
          if (a.replaceWith !== UNDEFINED_MARKER) {
            args.obj[i] = a.replaceWith;
          }
        } finally {
          args.path.pop();
        }
      }

    } else if (args.obj && typeof args.obj == 'object') {

      for (const key in args.obj) {
        if (!Object.prototype.hasOwnProperty.call(args.obj, key)) {
          continue;
        }

        try {
          args.path.push(key);
          const a: VisitorArgs = {obj: args.obj[key], path: args.path, replaceWith: UNDEFINED_MARKER};
          this.visitInto(a);
          if (a.replaceWith !== UNDEFINED_MARKER) {
            args.obj[key] = a.replaceWith;
          }
        } finally {
          args.path.pop();
        }
      }
    }

    if (args.onAfter) {
      // @ts-ignore
      args.onAfter();
    }

    return true;
  }
}
