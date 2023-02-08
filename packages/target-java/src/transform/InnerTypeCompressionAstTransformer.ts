import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform/index.js';
import {
  OmniType,
  OmniTypeKind,
  RealOptions,
  TargetOptions,
} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {LoggerFactory} from '@omnigen/core-log';
import {JavaUtil} from '../util';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

export class InnerTypeCompressionAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): Promise<void> {

    if (!args.options.compressSoloReferencedTypes && !args.options.compressUnreferencedSubTypes) {

      // The option for compressing types is disabled.
      return Promise.resolve();
    }

    const cuUsedInTypes = new Map<Java.CompilationUnit, OmniType[]>();
    const typeToCu = new Map<OmniType, Java.CompilationUnit>();
    this.gatherTypeMappings(cuUsedInTypes, typeToCu, args.root, args.options);

    const typeUsedInCus = this.flipMultiMap(cuUsedInTypes);
    logger.info(typeUsedInCus);

    for (const [type, usedInUnits] of typeUsedInCus.entries()) {

      logger.info(`${OmniUtil.describe(type)} used in ${usedInUnits.map(it => OmniUtil.describe(it.object.type.omniType))}`);

      if (usedInUnits.length != 1) {
        continue;
      }

      const singleUseInUnit = usedInUnits[0];

      // Check for supertype interference. Don't want a superclass to be inside a subclass.
      const superType = JavaUtil.asSuperType(type);
      let typeUsedInSuperType = false;
      if (superType) {
        const singleUseInType = JavaUtil.asSubType(singleUseInUnit.object.type.omniType);
        const singleUseHierarchy = JavaUtil.getSuperClassHierarchy(args.model, singleUseInType);
        typeUsedInSuperType = singleUseHierarchy.includes(superType);
      }

      if (typeUsedInSuperType) {

        // If the types are assignable, it means that the single use is a class extension.
        if (args.options.compressUnreferencedSubTypes && this.isAllowedKind(type, args.options)) {
          logger.info(`Could compress ${type} into ${OmniUtil.describe(type)}`);
        }

      } else {

        if (args.options.compressSoloReferencedTypes && this.isAllowedKind(type, args.options)) {

          // This type is only ever used in one single unit.
          // To decrease the number of files, we can compress the types and make this an inner type.
          const definedInCu = typeToCu.get(type);
          if (!definedInCu) {
            logger.warn(`Could not find the CompilationUnit source where '${OmniUtil.describe(type)}' is defined`);
            continue;
          }

          this.moveCompilationUnit(definedInCu, singleUseInUnit, type, args.root);
        }
      }
    }

    return Promise.resolve(undefined);
  }

  private flipMultiMap<A, B>(original: Map<A, B[]>): Map<B, A[]> {

    const flipped = new Map<B, A[]>();
    for (const [originalKey, originalValues] of original.entries()) {
      for (const entry of originalValues) {
        let flippedValues = flipped.get(entry);
        if (!flippedValues) {
          flippedValues = [];
          flipped.set(entry, flippedValues);
        }

        flippedValues.push(originalKey);
      }
    }

    return flipped;
  }

  private gatherTypeMappings(
    typeMapping: Map<Java.CompilationUnit, OmniType[]>,
    typeToCu: Map<OmniType, Java.CompilationUnit>,
    root: Java.JavaAstRootNode,
    options: RealOptions<TargetOptions>,
  ) {

    const cuInfoStack: Java.CompilationUnit[] = [];
    const visitor = VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitCompilationUnit: (node, visitor) => {

        const mapping = typeMapping.get(node);
        if (!mapping) {
          typeMapping.set(node, []);
        }

        typeToCu.set(node.object.type.omniType, node);

        cuInfoStack.push(node);
        AbstractJavaAstTransformer.JAVA_VISITOR.visitCompilationUnit(node, visitor);
        cuInfoStack.pop();
      },

      // We do not want texts with links to count as "references"
      visitFreeTextLine: () => {},
      visitFreeTextTypeLink: () => {},
      visitFreeTextMethodLink: () => {},
      visitFreeTextPropertyLink: () => {},

      visitRegularType: node => {

        for (const usedType of InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(node.omniType)) {

          // We will only compress certain kind of types.
          if (usedType.kind == OmniTypeKind.OBJECT
            || usedType.kind == OmniTypeKind.COMPOSITION
            || usedType.kind == OmniTypeKind.ENUM
            || (usedType.kind == OmniTypeKind.INTERFACE && options.allowCompressInterfaceToInner)) {

            const cu = cuInfoStack[cuInfoStack.length - 1];
            if (usedType != cu.object.type.omniType) {
              const mapping = typeMapping.get(cu);
              if (mapping) {
                if (!mapping.includes(usedType)) {
                  mapping.push(usedType);
                }
              } else {
                typeMapping.set(cu, [usedType]);
              }
            }
          }
        }
      },
    });

    root.visit(visitor);
  }

  /**
   * Resolves the type into the local visible type(s).
   * This means the types that are externally visible for this type.
   * For example:
   * - If an object, then the object itself.
   * - If an array, then the array type and item type(s).
   * - If a generic, then the generic type itself and the generic target types.
   *
   * This is used to know if the type will be output into the compilation unit/source code.
   * That way we can know if this type is hard-linked to a certain source code.
   *
   * NOTE: This might not be correct for all future target languages.
   *        Might need to be looked at in the future.
   *
   * @param type
   */
  public static getResolvedVisibleTypes(type: OmniType): OmniType[] {

    if (type.kind == OmniTypeKind.ARRAY) {
      return [type, ...InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(type.of)];
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      const sourceType = InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(type.source.of);
      const targetTypes = type.targetIdentifiers.flatMap(it => InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(it.type));
      return [...sourceType, ...targetTypes];
    }
    // else if (type.kind == OmniTypeKind.INTERFACE) {
    //   const sourceType = InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(type.of);
    //   return [type, ...sourceType];
    // }

    // Should we follow external model references here?

    return [type];
  }

  private isAllowedKind(type: OmniType | undefined, options: TargetOptions): boolean {

    if (!type) {

      // We return true here, which is wrong, but it will throw an error inside moveCompilationUnit.
      return true;
    }

    return options.compressTypeKinds.length == 0 || options.compressTypeKinds.includes(type.kind);
  }

  private moveCompilationUnit(
    sourceUnit: Java.CompilationUnit,
    targetUnit: Java.CompilationUnit | undefined,
    type: OmniType,
    root: Java.JavaAstRootNode,
  ): void {

    if (!targetUnit) {
      throw new Error(`Could not find the CompilationUnit target where '${OmniUtil.describe(type)}' is defined`);
    }

    if (!sourceUnit.object.modifiers.children.find(it => it.type == Java.ModifierType.STATIC)) {

      // Add the static modifier if it is not already added.
      // TODO: This does not need to be done for enums?
      sourceUnit.object.modifiers.children.push(
        new Java.Modifier(Java.ModifierType.STATIC),
      );
    }

    targetUnit.object.body.children.push(
      sourceUnit.object,
    );

    const rootCuIndex = root.children.indexOf(sourceUnit);
    if (rootCuIndex != -1) {
      root.children.splice(rootCuIndex, 1);
    } else {
      // throw new Error(`The CompilationUnit for '${sourceUnit.object.name.value}' was not found in root node`);
      logger.error(`The CompilationUnit for '${sourceUnit.object.name.value}' was not found in root node`);
    }
  }
}
