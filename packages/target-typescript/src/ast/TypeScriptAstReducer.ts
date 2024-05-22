import {TypeScriptVisitor} from '../visit';
import {Ts} from '../ast';
import {Reducer} from '@omnigen/core';
import {assertDefined, isDefined} from '@omnigen/core-util';
import {createCodeReducer} from '@omnigen/target-code';

export type TypeScriptAstReducer = Reducer<TypeScriptVisitor<unknown>>

export const createTypeScriptAstReducer = (partial?: Partial<Reducer<TypeScriptVisitor<unknown>>>): TypeScriptAstReducer => {

  return {
    ...createCodeReducer(partial),
    reduceCompositionType: (node, reducer) => new Ts.CompositionType(
      node.omniType,
      node.typeNodes.map(it => it.reduce(reducer)).filter(isDefined),
    ),
    reduceTypeAliasDeclaration: (node, reducer) => new Ts.TypeAliasDeclaration(
      assertDefined(node.name.reduce(reducer)),
      assertDefined(node.of.reduce(reducer)),
      node.modifiers?.reduce(reducer),
    ),
  };
};

export const DefaultTypeScriptAstReducer = createTypeScriptAstReducer();
