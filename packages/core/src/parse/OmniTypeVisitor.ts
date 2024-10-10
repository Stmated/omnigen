import {Arrayable, OmniModel, OmniPrimitiveType, OmniType, OmniTypeKind, StrictReadonly, TypeOwner} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from './OmniUtil.js';
import {getShallowPayloadString} from '../util';

const logger = LoggerFactory.create(import.meta.url);

export interface DFSTraverseContext {
  type: OmniType;
  parent: TypeOwner | undefined;

  /**
   * TODO: Remove, and instead use a proper reducer pattern, so we can make all properties read-only.
   * @deprecated Should be replaced with a proper reducer
   */
  replacement?: OmniType | null | undefined;
  depth: number;
  skip: boolean;
  visited: OmniType[];
}

export interface DFSTraverseCallback<R> {
  (ctx: DFSTraverseContext): R | void;
}

export interface BFSTraverseContext {
  type: OmniType;
  parent: OmniType | undefined;
  owner: TypeOwner | undefined;
  typeDepth: number;
  useDepth: number;
  skip: boolean;
}

export interface BFSTraverseCallback<R> {
  (ctx: BFSTraverseContext): R | void;
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
  public visitTypesBreadthFirst<R>(
    inputs: TypeOwner | TypeOwner[] | undefined,
    onDown: BFSTraverseCallback<R>,
    visitOnce = true,
  ): R | undefined {

    if (!inputs) {
      return undefined;
    }

    // TODO: Improve speed of this common code by using an object pool and set specific properties, instead of spread

    const q: BFSTraverseContext[] = [];

    for (const input of Array.isArray(inputs) ? inputs : [inputs]) {
      if ('endpoints' in input) {

        for (const e of input.endpoints) {
          q.push({owner: e.request, parent: undefined, type: e.request.type, typeDepth: 0, useDepth: 0, skip: false});
          for (const r of e.responses) {
            q.push({owner: r, parent: undefined, type: r.type, typeDepth: 0, useDepth: 1, skip: false});
          }
        }

        for (const c of input.continuations || []) {
          for (const m of c.mappings) {
            for (const p of m.source.propertyPath || []) {
              q.push({owner: p, parent: undefined, type: p.type, typeDepth: 0, useDepth: 0, skip: false});
            }
            for (const p of m.target.propertyPath || []) {
              q.push({owner: p, parent: undefined, type: p.type, typeDepth: 0, useDepth: 0, skip: false});
            }
          }
        }

      } else if ('type' in input) {
        q.push({owner: input, parent: undefined, type: input.type, typeDepth: 0, useDepth: 0, skip: false});
      } else {
        q.push({owner: undefined, parent: undefined, type: input, typeDepth: 0, useDepth: 0, skip: false});
      }
    }

    const visited: OmniType[] = [];
    while (q.length > 0) {

      const dq = q.shift();
      if (!dq) {
        break;
      }

      if (visitOnce) {
        if (visited.includes(dq.type)) {
          continue;
        }

        visited.push(dq.type);
      }

      let result: R | undefined | void;
      if (onDown) {
        result = onDown(dq);
        if (result !== undefined) return result;
        if (dq.skip) {
          continue;
        }
      }

      const type = dq.type;

      switch (type.kind) {
        case OmniTypeKind.OBJECT:
          if (type.extendedBy) q.push({...dq, owner: type, parent: type, type: type.extendedBy, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});

          for (const p of type.properties) {
            q.push({...dq, owner: p, parent: undefined, type: p.type, useDepth: dq.useDepth + 1});
          }
          break;
        case OmniTypeKind.TUPLE:
          q.push(...type.types.map(it => {
            return {...dq, owner: type, parent: undefined, type: it, useDepth: dq.useDepth + 1};
          }));

          if (type.commonDenominator) q.push({...dq, owner: type, parent: undefined, type: type.commonDenominator, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION:
          for (const p of type.properties) {
            q.push({...dq, owner: p, parent: undefined, type: p.type, useDepth: dq.useDepth + 1});
          }

          if (type.commonDenominator) q.push({...dq, owner: type, parent: undefined, type: type.commonDenominator, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.UNION:
        case OmniTypeKind.EXCLUSIVE_UNION:
        case OmniTypeKind.INTERSECTION:
        case OmniTypeKind.NEGATION:
          q.push(...type.types.map(it => {
            return {...dq, owner: type, parent: undefined, type: it, useDepth: dq.useDepth + 1};
          }));
          break;
        case OmniTypeKind.ARRAY:
          q.push({...dq, owner: type, parent: undefined, type: type.of, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.DICTIONARY:
          q.push({...dq, owner: type, parent: undefined, type: type.keyType, useDepth: dq.useDepth + 1});
          q.push({...dq, owner: type, parent: undefined, type: type.valueType, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.GENERIC_SOURCE:
          q.push({...dq, owner: type, parent: type, type: type.of, useDepth: dq.useDepth + 1});
          q.push(...type.sourceIdentifiers.map(it => {
            return {...dq, owner: type, parent: undefined, type: it, useDepth: dq.useDepth + 1};
          }));
          break;
        case OmniTypeKind.GENERIC_TARGET:
          q.push({...dq, owner: type, parent: type, type: type.source, useDepth: dq.useDepth + 1});
          q.push(...type.targetIdentifiers.map(it => {
            return {...dq, owner: type, parent: type, type: it, useDepth: dq.useDepth + 1};
          }));
          break;
        case OmniTypeKind.GENERIC_TARGET_IDENTIFIER:
          q.push({...dq, owner: type, parent: undefined, type: type.type, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.GENERIC_SOURCE_IDENTIFIER:
          if (type.lowerBound) q.push({...dq, owner: type, parent: undefined, type: type.lowerBound, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          if (type.upperBound) q.push({...dq, owner: type, parent: undefined, type: type.upperBound, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          if (type.knownEdgeTypes) {
            for (const edge of type.knownEdgeTypes) {
              q.push({...dq, owner: type, parent: undefined, type: edge, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
            }
          }
          break;
        case OmniTypeKind.INTERFACE:
          q.push({...dq, owner: type, parent: type, type: type.of, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.DECORATING:
          q.push({...dq, owner: type, parent: type, type: type.of, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.UNKNOWN:
          if (type.upperBound) {
            q.push({...dq, owner: type, parent: type, type: type.upperBound, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          }
          break;
        // case OmniTypeKind.PRIMITIVE:
        case OmniTypeKind.ENUM:
        case OmniTypeKind.HARDCODED_REFERENCE:
          // There are no type children of these
          break;
        case OmniTypeKind.EXTERNAL_MODEL_REFERENCE:
          // NOTE: Should it be allowed to follow this?
          // TODO: Allow to follow if the external reference is into our own model
          break;
        default: {
          if (OmniUtil.isPrimitive(type)) {
            break;
          }

          throw new Error(`Do not know how to handle kind '${(type as any)?.kind || '?'}' (${getShallowPayloadString(type, 2)})`);
        }
      }
    }

    return undefined;
  }

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

      const replacement = ctx.replacement;
      if (replacement !== undefined) {

        // We have been told to replace the input with this other type.
        // The caller probably modified the type tree somehow.
        if (ctx.parent) {
          OmniUtil.swapType(ctx.parent, ctx.type, replacement, 1);
        } else {
          const from = OmniUtil.describe(ctx.type);
          const to = !replacement ? 'Removed' : OmniUtil.describe(replacement);
          logger.warn(`Could not swap '${from}' with ${to}' since no parent was known`);
        }

        if (!replacement) {
          ctx.replacement = undefined;
          return undefined;
        } else {

          // And we will instead keep searching downwards along the replacement.
          input = replacement;
          ctx.replacement = undefined;
        }
      }

      if (result !== undefined) return result;

      if (ctx.skip) {
        ctx.skip = false;
        return undefined;
      }

      if (replacement) {
        const replacementResult = this.visitTypesDepthFirstInternal(replacement, ctx, onDown, onUp);
        if (replacementResult !== undefined) {
          return replacementResult;
        }
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
