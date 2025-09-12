import {OmniExclusiveUnionType, OmniModelTransformer, OmniModelTransformerArgs, OmniTypeKind, OmniUnionType} from '@omnigen/api';
import {OmniUtil} from '../OmniUtil';
import {LoggerFactory} from '@omnigen/core-log';
import {ProxyReducerOmni2} from '../../reducer2/ProxyReducerOmni2';
import {MutableProxyReducerInterface} from '../../reducer2/types.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Simplifies nullable primitives so that if there is a composition like `string | null` it becomes just `String`.
 */
export class SimplifyNullablePrimitivesModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    if (args.options.simplifyTypeHierarchy) {

      args.model = ProxyReducerOmni2.builder().reduce(args.model, {immutable: false}, {
        UNION: (n, r) => {
          const reduced = r.yieldBase();
          if (reduced && reduced.kind === OmniTypeKind.UNION) {
            SimplifyNullablePrimitivesModelTransformer.simplifyUnion(reduced, r);
          }
        },
        EXCLUSIVE_UNION: (n, r) => {
          const reduced = r.yieldBase();
          if (reduced && reduced.kind === OmniTypeKind.EXCLUSIVE_UNION) {
            SimplifyNullablePrimitivesModelTransformer.simplifyUnion(reduced, r);
          }
        },
      });
    }

    // if (args.options.simplifyTypeHierarchy) {
    //
    //   args.model = ProxyReducerOmni2.builder().reduce(args.model, {immutable: false}, {
    //     INTERSECTION: (n, r) => {
    //       if (n.types.length === 1) {
    //         r.replace(r.reduce(n.types[0]));
    //       }
    //     },
    //   });
    // }
  }

  /**
   * TODO: This should be moved to its own transformer that ONLY deals with making a `T | null` into `T?` -- not really relevant just for supertype simplification.
   */
  private static simplifyUnion(
    composition: OmniUnionType | OmniExclusiveUnionType,
    r: MutableProxyReducerInterface<OmniUnionType | OmniExclusiveUnionType, OmniUnionType | OmniExclusiveUnionType, any, any, any, any>,
  ): void {

    let changeCount = 0;
    let newTypes = [...composition.types];

    if (newTypes.length === 2) {
      for (let i = 0; i < newTypes.length; i++) {

        const type = OmniUtil.getUnwrappedType(newTypes[i]);
        if (OmniUtil.isNull(type)) {

          // One of the union members is `null` -- it can be removed and instead the other type can be made nullable.
          const otherIndex = (i === 0) ? 1 : 0;
          const otherType = newTypes[otherIndex];
          const otherUnwrappedType = OmniUtil.getUnwrappedType(otherType);

          newTypes.splice(i, 1);
          changeCount++;

          // TODO: We should not do this -- we're setting "nullable" to the original composition member! It might be used in different contexts!
          // TODO: Instead we should use a type decorator, and say on the decorator that the type is nullable. But decorators are not supported everywhere.
          otherUnwrappedType.nullable = true;

          if (!OmniUtil.isNullableType(otherUnwrappedType)) {
            const referenceType = OmniUtil.toReferenceType(otherType);
            newTypes[0] = referenceType
            if (referenceType !== otherType) {
              changeCount++;
            }
          }

          break;
        }
      }
    }

    if (changeCount > 0) {
      r.put('types', newTypes);
    }
  }
}
