import {LoggerFactory} from '@omnigen/core-log';
import {
  CompositionKind,
  OmniCompositionType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniPrimitiveKind,
  OmniPrimitiveUndefined,
  OmniType,
  OmniTypeKind,
  ParserOptions,
  TargetOptions,
} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';
import {OmniUtil} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will make the type of properties that are not required into a union type of `T | undefined`
 */
export class StrictUndefinedTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    if (args.options.strictUndefined) {
      return;
    }

    const typeToUndefinedMap = new Map<OmniType, OmniCompositionType>();

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      const properties = OmniUtil.getPropertiesOf(ctx.type);
      for (const property of properties) {
        if (property.required) {
          continue;
        }

        const existing = typeToUndefinedMap.get(property.type);
        if (existing) {

          property.type = existing;
          continue;
        }

        if (property.type.kind == OmniTypeKind.COMPOSITION) {

          if (property.type.types.find(it => OmniUtil.isUndefined(it))) {
            continue;
          }

          if (property.type.compositionKind == CompositionKind.OR || property.type.compositionKind == CompositionKind.XOR) {
            property.type.types.push(this.createUndefinedType());

          } else {
            throw new Error(`Do not yet know how to add 'undefined' to composition type ${OmniUtil.describe(property.type)}`);
          }
        } else {

          if (OmniUtil.isUndefined(property.type)) {
            continue;
          }

          const compositionType: OmniCompositionType = {
            kind: OmniTypeKind.COMPOSITION,
            compositionKind: CompositionKind.XOR,
            types: [property.type, this.createUndefinedType()],
          };

          typeToUndefinedMap.set(property.type, compositionType);

          property.type = compositionType;
        }
      }
    });
  }

  private createUndefinedType(): OmniPrimitiveUndefined {

    return {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.UNDEFINED,
    };
  }
}
