// import {createJavaVisitor, JavaVisitor} from '@omnigen/target-java';
import {AstNode, VisitFn} from '@omnigen/core';
import {Ts} from '../ast';
import {CodeVisitor, createCodeVisitor} from '@omnigen/target-code';

export type TypeScriptVisitFn<N extends AstNode, R> = VisitFn<N, R, TypeScriptVisitor<R>>;

export interface TypeScriptVisitor<R> extends CodeVisitor<R> {

  visitCompositionType: TypeScriptVisitFn<Ts.CompositionType, R>;
  visitTypeAliasDeclaration: TypeScriptVisitFn<Ts.TypeAliasDeclaration, R>;
}

export const createTypeScriptVisitor = <R>(partial?: Partial<TypeScriptVisitor<R>>, java?: Partial<CodeVisitor<R>>, noop?: R | undefined): Readonly<TypeScriptVisitor<R>> => {

  return {
    ...createCodeVisitor(java, noop),
    visitCompositionType: (node, visitor) => node.typeNodes.map(it => it.visit(visitor)),
    visitTypeAliasDeclaration: (node, visitor) => [
      node.modifiers?.visit(visitor),
      node.of.visit(visitor),
    ],
  };
};

export const DefaultTypeScriptVisitor = createTypeScriptVisitor();
