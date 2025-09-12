import {Arrayable, OmniModel, OmniPrimitiveType, OmniType, OmniTypeKind, TypeOwner} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from './OmniUtil.js';
import {getShallowPayloadString} from '../util';

const logger = LoggerFactory.create(import.meta.url);

export interface DFSTraverseContext {
  type: OmniType;
  parent: TypeOwner | undefined;

  depth: number;
  skip: boolean;
  visited: OmniType[];
}

export interface DFSTraverseCallback<R> {
  (ctx: DFSTraverseContext): R | void;
}

/**
 * @deprecated Use the new `OmniVisitor` (make sure it works properly first)
 */
export class OmniTypeVisitor {

  private static readonly _NULL_TYPE: OmniPrimitiveType = {
    kind: OmniTypeKind.NULL,
    nullable: true,
  };

  /**
   * @deprecated Use the new `OmniVisitor` (make sure it works properly first)
   */
  public visitTypesDepthFirst<R>(
    input: TypeOwner | undefined,
    onDown?: DFSTraverseCallback<R>,
    onUp?: DFSTraverseCallback<R>,
    onlyOnce = true,
  ) {

    if (!input) {
      return undefined;
    }

    const ctx: DFSTraverseContext = {
      type: OmniTypeVisitor._NULL_TYPE,
      parent: undefined,
      depth: 0,
      skip: false,
      visited: [],
    };

    if ('endpoints' in input) {
      return this.visitModelDepthFirst(input, ctx, onDown, onUp, onlyOnce);
    } else if ('type' in input) {

      ctx.parent = input;
      this.visitTypesDepthFirstInternal(input.type, ctx, onDown, onUp, onlyOnce);
    } else {
      return this.visitTypesDepthFirstInternal(input, ctx, onDown, onUp, onlyOnce);
    }

    return undefined;
  }

  private visitModelDepthFirst<R>(
    input: OmniModel,
    ctx: DFSTraverseContext,
    onDown: DFSTraverseCallback<R> | undefined,
    onUp: DFSTraverseCallback<R> | undefined,
    onlyOnce = true,
  ) {

    let result: R | undefined = undefined;
    for (const e of input.endpoints) {

      ctx.parent = e.request;
      result = this.visitTypesDepthFirstInternal(e.request.type, ctx, onDown, onUp, onlyOnce);
      if (result !== undefined) return result;

      for (const r of e.responses) {
        ctx.parent = r;
        result = this.visitTypesDepthFirstInternal(r.type, ctx, onDown, onUp, onlyOnce);
        if (result !== undefined) return result;
      }
    }

    for (const c of input.continuations || []) {
      for (const m of c.mappings) {

        for (const p of m.source.propertyPath || []) {
          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
        }
        for (const p of m.target.propertyPath || []) {
          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
        }
      }
    }

    for (const t of input.types) {
      ctx.parent = input;
      result = this.visitTypesDepthFirstInternal(t, ctx, onDown, onUp, onlyOnce);
      if (result !== undefined) return result;
    }

    return undefined;
  }

