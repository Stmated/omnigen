import {AstNode, VisitFn} from '@omnigen/api';
import {Ts} from '../ast';
import {CodeVisitor, createCodeVisitor} from '@omnigen/target-code';

export type TypeScriptVisitFn<N extends AstNode, R> = VisitFn<N, R, TypeScriptVisitor<R>>;

export interface TypeScriptVisitor<R> extends CodeVisitor<R> {

  visitCompositionType: TypeScriptVisitFn<Ts.CompositionType, R>;
  visitTypeAliasDeclaration: TypeScriptVisitFn<Ts.TypeAliasDeclaration, R>;
  visitGetter: TypeScriptVisitFn<Ts.Getter, R>;
  visitSetter: TypeScriptVisitFn<Ts.Setter, R>;
}

export const createTypeScriptVisitor = <R>(partial?: Partial<TypeScriptVisitor<R>>, java?: Partial<CodeVisitor<R>>, noop?: R | undefined): Readonly<TypeScriptVisitor<R>> => {

  return {
    ...createCodeVisitor(java, noop),
    visitCompositionType: (n, v) => n.typeNodes.map(it => it.visit(v)),
    visitTypeAliasDeclaration: (n, v) => [
      n.modifiers?.visit(v),
      n.name.visit(v),
      n.of.visit(v),
      n.comments?.visit(v),
    ],
    visitGetter: (n, v) => [n.modifiers.visit(v), n.identifier.visit(v), n.target?.visit(v), n.returnType.visit(v)],
    visitSetter: (n, v) => [n.identifier.visit(v), n.targetType.visit(v), n.target.visit(v)],
  };
};

export const DefaultTypeScriptVisitor = createTypeScriptVisitor();
