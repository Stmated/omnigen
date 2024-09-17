import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';

const logger = LoggerFactory.create(import.meta.url);

export class PatternPropertyAnyTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    // TODO: Reintroduce ProxyReducerOmni2 once all its skipped tests are successful, and more tests have been added to cover all cases. Make it more battle tested and reliable.
    // const original = args.model;
    // args.model = ProxyReducerOmni2.builder().build({
    //   UNKNOWN: (n, r) => {
    //     const reduced = r.next();
    //     if (reduced && r.parent && r.parent.kind === OmniItemKind.PROPERTY && OmniUtil.isPatternPropertyName(r.parent.name)) {
    //       if (reduced.kind === OmniTypeKind.UNKNOWN && reduced.unknownKind === UnknownKind.DYNAMIC_OBJECT) {
    //         // TODO: This is slightly weird, turning it back to ANY when JsonSchemaParser turned it into DYNAMIC_OBJECT from ANY.
    //         //        Should be a smarter way of knowing if property is a pattern property for additional properties, so we don't change the type when we want it to stay.
    //         return {
    //           ...reduced,
    //           unknownKind: UnknownKind.ANY,
    //           debug: OmniUtil.addDebug(reduced.debug, `DYNAMIC_OBJECT -> ANY because TS has native pattern properties`),
    //         };
    //       }
    //     }
    //
    //     return reduced;
    //   },
    // }).reduce(args.model);

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind === OmniTypeKind.OBJECT || ctx.type.kind === OmniTypeKind.INTERFACE) {

        for (const property of OmniUtil.getPropertiesOf(ctx.type)) {
          if (OmniUtil.isPatternPropertyName(property.name)) {
            if (property.type.kind === OmniTypeKind.UNKNOWN && property.type.unknownKind === UnknownKind.DYNAMIC_OBJECT) {
              // TODO: This is slightly weird, turning it back to ANY when JsonSchemaParser turned it into DYNAMIC_OBJECT from ANY.
              //        Should be a smarter way of knowing if property is a pattern property for additional properties, so we don't change the type when we want it to stay.
              property.type = {...property.type, unknownKind: UnknownKind.ANY};
            }
          }
        }
      }
    });
  }
}
