import {AstTransformer, AstTransformerArguments, OmniGenericSourceIdentifierType, OmniType, OmniTypeKind, TypeNode} from '@omnigen/api';
import {ProxyReducerOmni2} from '@omnigen/core';
import * as Code from '../CodeAst';
import {CodeRootAstNode} from '../CodeRootAstNode';

/**
 * To simplify other code, this will search through the AST and replace any found GENERIC_SOURCE_IDENTIFIER with the currently scoped, actual, type.
 *
 * This means that other transformers can simply take a type from a supertype, and it will be resolved as a batch later by this transformer.
 *
 * An example of a situation where you might be using a supertype's type is for constructors that will call the super-constructor.
 */
export class ResolveGenericSourceIdentifiersAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    const stack: Map<OmniGenericSourceIdentifierType, OmniType>[] = [];

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceClassDeclaration: (n, r) => {
        const doPop = this.findSourceIdentifierMappings(n, stack);
        try {
          return defaultReducer.reduceClassDeclaration(n, r);
        } finally {
          if (doPop) {
            stack.pop();
          }
        }
      },
      reduceInterfaceDeclaration: (n, r) => {
        const doPop = this.findSourceIdentifierMappings(n, stack);
        try {
          return defaultReducer.reduceInterfaceDeclaration(n, r);
        } finally {
          if (doPop) {
            stack.pop();
          }
        }
      },

      reduceEdgeType: (n, r) => {

        if (n.omniType.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {

          const replacement = (stack.length > 0) ? stack[stack.length - 1].get(n.omniType) : undefined;
          if (replacement) {
            return args.root.getAstUtils().createTypeNode(replacement);
          }
        }

        return defaultReducer.reduceEdgeType(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private findSourceIdentifierMappings(n: Code.AbstractObjectDeclaration, stack: Map<OmniGenericSourceIdentifierType, OmniType>[]) {

    let superTypes: TypeNode[] | undefined;
    if (n.extends) {
      superTypes = n.extends.types.children;
    }

    if (n.implements) {
      superTypes = (superTypes ?? []).concat(n.implements.types.children);
    }

    if (superTypes && superTypes.length > 0) {

      const map = new Map<OmniGenericSourceIdentifierType, OmniType>();
      for (const superType of superTypes) {
        this.findGenericSourceIdentifiers(superType.omniType, map);
      }

      if (map.size > 0) {
        stack.push(map);
        return true;
      }
    }

    return false;
  }

  private findGenericSourceIdentifiers(type: OmniType, map: Map<OmniGenericSourceIdentifierType, OmniType>): void {

    ProxyReducerOmni2.builder().reduce(type, {immutable: true}, {
      OBJECT: () => {
      },
      GENERIC_SOURCE: () => {
      },
      GENERIC_TARGET_IDENTIFIER: n => {
        map.set(n.sourceIdentifier, n.type);
      },
    });
  }
}
