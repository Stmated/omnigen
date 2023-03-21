import {
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniProperty,
  ParserOptions,
} from '@omnigen/core';
import {OMNI_GENERIC_FEATURES, TargetFeatures, TargetOptions} from '@omnigen/core';
import {PropertyUtil} from '../PropertyUtil.js';
import {OmniModelTransformerArgs} from '@omnigen/core';
import {PropertyDifference, TypeDifference} from '@omnigen/core';
import {OmniModelTransformer2ndPassArgs} from '@omnigen/core';
import {OmniUtil} from '../OmniUtil.js';
import {Sorters} from '../../util/index.js';

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

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions, TargetOptions>): void {
    this.transformInner(args, args.targetFeatures);
  }

  transformModel(args: OmniModelTransformerArgs<ParserOptions>): void {
    this.transformInner(args, OMNI_GENERIC_FEATURES);
  }

  transformInner(args: OmniModelTransformerArgs<ParserOptions>, targetFeatures: TargetFeatures): void {

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

    const bannedTypeDifferences: TypeDifference[] = [
      TypeDifference.FUNDAMENTAL_TYPE,
      TypeDifference.ISOMORPHIC_TYPE,
    ];
    const bannedPropDifferences: PropertyDifference[] = [
      PropertyDifference.NAME,
      PropertyDifference.TYPE,
      PropertyDifference.META,
      PropertyDifference.SIGNATURE,
    ];

    if (targetFeatures.literalTypes) {

      // If the target allows literal types, then we need to care about the visible signature type,
      // and not just about the underlying fundamental type and/or isomorphic type differences.
      bannedTypeDifferences.push(TypeDifference.NARROWED_LITERAL_TYPE);
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
        targetFeatures,
        ...subTypes,
      );

      for (const propertyName in properties.byPropertyName) {
        if (!(propertyName in properties.byPropertyName)) {
          continue;
        }

        if (superType.properties.find(it => it.name == propertyName)) {

          // The superType already has a property with that name.
          continue;
        }

        const info = properties.byPropertyName[propertyName]!;

        const propertyToElevate = info.properties[0];

        const uniqueDiffs = [...new Set(info.typeDiffs ?? [])];

        if (uniqueDiffs.length == 1 && uniqueDiffs[0] == TypeDifference.NARROWED_LITERAL_TYPE) {

          const abstractProperty: OmniProperty = {
            ...propertyToElevate,
            type: info.commonType,
            description: undefined,
            summary: undefined,
            annotations: [], // TODO: Add annotations if they exist on all subtype properties?
            abstract: true,
            required: info.properties.filter(it => it.required).length == info.properties.length,
            deprecated: info.properties.filter(it => it.deprecated).length == info.properties.length,
            owner: superType,
          };

          superType.properties.push(abstractProperty);

        } else if (uniqueDiffs.length == 0) {

          // There needs to be ZERO diffs to be able to elevate the proper
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
