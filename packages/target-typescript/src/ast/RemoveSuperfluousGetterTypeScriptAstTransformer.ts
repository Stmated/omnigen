import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';
import {Ts} from '../';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If field original name is same as current name, then remove the getter
 */
export class RemoveSuperfluousGetterTypeScriptAstTransformer implements AstTransformer<Ts.TsRootNode> {

  transformAst(args: AstTransformerArguments<Ts.TsRootNode, TargetOptions>): void {

    const gettersToRemove: Ts.FieldBackedGetter[] = [];
    const fieldsToMakePublic: Ts.Field[] = [];

    args.root.visit({
      ...args.root.createVisitor(),
      visitFieldBackedGetter: n => {
        const field = args.root.resolveNodeRef(n.fieldRef);
        if (field) {

          if (!field.identifier.original || field.identifier.value != field.identifier.original) {
            return;
          }

          const property = field.property;
          if (property) {

            const accessorName = OmniUtil.getPropertyAccessorNameOnly(property.name);
            const fieldName = OmniUtil.getPropertyFieldName(property.name);
            if (accessorName && accessorName != fieldName) {
              return;
            }
          }

          fieldsToMakePublic.push(field);
        }

        gettersToRemove.push(n);
      },
    });

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,

      reduceField: (n, r) => {

        if (fieldsToMakePublic.includes(n)) {

          // NOTE: This should not be allowed later on; everything should be read-only and need to be fully re-created. No assignments like below.
          const newModifiers = n.modifiers.children.filter(it => it.type !== Ts.ModifierType.PRIVATE);
          n.modifiers = new Ts.ModifierList(...newModifiers).withIdFrom(n.modifiers);

          return n;
        }

        return defaultReducer.reduceField(n, r);
      },

      reduceFieldBackedGetter: (n, r) => {

        if (gettersToRemove.includes(n)) {
          return undefined;
        } else {
          return defaultReducer.reduceFieldBackedGetter(n, r);
        }
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
