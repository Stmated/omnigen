export interface VisitorArgs<T = any> {
  obj: T;
  path: (string | number)[];
  onAfter?: () => void;
}

export type Visitor = (args: VisitorArgs) => boolean;

export class ObjectVisitor {

  private readonly _visitor: Visitor;
  constructor(reducer: Visitor) {
    this._visitor = reducer;
  }

  public visit(obj: any): any {
    return this.visitInto({
      obj: obj,
      path: [],
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
          this.visitInto({obj: args.obj[i], path: args.path});
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
          this.visitInto({obj: args.obj[key], path: args.path});
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
