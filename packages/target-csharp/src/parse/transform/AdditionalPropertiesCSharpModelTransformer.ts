import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniType, OmniTypeKind, OmniUnknownType, ParserOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {ANY_KIND, OmniUtil, ProxyReducerOmni2} from '@omnigen/core';
import {CSharpOptions} from '../../options';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces a property with a pattern name with an unknown object type.
 */
export class AdditionalPropertiesCSharpModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & CSharpOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & CSharpOptions>): void {

    const patternPropertyTypeStack: OmniType[] = [];

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {

      PROPERTY: (n, r) => {

        if (OmniUtil.isPatternPropertyName(n.name)) {

          try {
            patternPropertyTypeStack.push(n.type);
            r.yieldBase();
          } finally {
            patternPropertyTypeStack.pop();
          }

        } else {
          r.callBase();
        }
      },

      UNKNOWN: (n, r) => {

        if (patternPropertyTypeStack.length > 0 && patternPropertyTypeStack[patternPropertyTypeStack.length - 1] === n) {

          // This unknown type is the direct child of a property with a pattern name.
          // To make things easier to work with when it comes to C#, we should make the unknown type into a "dynamic object" instead of "any".
          if (n.unknownKind === UnknownKind.ANY || n.unknownKind === UnknownKind.DYNAMIC) {

            const newKind = UnknownKind.DYNAMIC_OBJECT;
            const replacement: OmniUnknownType = {
              ...n,
              unknownKind: newKind,
              debug: OmniUtil.addDebug(n.debug, `Changed from ${n.unknownKind} to ${newKind}, since it is better suitable for C# for pattern properties`),
            };

            r.replace(replacement);
            return;
          }
        }

        r.callBase();
      },
    });
  }
}
