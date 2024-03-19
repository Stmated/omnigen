import {createJavaVisitor, JavaVisitor} from '@omnigen/target-java';
import {AstNode, VisitFn} from '@omnigen/core';
import {Ts} from '../ast';

export type TypeScriptVisitFn<N extends AstNode, R> = VisitFn<N, R, TypeScriptVisitor<R>>;

export interface TypeScriptVisitor<R> extends JavaVisitor<R> {

  visitCompositionType: TypeScriptVisitFn<Ts.CompositionType, R>;
  visitTypeAliasDeclaration: TypeScriptVisitFn<Ts.TypeAliasDeclaration, R>;
}

export const createTypeScriptVisitor = <R>(partial?: Partial<TypeScriptVisitor<R>>, java?: Partial<JavaVisitor<R>>, noop?: R | undefined): Readonly<TypeScriptVisitor<R>> => {

  return {
    ...createJavaVisitor(java, noop),
    visitCompositionType: (node, visitor) => {
      return node.typeNodes.map(it => it.visit(visitor));
    },
    visitTypeAliasDeclaration: (node, visitor) => {
      return node.of.visit(visitor);
    },
  };
};

export const DefaultTypeScriptVisitor = createTypeScriptVisitor();
