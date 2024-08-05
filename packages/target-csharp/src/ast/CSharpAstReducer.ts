import {CSharpVisitor} from '../visit';
import {Cs} from '../ast';
import {Reducer} from '@omnigen/api';
import {assertDefined} from '@omnigen/core';
import {Code, CodeVisitor, createCodeReducer} from '@omnigen/target-code';

export type CSharpAstReducer = Reducer<CSharpVisitor<unknown>>

export const createCSharpAstReducer = (partial?: Partial<Reducer<CodeVisitor<unknown>>>): CSharpAstReducer => {

  return {
    ...createCodeReducer(partial),

    reduceProperty: (n, r) => {

      const pn = new Cs.PropertyNode(
        assertDefined(n.type.reduce(r)),
        assertDefined(n.identifier.reduce(r)),
      ).withIdFrom(n);

      if (n.property) {
        pn.property = n.property;
      }

      pn.modifiers = n.modifiers?.reduce(r);

      pn.getModifiers = n.getModifiers?.reduce(r);
      pn.setModifiers = n.setModifiers?.reduce(r);

      pn.initializer = n.initializer?.reduce(r);

      pn.comments = n.comments?.reduce(r);
      pn.annotations = n.annotations?.reduce(r);
      pn.immutable = n.immutable;

      return pn;
    },
    reducePropertyIdentifier: (n, r) => {
      const reduced = n.identifier.reduce(r);
      if (!reduced) {
        return undefined;
      }

      return new Cs.PropertyIdentifier(reduced).withIdFrom(n);
    },
    reducePropertyReference: (n, r) => {
      return new Cs.PropertyReference(n.targetId).withIdFrom(n);
    },
    reduceNamespace: (n, r) => {
      const block = n.block.reduce(r);
      if (!block) {
        return undefined;
      }
      return new Code.Namespace(
        assertDefined(n.name.reduce(r)),
        block,
      ).withIdFrom(n);
    },
  };
};

export const DefaultCSharpAstReducer = createCSharpAstReducer();
