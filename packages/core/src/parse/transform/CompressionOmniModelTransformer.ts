import {OmniModel, OmniObjectType, OmniProperty, OmniTypeKind, OmniModelTransformer, OmniUtil} from '../../parse';
import {RealOptions} from '../../options';
import {TargetOptions} from '../../interpret';

interface SubTypeInfo {
  subTypes: OmniObjectType[];
  properties: Map<string, OmniProperty[]>;
}

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
export class CompressionOmniModelTransformer implements OmniModelTransformer<TargetOptions> {

  transformModel(model: OmniModel, options: RealOptions<TargetOptions>): void {

    if (!options.compressPropertiesToAncestor) {

      // We will not move any properties to the ancestor type.
      return;
    }

    const allTypes = OmniUtil.getAllExportableTypes(model, model.types);

    // TODO: Need to sort the types so that the leaf types are done first
    //        Otherwise we will find the wrong types when doing the "find common denominator" stuff

    const subTypeInfoMap = new Map<OmniObjectType, SubTypeInfo>();
    for (const type of allTypes.all) {

      if (type.kind != OmniTypeKind.OBJECT) {
        continue;
      }

      const extendedBy = type.extendedBy;
      if (!extendedBy || extendedBy.kind != OmniTypeKind.OBJECT) {
        continue;
      }

      for (const property of type.properties) {

        const signature = `${property.name}=${OmniUtil.getTypeDescription(property.type)}`;

        let subTypeInfo = subTypeInfoMap.get(extendedBy);
        if (!subTypeInfo) {
          subTypeInfoMap.set(extendedBy, subTypeInfo = {
            subTypes: [],
            properties: new Map<string, OmniProperty[]>(),
          });
        }

        if (!subTypeInfo.subTypes.includes(type)) {
          subTypeInfo.subTypes.push(type);
        }

        let properties = subTypeInfo.properties.get(signature);
        if (!properties) {
          subTypeInfo.properties.set(signature, properties = []);
        }

        properties.push(property);
      }
    }

    for (const e of subTypeInfoMap.entries()) {

      const parentType = e[0];
      const subTypes = e[1].subTypes;
      const similarProperties = e[1].properties;

      for (const similarProperty of similarProperties) {

        const subTypesProperties = similarProperty[1];
        if (subTypes.length == subTypesProperties.length) {

          // This similar property exist in all sub-types of the parent-type.
          // This means that we can move the property into the parent-type without any loss of compatibility.

          // TODO: We should merge the properties together, and not just pick the first one. Comments, etc.
          parentType.properties.push({
            ...subTypesProperties[0],
            owner: parentType,
          });

          for (const subTypeProperty of subTypesProperties) {
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
