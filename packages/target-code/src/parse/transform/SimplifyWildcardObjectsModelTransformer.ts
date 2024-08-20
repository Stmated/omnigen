import {OmniModelTransformer, OmniModelTransformerArgs, OmniObjectType, OmniTypeKind, OmniUnknownType, UnknownKind} from '@omnigen/api';
import {OmniUtil, ProxyReducerOmni} from '@omnigen/core';

/**
 * If an object has no properties but has pattern properties that match anything and has any type, then it can be replaced with an `unknown` type.
 */
export class SimplifyWildcardObjectsModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    const reducer = ProxyReducerOmni.builder().build({
      OBJECT: (n, a) => {
        if (this.isEmptyOrSinglePatternProperty(n)) {
          return {
            kind: OmniTypeKind.UNKNOWN,
            unknownKind: UnknownKind.OBJECT,
          } satisfies OmniUnknownType;
        }
        return a.next(n);
      },
    });
    args.model = reducer.reduce(args.model);
  }

  private isEmptyOrSinglePatternProperty(type: OmniObjectType) {
    return type.properties.length === 0 || type.properties.filter(it => OmniUtil.getPropertyNamePattern(it.name) === '.*').length == 1;
  }
}
