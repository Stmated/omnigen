import {TypeScriptVisitor} from '../visit';
import {Ts} from '../ast';
import {OmniCompositionType, Reducer} from '@omnigen/core';
import {createJavaReducer, JavaVisitor} from '@omnigen/target-java';
import {assertDefined, isDefined} from '@omnigen/core-util';

export type TypeScriptAstReducer = Reducer<TypeScriptVisitor<unknown>>

export const createTypeScriptAstReducer = (partial?: Partial<Reducer<JavaVisitor<unknown>>>): TypeScriptAstReducer => {

  return {
    ...createJavaReducer(partial),
    reduceCompositionType: (node, reducer) => new Ts.CompositionType<OmniCompositionType>(
      node.omniType,
      node.typeNodes.map(it => it.reduce(reducer)).filter(isDefined),
    ),
    reduceTypeAliasDeclaration: (node, reducer) => new Ts.TypeAliasDeclaration(
      assertDefined(node.name.reduce(reducer)),
      assertDefined(node.of.reduce(reducer)),
    ),
  };
};

export const DefaultTypeScriptAstReducer = createTypeScriptAstReducer();
