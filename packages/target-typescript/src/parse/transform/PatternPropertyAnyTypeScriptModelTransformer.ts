import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';

const logger = LoggerFactory.create(import.meta.url);

export class PatternPropertyAnyTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind === OmniTypeKind.OBJECT || ctx.type.kind === OmniTypeKind.INTERFACE) {

        for (const property of OmniUtil.getPropertiesOf(ctx.type)) {
          if (OmniUtil.isPatternPropertyName(property.name)) {
            if (property.type.kind === OmniTypeKind.UNKNOWN && property.type.unknownKind === UnknownKind.DYNAMIC_OBJECT) {

              // TODO: This is slightly weird, turning it back to ANY when JsonSchemaParser turned it into DYNAMIC_OBJECT from ANY.
              //        There should be a smarter way of knowing if the property is a pattern property for additional properties or something else, so we don't change the type when we want it to stay.
              property.type = {...property.type, unknownKind: UnknownKind.ANY};
            }
          }
        }
      }
    });
  }
}
