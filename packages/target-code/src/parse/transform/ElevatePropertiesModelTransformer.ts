import {
  OMNI_RESTRICTIVE_GENERIC_FEATURES,
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs,
  OmniObjectType,
  OmniProperty,
  OmniSubTypeCapableType,
  OmniType,
  OmniTypeKind,
  ParserOptions,
  PropertyDifference,
  TargetFeatures,
  TypeDiffKind,
} from '@omnigen/api';
import {CodeOptions, ZodCodeOptions} from '../../options/CodeOptions.ts';
import {CreateMode, OmniUtil, PropertyUtil, Sorters} from '@omnigen/core';

const defaultBannedTypeDifferences: ReadonlyArray<TypeDiffKind> = [
  TypeDiffKind.FUNDAMENTAL_TYPE,
  TypeDiffKind.ISOMORPHIC_TYPE,
];

const defaultBannedPropDifferences: ReadonlyArray<PropertyDifference> = [
  PropertyDifference.NAME,
  PropertyDifference.TYPE,
  PropertyDifference.META,
  PropertyDifference.SIGNATURE,
];

const DEFAULT_CODE_OPTIONS: Readonly<CodeOptions> = ZodCodeOptions.parse({});

// TODO: This transformer should be split into two, one early that can be ran inside `CoreUtilPluginInit` and then one that can run after we know which target it is.
// TODO: As well as separating it to one that can handle elevating generic properties (if the need arises)
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
export class ElevatePropertiesModelTransformer implements OmniModelTransformer, OmniModel2ndPassTransformer<ParserOptions & CodeOptions> {

  transformModel(args: OmniModelTransformerArgs): void {
    this.transformInner({
      ...args,
      options: {
        ...args.options,
        ...DEFAULT_CODE_OPTIONS,
      },
    }, 1);
  }

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & CodeOptions>): void {
    this.transformInner(args, 2, args.targetFeatures);
  }

  transformInner(args: OmniModelTransformerArgs<ParserOptions & CodeOptions>, stage: 1 | 2, targetFeatures?: TargetFeatures): void {

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

    // let bannedTypeDifferences: ReadonlyArray<TypeDiffKind>;
    targetFeatures = targetFeatures ?? OMNI_RESTRICTIVE_GENERIC_FEATURES;
    // if (!targetFeatures.literalTypes) {
    //
    //   // If the target allows literal types, then we need to care about the visible signature type,
    //   // and not just about the underlying fundamental type and/or isomorphic type differences.
    //   bannedTypeDifferences = defaultBannedTypeDifferences; // [...defaultBannedTypeDifferences, TypeDiffKind.POLYMORPHIC_LITERAL];
    // } else {
    //   bannedTypeDifferences = defaultBannedTypeDifferences;
    // }

    for (const superType of superTypes) {

      if (superType.kind === OmniTypeKind.OBJECT) {
        const subTypes = superTypeToSubTypes.get(superType)!;
        this.elevateObject(superType, subTypes, stage, /* bannedTypeDifferences,*/ targetFeatures, args.options);
      } else if (superType.kind === OmniTypeKind.GENERIC_TARGET) {
        const i = 0;
      }
    }
  }

  private elevateObject(
    superType: OmniObjectType,
    subTypes: OmniSubTypeCapableType[],
    stage: 1 | 2,
    features: TargetFeatures,
    options: ParserOptions & CodeOptions,
  ) {

    const properties = PropertyUtil.getCommonProperties(
      tdiff => (stage === 1) ? true : OmniUtil.isDiffMatch(tdiff, defaultBannedTypeDifferences),
      pdiff => (stage === 1) ? true : PropertyUtil.isDiffMatch(pdiff, defaultBannedPropDifferences),

      // These features will limit the kind of properties we can elevate, since it will go for common denominator.
      // It is up to syntax tree transformers to do the more specialized elevating later, if possible.
      features,
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

        // if (stage)

        if (OmniUtil.isAbstract(superType)) {

          // If the only difference is Polymorphic Literal ("hello" vs "hi"), and the supertype is already abstract, then we can add an abstract property.
          // NOTE: Perhaps there are better/more ways of doing this, but it is what we will do for now.
          const abstractPropertyType: OmniType = (features.literalTypes && info.distinctTypes.length < options.literalUnionMaxCount)
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
            debug: OmniUtil.addDebug(propertyToElevate.debug, `elevated from:\n- ${info.properties.map(it => OmniUtil.describe(it.owner)).join('\n- ')}`),
            owner: superType,
          };

          superType.properties.push(abstractProperty);
        } else {

          const commonType: OmniType = (features.unions && info.distinctTypes.length < options.maxAutoUnionSize)
            ? {kind: OmniTypeKind.EXCLUSIVE_UNION, types: info.distinctTypes, inline: true}
            : info.commonType;

          const allSubTypesAreConstants = !features.unions && (info.properties.every(it => OmniUtil.getSpecifiedConstantValue(it.type) !== undefined));

          const generalProperty: OmniProperty = {
            ...propertyToElevate,
            type: commonType,
            description: info.properties.every(it => (info.properties[0].description === it.description)) ? info.properties[0].description : undefined,
            summary: info.properties.every(it => (info.properties[0].summary === it.summary)) ? info.properties[0].summary : undefined,
            annotations: [], // TODO: Add annotations if they exist on all subtype properties?
            abstract: false,
            // NOTE: This is not completely accurate, since just because the values are constants, it does not mean it should not be re-assignable
            // TODO: The PROPER way of doing this is to have a `virtual` base property, and an overriding property that validates input. See scratch `omnigen.md`
            readOnly: info.properties.every(it => it.readOnly) || allSubTypesAreConstants,
            writeOnly: info.properties.every(it => it.writeOnly),
            required: info.properties.some(it => it.required),
            deprecated: info.properties.every(it => it.deprecated),
            debug: OmniUtil.addDebug(propertyToElevate.debug, `elevated as polymorphic literal diff from:\n- ${info.properties.map(it => {
              let constValue: string;
              if (OmniUtil.isPrimitive(it.type) && it.type.literal) {
                if (Array.isArray(it.type.value)) {
                  const constKind = OmniUtil.nativeLiteralToPrimitiveKind(it.type.value);
                  constValue = `const ${it.type.value.map(v => OmniUtil.literalToGeneralPrettyString(v, constKind)).join(' | ')} - `;
                } else {
                  constValue = `const ${OmniUtil.literalToGeneralPrettyString(it.type.value, it.type.kind)} - `;
                }
              } else {
                constValue = '';
              }
              return `${constValue}${OmniUtil.describe(it.owner)}`;
            }).join('\n- ')}`),
            owner: superType,
          };

          superType.properties.push(generalProperty);

          // superType.properties.push(generalProperty);

          // for (const subTypeProperty of info.properties) {
          //   const idx = subTypeProperty.owner.properties.indexOf(subTypeProperty);
          //   if (idx != -1) {
          //     subTypeProperty.owner.properties.splice(idx, 1);
          //   }
          // }
        }

        // if (!features.literalTypes) {

        // TODO: We need to do something here...
        for (const prop of info.properties) {
          prop.hidden = true;
        }
        // }

      } else if (uniqueDiffs.length == 0) {

        // There needs to be ZERO diffs to be able to elevate the property
        superType.properties.push({
          ...propertyToElevate,
          type: info.commonType,
          debug: OmniUtil.addDebug(propertyToElevate.debug, `Elevated as common type from:\n- ${info.properties.map(it => OmniUtil.describe(it.owner)).join('\n- ')}`),
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
