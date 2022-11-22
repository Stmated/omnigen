import {AbstractJavaAstTransformer} from '../transform/index.js';
import {
  ExternalSyntaxTree,
  OmniModel,
  OmniType,
  OmniTypeKind,
  OmniUtil,
  RealOptions,
  TargetOptions,
  VisitorFactoryManager,
} from '@omnigen/core';
import {JavaOptions} from '../options/index.js';
import * as Java from '../ast/index.js';
import {LoggerFactory} from '@omnigen/core-log';
import {JavaUtil} from '../util/index.js';

const logger = LoggerFactory.create(import.meta.url);

type CompilationUnitInfo = {
  cu: Java.CompilationUnit,
};

interface TypeMapping {
  definedIn?: Java.CompilationUnit;
  usedIn: Set<Java.CompilationUnit>;
}

export class InnerTypeCompressionAstTransformer extends AbstractJavaAstTransformer {

  transformAst(
    model: OmniModel,
    root: Java.JavaAstRootNode,
    externals: ExternalSyntaxTree<Java.JavaAstRootNode, JavaOptions>[],
    options: RealOptions<TargetOptions>,
  ): Promise<void> {

    if (!options.compressSoloReferencedTypes && !options.compressUnreferencedSubTypes) {

      // The option for compressing types is disabled.
      return Promise.resolve();
    }

    const typeMapping = new Map<OmniType, TypeMapping>();
    this.gatherTypeMappings(typeMapping, root);

    const typeMappingExternals = new Map<OmniType, TypeMapping>();
    for (const external of externals) {

      // We still gather the mappings for all externals as well.
      // It will be useful for error messages and exclusions of some compressions.
      // Like... we should never move types from specific models INTO the common types. That is just weird.
      this.gatherTypeMappings(typeMappingExternals, external.node);
    }

    for (const [type, typeMappings] of typeMapping.entries()) {

      const usedInUnits = typeMappings.usedIn;
      if (!usedInUnits || usedInUnits.size != 1) {
        continue;
      }

      const usedInUnit = [...usedInUnits.values()][0];
      const definedUsedInSuperType = JavaUtil.superMatches(
        model, JavaUtil.asSubType(usedInUnit.object.type.omniType),
        superType => (superType == type),
      );

      if (definedUsedInSuperType) {

        // If the types are assignable, it means that the single use is a class extension.
        if (options.compressUnreferencedSubTypes && this.isAllowedKind(usedInUnit, options)) {

          // If the only use is as an extension, then IF we compress, the source/target should be reversed.
          // If typeA is only used in typeB, and typeB is extending from typeA, then typeB should be inside typeA.
          const definedIn = typeMappings.definedIn;
          if (!definedIn && typeMappingExternals.has(type)) {
            // If we could not find the target, but it is available in the external mappings,
            // then we know that the other type is inside another model. We do not want to compress into them.
            logger.debug(`Skipping compression of type '${OmniUtil.describe(type)}' inside external model`);
          } else {
            // this.moveCompilationUnit(usedInUnit, definedIn, type, root);
          }
        }

      } else {

        if (options.compressSoloReferencedTypes && this.isAllowedKind(typeMappings.definedIn, options)) {

          // This type is only ever used in one single unit.
          // To decrease the number of files, we can compress the types and make this an inner type.
          this.moveCompilationUnit(typeMappings.definedIn, usedInUnit, type, root);
        }
      }
    }

    return Promise.resolve(undefined);
  }

  private gatherTypeMappings(
    typeMapping: Map<OmniType, TypeMapping>,
    root: Java.JavaAstRootNode,
  ) {

    const cuInfoStack: CompilationUnitInfo[] = [];
    const visitor = VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitCompilationUnit: (node, visitor) => {

        const mapping = typeMapping.get(node.object.type.omniType);
        if (mapping) {
          if (mapping.definedIn) {
            mapping.usedIn.add(node);
          } else {
            mapping.definedIn = node;
          }
        } else {
          typeMapping.set(node.object.type.omniType, {
            usedIn: new Set(),
            definedIn: node,
          });
        }

        cuInfoStack.push({
          cu: node,
        });
        AbstractJavaAstTransformer.JAVA_VISITOR.visitCompilationUnit(node, visitor);
        cuInfoStack.pop();
      },

      visitRegularType: node => {

        for (const usedType of InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(node.omniType)) {

          // We will only compress certain kind of types.
          if (usedType.kind == OmniTypeKind.OBJECT
            || usedType.kind == OmniTypeKind.COMPOSITION
            || usedType.kind == OmniTypeKind.ENUM
            || usedType.kind == OmniTypeKind.INTERFACE) {

            const cu = cuInfoStack[cuInfoStack.length - 1];
            const mapping = typeMapping.get(usedType);
            if (mapping) {
              mapping.usedIn.add(cu.cu);
            } else {
              typeMapping.set(usedType, {
                usedIn: new Set([cu.cu]),
              });
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
    } else if (type.kind == OmniTypeKind.INTERFACE) {
      const sourceType = InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(type.of);
      return [type, ...sourceType];
    }

    // Should we follow external model references here?

    return [type];
  }

  private isAllowedKind(cu: Java.CompilationUnit | undefined, options: TargetOptions): boolean {

    if (!cu) {

      // We return true here, which is wrong, but it will throw an error inside moveCompilationUnit.
      return true;
    }

    return options.compressTypeKinds.length == 0 || options.compressTypeKinds.includes(cu.object.type.omniType.kind);
  }

  private moveCompilationUnit(
    sourceUnit: Java.CompilationUnit | undefined,
    targetUnit: Java.CompilationUnit | undefined,
    type: OmniType,
    root: Java.JavaAstRootNode,
  ): void {

    if (!sourceUnit) {
      throw new Error(`Could not find the CompilationUnit source where '${OmniUtil.describe(type)}' is defined`);
    }

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
