import {OmniModel, OmniNullType, OmniType, OmniTypeKind} from './OmniModel';
import {OmniUtil, TypeOwner} from './OmniUtil';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(__filename);

export interface DFSTraverseContext {
  type: OmniType;
  parent: TypeOwner<OmniType> | undefined;
  replacement?: OmniType | undefined;
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
  owner: TypeOwner<OmniType> | undefined;
  typeDepth: number;
  useDepth: number;
  skip: boolean;
}

export interface BFSTraverseCallback<R> {
  (ctx: BFSTraverseContext): R | void;
}

export class OmniTypeVisitor {

  private static readonly _NULL_TYPE: OmniNullType = {kind: OmniTypeKind.NULL};

  public visitTypesBreadthFirst<R>(
    input: TypeOwner<OmniType> | undefined,
    onDown: BFSTraverseCallback<R>,
    visitOnce = true,
  ): R | undefined {

    if (!input) {
      return undefined;
    }

    // TODO: Improve speed of this common code by using an object pool and set specific properties, instead of spread

    const q: BFSTraverseContext[] = [];

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
            q.push({owner: p, parent: undefined, type: p.owner, typeDepth: 0, useDepth: 0, skip: false});
            q.push({owner: p, parent: undefined, type: p.type, typeDepth: 0, useDepth: 0, skip: false});
          }
          for (const p of m.target.propertyPath || []) {
            q.push({owner: p, parent: undefined, type: p.owner, typeDepth: 0, useDepth: 0, skip: false});
            q.push({owner: p, parent: undefined, type: p.type, typeDepth: 0, useDepth: 0, skip: false});
          }
        }
      }

    } else if ('type' in input) {
      q.push({owner: input, parent: undefined, type: input.type, typeDepth: 0, useDepth: 0, skip: false});
    } else {
      q.push({owner: undefined, parent: undefined, type: input, typeDepth: 0, useDepth: 0, skip: false});
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

          // We have been told to skip. In a breadth-first context this means skipping all remaining siblings.
          // Then back to the start, we will be picking up the last peeked node inside eatSiblings.
          // this.eatSiblings(q, dq, it => it.shift());
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
        case OmniTypeKind.ARRAY_TYPES_BY_POSITION:
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
        case OmniTypeKind.COMPOSITION:
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
          break;
        case OmniTypeKind.INTERFACE:
          q.push({...dq, owner: type, parent: type, type: type.of, typeDepth: dq.typeDepth + 1, useDepth: dq.useDepth + 1});
          break;
        case OmniTypeKind.PRIMITIVE:
        case OmniTypeKind.NULL:
        case OmniTypeKind.UNKNOWN:
        case OmniTypeKind.ENUM:
        case OmniTypeKind.HARDCODED_REFERENCE:
          // There are no type children of these
          break;
        case OmniTypeKind.EXTERNAL_MODEL_REFERENCE:
          // NOTE: Should it be allowed to follow this?
          // TODO: Allow to follow if the external reference is into our own model
          break;
        default:
          throw new Error(`Do not know how to handle kind '${(type as any)?.kind || '?'}`);
      }
    }

    return undefined;
  }

  public visitTypesDepthFirst<R>(
    input: TypeOwner<OmniType> | undefined,
    onDown?: DFSTraverseCallback<R>,
    onUp?: DFSTraverseCallback<R>,
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
      return this.visitModelDepthFirst(input, ctx, onDown, onUp);
    } else if ('type' in input) {

      ctx.parent = input;
      this.visitTypesDepthFirstInternal(input.type, ctx, onDown, onUp);
    } else {
      return this.visitTypesDepthFirstInternal(input, ctx, onDown, onUp);
    }

    return undefined;
  }

  private visitModelDepthFirst<R>(
    input: OmniModel,
    ctx: DFSTraverseContext,
    onDown: DFSTraverseCallback<R> | undefined,
    onUp: DFSTraverseCallback<R> | undefined,
  ) {

    let result: R | undefined = undefined;
    for (const e of input.endpoints) {

      ctx.parent = e.request;
      result = this.visitTypesDepthFirstInternal(e.request.type, ctx, onDown, onUp);
      if (result !== undefined) return result;

      for (const r of e.responses) {
        ctx.parent = r;
        result = this.visitTypesDepthFirstInternal(r.type, ctx, onDown, onUp);
        if (result !== undefined) return result;
      }
    }

    for (const c of input.continuations || []) {
      for (const m of c.mappings) {

        for (const p of m.source.propertyPath || []) {
          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.owner, ctx, onDown, onUp);
          if (result !== undefined) return result;

          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp);
          if (result !== undefined) return result;
        }
        for (const p of m.target.propertyPath || []) {
          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.owner, ctx, onDown, onUp);
          if (result !== undefined) return result;

          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp);
          if (result !== undefined) return result;
        }
      }
    }

    for (const t of input.types) {
      ctx.parent = input;
      result = this.visitTypesDepthFirstInternal(t, ctx, onDown, onUp);
      if (result !== undefined) return result;
    }

    return undefined;
  }

  private visitTypesDepthFirstInternal<R>(
    input: OmniType | OmniType[] | undefined,
    ctx: DFSTraverseContext,
    onDown?: DFSTraverseCallback<R>,
    onUp?: DFSTraverseCallback<R>,
  ): R | undefined {

    if (!input) {
      return undefined;
    }

    let result: R | undefined;

    if (Array.isArray(input)) {
      for (const entry of input) {
        result = this.visitTypesDepthFirstInternal(entry, ctx, onDown, onUp);
        if (result !== undefined) return result;
      }
      return undefined;
    }

    if (ctx.visited.includes(input)) {
      return undefined;
    }

    ctx.visited.push(input);

    if (onDown) {
      ctx.type = input;
      const result = onDown(ctx);

      if (ctx.replacement) {

        // We have been told to replace the input with this other type.
        // The caller probably modified the type tree somehow.
        if (ctx.parent) {
          OmniUtil.swapType(ctx.parent, ctx.type, ctx.replacement, 1);
        } else {
          const from = OmniUtil.describe(ctx.type);
          const to = OmniUtil.describe(ctx.replacement);
          logger.warn(`Could not swap '${from}' with ${to}' since no parent was known`);
        }

        // And we will instead keep searching downwards along the replacement.
        input = ctx.replacement;
        ctx.replacement = undefined;

        // return undefined;
        // ctx.replacement = undefined;
      }

      if (result !== undefined) return result;
      // if (ctx.replacement) {
      //   return undefined;
      // }

      if (ctx.skip) {
        ctx.skip = false;
        return undefined;
      }
    }

    // Replace the context with a new one, which is one level deeper.
    // NOTE: We could improve memory use by implementing an object pool.
    ctx = {...ctx, parent: input, depth: ctx.depth + 1};

    switch (input.kind) {
      case OmniTypeKind.OBJECT:
        result = this.visitTypesDepthFirstInternal(input.extendedBy, ctx, onDown, onUp);
        if (result !== undefined) return result;

        for (const p of input.properties) {
          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp);
          if (result !== undefined) return result;
        }
        break;
      case OmniTypeKind.ARRAY_TYPES_BY_POSITION:
        result = this.visitTypesDepthFirstInternal(input.types, ctx, onDown, onUp);
        if (result !== undefined) return result;
        result = this.visitTypesDepthFirstInternal(input.commonDenominator, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION:
        for (const p of input.properties) {
          ctx.parent = p;
          result = this.visitTypesDepthFirstInternal(p.type, ctx, onDown, onUp);
          if (result !== undefined) return result;
        }
        ctx.parent = input;
        result = this.visitTypesDepthFirstInternal(input.commonDenominator, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.COMPOSITION:
        result = this.visitTypesDepthFirstInternal(input.types, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.ARRAY:
        result = this.visitTypesDepthFirstInternal(input.of, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.DICTIONARY:
        result = this.visitTypesDepthFirstInternal(input.keyType, ctx, onDown, onUp);
        if (result !== undefined) return result;
        result = this.visitTypesDepthFirstInternal(input.valueType, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.GENERIC_SOURCE:
        result = this.visitTypesDepthFirstInternal(input.sourceIdentifiers, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.GENERIC_TARGET:
        result = this.visitTypesDepthFirstInternal(input.source, ctx, onDown, onUp);
        if (result !== undefined) return result;
        result = this.visitTypesDepthFirstInternal(input.targetIdentifiers, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.GENERIC_TARGET_IDENTIFIER:
        result = this.visitTypesDepthFirstInternal(input.type, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.GENERIC_SOURCE_IDENTIFIER:
        result = this.visitTypesDepthFirstInternal(input.lowerBound, ctx, onDown, onUp);
        if (result !== undefined) return result;
        result = this.visitTypesDepthFirstInternal(input.upperBound, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.INTERFACE:
        result = this.visitTypesDepthFirstInternal(input.of, ctx, onDown, onUp);
        if (result !== undefined) return result;
        break;
      case OmniTypeKind.PRIMITIVE:
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNKNOWN:
      case OmniTypeKind.ENUM:
      case OmniTypeKind.HARDCODED_REFERENCE:
        // There are no type children of these
        break;
      case OmniTypeKind.EXTERNAL_MODEL_REFERENCE:
        // NOTE: Should it be allowed to follow this?
        // TODO: Allow to follow if the external reference is into our own model
        break;
      default:
        throw new Error(`Do not know how to handle kind '${(input as any).kind || '?'}`);
    }

    if (onUp) {
      const result = onUp({...ctx, type: input});
      if (result !== undefined) return result;
    }

    return undefined;
  }
}
