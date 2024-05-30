import {TypeScriptVisitor} from '../visit';
import {Ts} from '../ast';
import {Reducer} from '@omnigen/core';
import {assertDefined, isDefined} from '@omnigen/core-util';
import {createCodeReducer} from '@omnigen/target-code';

export type TypeScriptAstReducer = Reducer<TypeScriptVisitor<unknown>>

export const createTypeScriptAstReducer = (partial?: Partial<Reducer<TypeScriptVisitor<unknown>>>): TypeScriptAstReducer => {

  return {
    ...createCodeReducer(partial),
    reduceCompositionType: (n, r) => new Ts.CompositionType(
      n.omniType,
      n.typeNodes.map(it => it.reduce(r)).filter(isDefined),
    ),
    reduceTypeAliasDeclaration: (n, r) => new Ts.TypeAliasDeclaration(
      assertDefined(n.name.reduce(r)),
      assertDefined(n.of.reduce(r)),
      n.modifiers?.reduce(r),
    ),
    reduceGetter: (n, r) => new Ts.Getter(
      assertDefined(n.identifier.reduce(r)),
      assertDefined(n.target.reduce(r)),
      assertDefined(n.returnType.reduce(r)),
      n.comments?.reduce(r),
      assertDefined(n.modifiers.reduce(r)),
    ),
    reduceSetter: (n, r) => {
      const identifier = assertDefined(n.identifier.reduce(r));
      if (!(identifier instanceof Ts.SetterIdentifier)) {
        throw new Error(`The setter must have a SetterIdentifier`);
      }

      return new Ts.Setter(
        identifier,
        assertDefined(n.targetType.reduce(r)),
        assertDefined(n.target.reduce(r)),
        assertDefined(n.modifiers.reduce(r)),
      );
    },
  };
};

export const DefaultTypeScriptAstReducer = createTypeScriptAstReducer();
