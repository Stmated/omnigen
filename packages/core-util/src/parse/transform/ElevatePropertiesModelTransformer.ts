import {
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniProperty, OmniType, OmniTypeKind,
  ParserOptions, TargetOptions,
} from '@omnigen/core';
import {OMNI_GENERIC_FEATURES, TargetFeatures} from '@omnigen/core';
import {PropertyUtil} from '../PropertyUtil.ts';
import {OmniModelTransformerArgs} from '@omnigen/core';
import {PropertyDifference, TypeDiffKind} from '@omnigen/core';
import {OmniModelTransformer2ndPassArgs} from '@omnigen/core';
import {OmniUtil} from '../OmniUtil.ts';
import {CreateMode, Sorters} from '../../util';

/**
 * Takes an OmniModel, and tries to compress types as much as possible.
 * Might make the types not compatible to the contract exactly, but payloads should be the same.
 *
 * <pre>
 * abs: [x1]
 * a (abs): [x2, x3]
 * b (abs): [x2, x4]
 * </pre>
 * Equals (with x2 moved to abstract parent):
 * <pre>
 * abs: [x1, x2]
 * a (abs): [x3]
 * b (abs): [x4]
 * </pre>
 */
export class ElevatePropertiesModelTransformer implements OmniModelTransformer, OmniModel2ndPassTransformer {

  transformModel(args: OmniModelTransformerArgs): void {
    this.transformInner(args);
  }

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {
    this.transformInner(args, args.targetFeatures);
  }

  transformInner(args: OmniModelTransformerArgs, targetFeatures?: TargetFeatures): void {

    if (!args.options.elevateProperties) {

      // We will not move any properties to the ancestor type.
      return;
    }

    const superTypeToSubTypes = OmniUtil.getSuperTypeToSubTypesMap(args.model);
    const dependencySorter = Sorters.byDependencies(args.model);
    const superTypes = [...superTypeToSubTypes.keys()].sort((a, b) => {
      const aSubType = (superTypeToSubTypes.get(a) || [])[0];
      const bSubType = (superTypeToSubTypes.get(b) || [])[0];
      return dependencySorter(aSubType, bSubType);
    });

    const bannedTypeDifferences: TypeDiffKind[] = [
      TypeDiffKind.FUNDAMENTAL_TYPE,
      TypeDiffKind.ISOMORPHIC_TYPE,
    ];
    const bannedPropDifferences: PropertyDifference[] = [
      PropertyDifference.NAME,
      PropertyDifference.TYPE,
      PropertyDifference.META,
      PropertyDifference.SIGNATURE,
    ];

    if (targetFeatures && targetFeatures.literalTypes) {

      // If the target allows literal types, then we need to care about the visible signature type,
      // and not just about the underlying fundamental type and/or isomorphic type differences.
      // bannedTypeDifferences.push(TypeDiffKind.POLYMORPHIC_LITERAL);
    }

    for (const superType of superTypes) {
      if (!('properties' in superType)) {
        continue;
      }

      const subTypes = superTypeToSubTypes.get(superType)!;

      const properties = PropertyUtil.getCommonProperties(
        tdiff => OmniUtil.isDiffMatch([tdiff], ...bannedTypeDifferences),
        pdiff => PropertyUtil.isDiffMatch([pdiff], ...bannedPropDifferences),

        // These features will limit the kind of properties we can elevate, since it will go for common denominator.
        // It is up to syntax tree transformers to do the more specialized elevating later, if possible.
        targetFeatures ?? OMNI_GENERIC_FEATURES,
        {create: CreateMode.NONE},
        ...subTypes,
      );

      for (const propertyName in properties.byPropertyName) {
        if (!(propertyName in properties.byPropertyName)) {
          continue;
        }

        if (superType.properties.find(it => OmniUtil.isPropertyNameEqual(it.name, propertyName))) {

          // The superType already has a property with that name.
          continue;
        }

        const info = properties.byPropertyName[propertyName]!;
        const propertyToElevate = info.properties[0];
        const uniqueDiffs = [...new Set(info.typeDiffs ?? [])];

        if (uniqueDiffs.length == 1 && uniqueDiffs[0] === TypeDiffKind.POLYMORPHIC_LITERAL) {

          const abstractPropertyType: OmniType = (targetFeatures && targetFeatures.literalTypes && info.distinctTypes.length < args.options.literalUnionMaxCount)
            ? {kind: OmniTypeKind.EXCLUSIVE_UNION, types: info.distinctTypes, debug: 'Polymorphic literal union'}
            : info.commonType;

          const abstractProperty: OmniProperty = {
            ...propertyToElevate,
            type: abstractPropertyType,
            description: info.properties.every(it => (info.properties[0].description === it.description)) ? info.properties[0].description : undefined,
            summary: info.properties.every(it => (info.properties[0].summary === it.summary)) ? info.properties[0].summary : undefined,
            annotations: [], // TODO: Add annotations if they exist on all subtype properties?
            abstract: true,
            required: info.properties.every(it => it.required),
            deprecated: info.properties.every(it => it.deprecated),
            debug: OmniUtil.addDebug(propertyToElevate.debug, `elevated from ${info.properties.map(it => OmniUtil.describe(it.owner))}`),
            owner: superType,
          };

          superType.properties.push(abstractProperty);

        } else if (uniqueDiffs.length == 0) {

          // There needs to be ZERO diffs to be able to elevate the property
          superType.properties.push({
            ...propertyToElevate,
            type: info.commonType,
            owner: superType,
          });

          for (const subTypeProperty of info.properties) {
            const idx = subTypeProperty.owner.properties.indexOf(subTypeProperty);
            if (idx != -1) {
              subTypeProperty.owner.properties.splice(idx, 1);
            }
          }
        }
      }
    }
  }
}