  private visitTypesDepthFirstInternal<R>(
    input: Arrayable<OmniType> | undefined,
    ctx: DFSTraverseContext,
    onDown?: DFSTraverseCallback<R>,
    onUp?: DFSTraverseCallback<R>,
    onlyOnce = true,
  ): R | undefined {

    if (!input) {
      return undefined;
    }

    let result: R | undefined;

    if (Array.isArray(input)) {
      for (const entry of input) {
        result = this.visitTypesDepthFirstInternal(entry, ctx, onDown, onUp, onlyOnce);
        if (result !== undefined) return result;
      }
      return undefined;
    }

    // TODO: This "visited" should not be in every context, it should be global or something.
    //        The whole algorithm could need a big cleanup to be more versatile and easier to handle depth vs breadth
    if (ctx.visited.includes(input)) {
      return undefined;
    }

    if (onlyOnce) {
      ctx.visited.push(input);
    }

    if (onDown) {
      ctx.type = input;
      const result = onDown(ctx);
      if (result !== undefined) return result;

      if (ctx.skip) {
        ctx.skip = false;
        return undefined;
      }
    }

    // Replace the context with a new one, which is one level deeper.
    // NOTE: We could improve memory use by implementing an object pool.
    ctx = {...ctx, parent: input, depth: ctx.depth + 1};

    if (!onlyOnce) {
      ctx.visited.push(input);
    }

    try {
      switch (input.kind) {
        case OmniTypeKind.OBJECT:
          result = this.visitTypesDepthFirstInternal(input.extendedBy, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;

          for (const p of input.properties) {
            ctx.parent = p;
            result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp, onlyOnce);
            if (result !== undefined) return result;
          }
          break;
        case OmniTypeKind.TUPLE:
          result = this.visitTypesDepthFirstInternal(input.types, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          result = this.visitTypesDepthFirstInternal(input.commonDenominator, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION:
          for (const p of input.properties) {
            ctx.parent = p;
            result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp, onlyOnce);
            if (result !== undefined) return result;
          }
          ctx.parent = input;
          result = this.visitTypesDepthFirstInternal(input.commonDenominator, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.UNION:
        case OmniTypeKind.EXCLUSIVE_UNION:
        case OmniTypeKind.INTERSECTION:
        case OmniTypeKind.NEGATION:
          result = this.visitTypesDepthFirstInternal(input.types, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.ARRAY:
          result = this.visitTypesDepthFirstInternal(input.of, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.DICTIONARY:
          result = this.visitTypesDepthFirstInternal(input.keyType, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          result = this.visitTypesDepthFirstInternal(input.valueType, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.GENERIC_SOURCE:
          result = this.visitTypesDepthFirstInternal(input.of, ctx, onDown, onUp, onlyOnce);
          result = this.visitTypesDepthFirstInternal(input.sourceIdentifiers, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.GENERIC_TARGET:
          result = this.visitTypesDepthFirstInternal(input.source, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          result = this.visitTypesDepthFirstInternal(input.targetIdentifiers, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.GENERIC_TARGET_IDENTIFIER:
          result = this.visitTypesDepthFirstInternal(input.type, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.GENERIC_SOURCE_IDENTIFIER:
          result = this.visitTypesDepthFirstInternal(input.lowerBound, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          result = this.visitTypesDepthFirstInternal(input.upperBound, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          if (input.knownEdgeTypes) {
            for (const edge of input.knownEdgeTypes) {
              result = this.visitTypesDepthFirstInternal(edge, ctx, onDown, onUp, onlyOnce);
              if (result !== undefined) return result;
            }
          }
          break;
        case OmniTypeKind.INTERFACE:
          result = this.visitTypesDepthFirstInternal(input.of, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.DECORATING:
          result = this.visitTypesDepthFirstInternal(input.of, ctx, onDown, onUp, onlyOnce);
          if (result !== undefined) return result;
          break;
        case OmniTypeKind.UNKNOWN:
          if (input.upperBound) {
            result = this.visitTypesDepthFirstInternal(input.upperBound, ctx, onDown, onUp, onlyOnce);
            if (result !== undefined) {
              return result;
            }
          }
          break;
        case OmniTypeKind.ENUM:
        case OmniTypeKind.HARDCODED_REFERENCE:
          // There are no type children of these
          break;
        case OmniTypeKind.EXTERNAL_MODEL_REFERENCE:
          // NOTE: Should it be allowed to follow this?
          // TODO: Allow to follow if the external reference is into our own model
          break;
        default: {
          if (OmniUtil.isPrimitive(input)) {
            break;
          }
          throw new Error(`Do not know how to handle kind '${(input as any).kind || '?'}'`);
        }
      }
    } finally {
      if (!onlyOnce) {
        ctx.visited.pop();
      }
    }

    if (onUp) {
      const result = onUp({...ctx, type: input});
      if (result !== undefined) return result;
    }

    return undefined;
  }
}
