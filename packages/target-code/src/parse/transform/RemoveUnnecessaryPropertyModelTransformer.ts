import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions} from '@omnigen/api';
import {CreateMode, OmniUtil, PropertyUtil} from '@omnigen/core';
import {CodeOptions} from '../../options/CodeOptions';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Remove properties from subtypes if its supertype already has that exact property. It will only be removed if they are exactly similar.
 *
 * This is different from `GenericsModelTransformer` and `ElevatePropertiesModelTransformer` which will only act if all subtypes conform with each other.
 */
export class RemoveUnnecessaryPropertyModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & CodeOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & CodeOptions>): void {

    const superTypeToSubTypes = OmniUtil.getSuperTypeToSubTypesMap(args.model);
    const superTypes = [...superTypeToSubTypes.keys()];

    for (const superType of superTypes) {

      if (superType.kind !== OmniTypeKind.OBJECT) {
        continue;
      }

      const subTypes = superTypeToSubTypes.get(superType)!;
      for (const subType of subTypes) {

        if (subType.kind !== OmniTypeKind.OBJECT) {
          continue;
        }

        for (let i = subType.properties.length - 1; i >= 0; i--) {
          const subProperty = subType.properties[i];
          const superProperty = superType.properties.find(stp => OmniUtil.isPropertyNameEqual(stp.name, subProperty.name));
          if (superProperty) {

            const diff = PropertyUtil.getPropertyEquality(subProperty, superProperty, args.features, {create: CreateMode.NONE});
            if (diff) {
              if (diff.propertyDiffs && diff.propertyDiffs.length > 0) {
                continue;
              }
              if (diff.typeDiffs && diff.typeDiffs.length > 0) {
                continue;
              }
            }

            const propertyName = OmniUtil.getPropertyName(subProperty.name, true);
            subType.properties.splice(i, 1);
            OmniUtil.addDebugTo(subType, `Removed property '${propertyName}' since already exists in superType ${OmniUtil.describe(superType)}`);
            OmniUtil.addDebugTo(superType, `Takes ownership of property '${propertyName}' from subType ${OmniUtil.describe(subType)}`);
          }
        }
      }
    }
  }
}
