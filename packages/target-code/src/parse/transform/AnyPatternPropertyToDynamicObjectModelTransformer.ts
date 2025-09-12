import {OmniModelTransformer, OmniModelTransformerArgs, OmniTypeKind, UnknownKind} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil, ProxyReducerOmni2} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Change the type of a pattern property from ANY to DYNAMIC_OBJECT, since that is often more beneficial for some target languages.
 */
export class AnyPatternPropertyToDynamicObjectModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      PROPERTY: (n, r) => {

        if (OmniUtil.isPatternPropertyName(n.name) && n.type.kind === OmniTypeKind.UNKNOWN && n.type.unknownKind == UnknownKind.ANY) {

          r.replace({
            ...n,
            type: {
              ...n.type,
              unknownKind: UnknownKind.DYNAMIC_OBJECT,
            },
            debug: OmniUtil.addDebug(n.debug, `ANY -> DYNAMIC_OBJECT, since that is sometimes better `),
          });
        }
      },
    });
  }
}
