import {OmniExclusiveUnionType, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, OmniUnionType, TargetFeatures} from '@omnigen/api';
import {OmniUtil, ProxyReducerOmni} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If a union is too large, then some languages might prefer to merge the union into one new type that is less expressive but easier to work with.
 */
export class MergeLargeUnionLateModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    if (args.targetFeatures.unions) {

      // The target language supports unions, so it would be weird to make this lossy conversion.
      return;
    }

    args.model = ProxyReducerOmni.builder().build({
      UNION: (n, r) => r.next(this.maybeMerged(n, args.targetFeatures) ?? n),
      EXCLUSIVE_UNION: (n, r) => r.next(this.maybeMerged(n, args.targetFeatures) ?? n),
    }).reduce(args.model);

    // OmniUtil.visitTypesDepthFirst(args.model, ctx => {
    //   if (ctx.type.kind === OmniTypeKind.UNION || ctx.type.kind === OmniTypeKind.EXCLUSIVE_UNION) {
    //     const reduced = this.maybeMerged(ctx.type, args.targetFeatures);
    //     if (reduced) {
    //       ctx.replacement = reduced;
    //     }
    //     // const n = ctx.type;
    //     // const unimplementedProperties = this.collectUnimplementedPropertiesFromInterfaces(n);
    //     // if (unimplementedProperties.length > 0) {
    //     //
    //     //   // TODO: Add option for if we should make object abstract or actually add the property to the object
    //     //
    //     //   n.debug = OmniUtil.addDebug(n.debug, `Adding unimplemented interface properties ${unimplementedProperties.map(it => it.name).join(', ')}`);
    //     //   n.properties = [
    //     //     ...n.properties,
    //     //     ...unimplementedProperties.map(it => ({
    //     //       ...it,
    //     //       owner: n, // TODO: Remove the notion of `owner` someday, so we do not need to clone the property
    //     //     })),
    //     //   ];
    //     // }
    //   }
    // });

    // const reducer = new ReducerOmni({
    //   UNION: (n, a) => this.maybeReduce(n, a, args.targetFeatures),
    //   EXCLUSIVE_UNION: (n, a) => this.maybeReduce(n, a, args.targetFeatures),
    // });
    //
    // args.model = reducer.reduce(args.model);
  }

  private maybeMerged(n: OmniUnionType | OmniExclusiveUnionType, features: TargetFeatures) {

    const types = n.types;
    // const reduced = n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined);
    const distinctTypes = OmniUtil.getDistinctTypes(types, features);
    if (distinctTypes.length > 2 && distinctTypes.every(it => (it.kind === OmniTypeKind.OBJECT))) {

      // const types = n.types;
      let target = {...types[0]};
      OmniUtil.mergeTypeMeta(n, target, false, true);
      OmniUtil.copyName(n, target);

      for (let i = 1; i < types.length; i++) {
        target = OmniUtil.mergeType(types[i], target, features, false, true);
      }

      return target;
    }

    return undefined;

    // return {...n, types: reduced};
  }
}
