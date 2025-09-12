import {LoggerFactory} from '@omnigen/core-log';
import {OmniItemKind, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {OmniUtil, ProxyReducerOmni2} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';

const logger = LoggerFactory.create(import.meta.url);

export class PatternPropertyAnyTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    // TODO: Reintroduce ProxyReducerOmni2 once all its skipped tests are successful, and more tests have been added to cover all cases. Make it more battle tested and reliable.
    // args.model = ProxyReducerOmni2.builder().build({
    //   UNKNOWN: (_, r) => {
    //     const reduced = r.yieldBase();
    //     if (reduced && r.parent && r.parent.kind === OmniItemKind.PROPERTY && OmniUtil.isPatternPropertyName(r.parent.name)) {
    //       if (reduced.kind === OmniTypeKind.UNKNOWN && reduced.unknownKind === UnknownKind.DYNAMIC_OBJECT) {
    //         // TODO: This is slightly weird, turning it back to ANY when JsonSchemaParser turned it into DYNAMIC_OBJECT from ANY.
    //         //        Should be a smarter way of knowing if property is a pattern property for additional properties, so we don't change the type when we want it to stay.
    //         r.replace({
    //           ...reduced,
    //           unknownKind: UnknownKind.ANY,
    //           debug: OmniUtil.addDebug(reduced.debug, `DYNAMIC_OBJECT -> ANY because TS has native pattern properties`),
    //         });
    //       }
    //     }
    //   },
    // }).reduce(args.model);

    // // REMOVE
    // OmniUtil.visitTypesDepthFirst(args.model, ctx => {
    //
    //   if (ctx.type.kind === OmniTypeKind.OBJECT || ctx.type.kind === OmniTypeKind.INTERFACE) {
    //
    //     for (const property of OmniUtil.getPropertiesOf(ctx.type)) {
    //       if (OmniUtil.isPatternPropertyName(property.name)) {
    //         if (property.type.kind === OmniTypeKind.UNKNOWN && property.type.unknownKind === UnknownKind.DYNAMIC_OBJECT) {
    //           // TODO: This is slightly weird, turning it back to ANY when JsonSchemaParser turned it into DYNAMIC_OBJECT from ANY.
    //           //        Should be a smarter way of knowing if property is a pattern property for additional properties, so we don't change the type when we want it to stay.
    //           property.type = {...property.type, unknownKind: UnknownKind.ANY};
    //         }
    //       }
    //     }
    //   }
    // });
  }
}
