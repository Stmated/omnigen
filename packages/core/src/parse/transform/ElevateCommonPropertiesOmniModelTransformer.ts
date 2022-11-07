import {OmniModel, OmniModelTransformer, OmniUtil} from '../../parse';
import {RealOptions} from '../../options';
import {TargetOptions} from '../../interpret';
import {Sorters} from '../../util';
import {PropertyUtil} from '../PropertyUtil';
import {EqualityLevel} from '../EqualityLevel';

/**
 * Takes an OmniModel, and tries to compress types as much as possible.
 * Might make the types not compatible to the contract exactly, but payloads should be the same.
 *
 * abs: [x1]
 * a (abs): [x2, x3]
 * b (abs): [x2, x4]
 * =
 * abs: [x1, x2]
 * a (abs): [x3]
 * b (abs): [x4]
 */
export class ElevateCommonPropertiesOmniModelTransformer implements OmniModelTransformer<TargetOptions> {

  transformModel(model: OmniModel, options: RealOptions<TargetOptions>): void {

    if (!options.elevateProperties) {

      // We will not move any properties to the ancestor type.
      return;
    }

    const superTypeToSubTypes = OmniUtil.getSuperTypeToSubTypesMap(model);
    const dependencySorter = Sorters.byDependencies(model);
    const superTypes = [...superTypeToSubTypes.keys()].sort((a, b) => {
      const aSubType = (superTypeToSubTypes.get(a) || [])[0];
      const bSubType = (superTypeToSubTypes.get(b) || [])[0];
      return dependencySorter(aSubType, bSubType);
    });

    for (const superType of superTypes) {

      const subTypes = superTypeToSubTypes.get(superType);
      if (!subTypes) {
        continue;
      }

      const properties = PropertyUtil.getCommonProperties(
        options.elevatePropertiesMoreEqualThan,
        EqualityLevel.CLONE_MIN,
        ...subTypes,
      );

      for (const propertyName in properties.byPropertyName) {
        if (!Object.hasOwn(properties.byPropertyName, propertyName)) {
          continue;
        }

        const info = properties.byPropertyName[propertyName];
        if (!info) {
          continue;
        }

        if (info.typeEqualityLevel < options.elevatePropertiesWithTypesMoreEqualThan) {

          // To be able to elevate the properties, they must meet the minimum equality level requirement.
          // This is by default "clones", so even comments have to be the same.
          continue;
        }

        if ('properties' in superType) {

          superType.properties.push({
            ...info.properties[0],
            type: info.commonType,
            owner: superType,
          });
        }

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
