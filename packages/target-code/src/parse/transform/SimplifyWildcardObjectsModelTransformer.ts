import {OmniModelTransformer, OmniModelTransformerArgs, OmniObjectType, OmniTypeKind, OmniUnknownType, UnknownKind} from '@omnigen/core';
import {OmniReducer, OmniUtil} from '@omnigen/core-util';

/**
 * If an object has no properties but has pattern properties that match anything and has any type, then it can be replaced with an `unknown` type.
 */
export class SimplifyWildcardObjectsModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    const reducer = new OmniReducer({
      OBJECT: (n, a) => {
        if (this.isEmptyOrSinglePatternProperty(n)) {
          return {
            kind: OmniTypeKind.UNKNOWN,
            unknownKind: UnknownKind.OBJECT,
          } satisfies OmniUnknownType;
        }
        return a.base.OBJECT(n, a);
      },
    });
    args.model = reducer.reduce(args.model);
  }

  private isEmptyOrSinglePatternProperty(type: OmniObjectType) {
    return type.properties.length === 0 || type.properties.filter(it => OmniUtil.getPropertyNamePattern(it.name) === '.*').length == 1;
  }
}
