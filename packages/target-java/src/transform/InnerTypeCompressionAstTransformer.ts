import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform';
import {
  OmniType,
  OmniTypeKind,
  TargetOptions,
} from '@omnigen/core';
import * as Java from '../ast';
import {LoggerFactory} from '@omnigen/core-log';
import {JavaUtil} from '../util';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {DefaultJavaVisitor} from '../visit';

const logger = LoggerFactory.create(import.meta.url);

export class InnerTypeCompressionAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (!args.options.compressSoloReferencedTypes && !args.options.compressUnreferencedSubTypes || !args.features.nestedDeclarations) {

      // The option for compressing types is disabled.
      return;
    }

    const objectDecUsedInTypes = new Map<Java.AbstractObjectDeclaration, OmniType[]>();
    const typeToUnit = new Map<OmniType, Java.CompilationUnit>();
    const typeToObjectDec = new Map<OmniType, Java.AbstractObjectDeclaration>();
    this.gatherTypeMappings(objectDecUsedInTypes, typeToUnit, typeToObjectDec, args.root, args.options);

    const typeUsedInCus = this.flipMultiMap(objectDecUsedInTypes);
    logger.info(typeUsedInCus);

    for (const [type, usedIn] of typeUsedInCus.entries()) {

      logger.silent(`${OmniUtil.describe(type)} used in ${usedIn.map(it => OmniUtil.describe(it.type.omniType))}`);

      if (usedIn.length != 1) {
        continue;
      }

      const singleUseInUnit = usedIn[0];

      // Check for supertype interference. Don't want a superclass to be inside a subclass.
      let typeUsedInSuperType = false;
      if (JavaUtil.asSuperType(type)) {
        const singleUseType = singleUseInUnit.type.omniType; // .children.type.omniType;
        const singleUseIsSubType = JavaUtil.asSubType(singleUseType);
        const singleUseHierarchy = JavaUtil.getSuperClassHierarchy(args.model, singleUseIsSubType ? singleUseType : undefined);
        typeUsedInSuperType = singleUseHierarchy.includes(type);
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
          const definedInObjectDec = typeToObjectDec.get(type);
          if (!definedInObjectDec) {
            throw new Error(`Could not find the object source where '${OmniUtil.describe(type)}' is defined`);
          }

          const definedInUnit = typeToUnit.get(type);
          if (!definedInUnit) {
            throw new Error(`Could not find the CompilationUnit source where '${OmniUtil.describe(type)}' is defined`);
          }

          this.moveCompilationUnit(definedInUnit, definedInObjectDec, singleUseInUnit, type, args.root);
        }
      }
    }
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
    objectDecUsedInType: Map<Java.AbstractObjectDeclaration, OmniType[]>,
    typeToUnit: Map<OmniType, Java.CompilationUnit>,
    typeToObjectDec: Map<OmniType, Java.AbstractObjectDeclaration>,
    root: Java.JavaAstRootNode,
    options: TargetOptions,
  ) {

    const cuInfoStack: Java.CompilationUnit[] = [];
    const objectDecStack: Java.AbstractObjectDeclaration[] = [];
    const visitor = VisitorFactoryManager.create(DefaultJavaVisitor, {

      visitCompilationUnit: (node, visitor) => {

        try {
          cuInfoStack.push(node);
        } finally {
          DefaultJavaVisitor.visitCompilationUnit(node, visitor);
          cuInfoStack.pop();
        }
      },
      visitObjectDeclaration: (node, visitor) => {

        const mapping = objectDecUsedInType.get(node);
        if (!mapping) {
          objectDecUsedInType.set(node, []);
        }

        typeToObjectDec.set(node.type.omniType, node);
        typeToUnit.set(node.type.omniType, cuInfoStack[cuInfoStack.length - 1]);

        try {
          objectDecStack.push(node);
          DefaultJavaVisitor.visitObjectDeclaration(node, visitor);
        } finally {
          objectDecStack.pop();
        }
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

            // const cu = cuInfoStack[cuInfoStack.length - 1];
            const objectDec = objectDecStack[objectDecStack.length - 1];
            if (usedType != objectDec.type.omniType) { // cu.children.type.omniType) {
              const mapping = objectDecUsedInType.get(objectDec);
              if (mapping) {
                if (!mapping.includes(usedType)) {
                  mapping.push(usedType);
                }
              } else {
                objectDecUsedInType.set(objectDec, [usedType]);
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
    sourceObject: Java.AbstractObjectDeclaration,
    targetChild: Java.Identifiable | undefined,
    type: OmniType,
    root: Java.JavaAstRootNode,
  ): void {

    if (!targetChild) {
      throw new Error(`Could not find the CompilationUnit target where '${OmniUtil.describe(type)}' is defined`);
    }

    if (!(targetChild instanceof Java.AbstractObjectDeclaration)) {
      return;
    }

    if (!sourceObject.modifiers.children.find(it => it.type == Java.ModifierType.STATIC)) {

      // Add the static modifier if it is not already added.
      // TODO: This does not need to be done for enums?
      sourceObject.modifiers.children.push(
        new Java.Modifier(Java.ModifierType.STATIC),
      );
    }

    targetChild.body.children.push(
      sourceObject,
    );

    const rootCuIndex = sourceUnit.children.indexOf(sourceObject);
    if (rootCuIndex != -1) {
      sourceUnit.children.splice(rootCuIndex, 1);
    } else {
      throw new Error(`The CompilationUnit for '${sourceObject.name.value}' was not found in source unit '${sourceUnit}'`);
    }

    if (sourceUnit.children.length == 0) {
      const unitIndex = root.children.indexOf(sourceUnit);
      if (unitIndex != -1) {
        root.children.splice(unitIndex, 1);
      } else {
        throw new Error(`Could not find unit '${sourceUnit}' inside root node`);
      }
    }
  }
}
