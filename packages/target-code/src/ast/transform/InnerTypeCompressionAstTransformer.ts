import {AstTransformer, AstTransformerArguments, OmniType, OmniTypeKind, StaticInnerTypeKind, TargetFeatures, TargetOptions} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil, Visitor, VisitResultFlattener} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import * as Code from '../CodeAst';
import {CodeOptions} from '../../options/CodeOptions.ts';
import {CodeUtil} from '../../util/CodeUtil.ts';
import {CodeVisitor} from '../../visitor/CodeVisitor.ts';

const logger = LoggerFactory.create(import.meta.url);

export class InnerTypeCompressionAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    if ((!args.options.compressSoloReferencedTypes && !args.options.compressUnreferencedSubTypes)) {

      // Option for compressing types is disabled.
      return;
    } else if (!args.features.nestedDeclarations) {

      // Nested declarations is not supported.
      return;
    }

    const objectDecUsedInTypes = new Map<Code.AbstractObjectDeclaration, OmniType[]>();
    const typeToUnit = new Map<OmniType, Code.CompilationUnit>();
    const typeToObjectDec = new Map<OmniType, Code.AbstractObjectDeclaration>();
    this.gatherTypeMappings(objectDecUsedInTypes, typeToUnit, typeToObjectDec, args.root, args.options);

    const typeUsedInCus = this.flipMultiMap(objectDecUsedInTypes);

    for (const [type, usedInObjDec] of typeUsedInCus.entries()) {

      logger.silent(`${OmniUtil.describe(type)} used in ${usedInObjDec.map(it => OmniUtil.describe(it.type.omniType))}`);

      if (usedInObjDec.length != 1) {
        continue;
      }

      if (type.kind === OmniTypeKind.INTERFACE) {

        // We do not place interfaces inside its single user, since most likely that user is implementing the interface.
        // NOTE: This is of course not always true, and a more detailed check would be nice.
        continue;
      }

      const singleUseInObjDec = usedInObjDec[0];

      // Check for supertype interference. Don't want a superclass to be inside a subclass.
      let typeUsedInSuperType = false;
      if (OmniUtil.asSuperType(type)) {
        const singleUseType = singleUseInObjDec.omniType;
        const singleUseIsSubType = OmniUtil.asSubType(singleUseType);
        const singleUseHierarchy = CodeUtil.getSuperClassHierarchy(args.model, singleUseIsSubType ? singleUseType : undefined, args.root.getFunctions());
        typeUsedInSuperType = singleUseHierarchy.includes(type);
      }

      if (typeUsedInSuperType) {

        // If the types are assignable, it means that the single use is a class extension.
        if (args.options.compressUnreferencedSubTypes && this.isAllowedKind(type, args.options)) {
          logger.debug(`Could compress ${OmniUtil.describe(type)}`);
        }

      } else {

        if (args.options.compressSoloReferencedTypes && this.isAllowedKind(type, args.options)) {

          // This type is only ever used in one single unit.
          // To decrease the number of files, we can compress the types and make this an inner type.
          const definedInObjectDec = typeToObjectDec.get(type);
          if (!definedInObjectDec) {
            logger.warn(`Could not find where '${OmniUtil.describe(type)}' is declared`);
            continue;
          }

          const definedInUnit = typeToUnit.get(type);
          if (!definedInUnit) {
            throw new Error(`Could not find the CompilationUnit source where '${OmniUtil.describe(type)}' is defined`);
          }

          const targetUnit = typeToUnit.get(singleUseInObjDec.omniType);
          this.moveUnit(definedInUnit, definedInObjectDec, singleUseInObjDec, targetUnit, type, args.root, args.features);
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
    objectDecUsedInType: Map<Code.AbstractObjectDeclaration, OmniType[]>,
    typeToUnit: Map<OmniType, Code.CompilationUnit>,
    typeToObjectDec: Map<OmniType, Code.AbstractObjectDeclaration>,
    root: CodeRootAstNode,
    options: TargetOptions,
  ): void {

    const cuInfoStack: Code.CompilationUnit[] = [];
    const objectDecStack: Code.AbstractObjectDeclaration[] = [];

    const defaultVisitor = root.createVisitor();
    root.visit(Visitor.create(defaultVisitor, {

      visitCompilationUnit: (node, visitor) => {

        try {
          cuInfoStack.push(node);
        } finally {
          defaultVisitor.visitCompilationUnit(node, visitor);
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
          defaultVisitor.visitObjectDeclaration(node, visitor);
        } finally {
          objectDecStack.pop();
        }
      },

      // We do not want texts with links to count as "references"
      visitFreeTextLine: () => {},
      visitFreeTextTypeLink: () => {},
      visitFreeTextMemberLink: () => {},
      visitFreeTextPropertyLink: () => {},

      visitEdgeType: node => {

        for (const usedType of InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(node.omniType)) {

          // We will only compress certain kind of types.
          if (usedType.kind == OmniTypeKind.OBJECT
            || OmniUtil.isComposition(usedType)
            || usedType.kind == OmniTypeKind.ENUM
            || (usedType.kind == OmniTypeKind.INTERFACE && options.allowCompressInterfaceToInner)) {

            const objectDec = objectDecStack[objectDecStack.length - 1];
            if (usedType != objectDec.type.omniType) {
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
    }));
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

  private moveUnit(
    sourceUnit: Code.CompilationUnit,
    sourceObject: Code.AbstractObjectDeclaration,
    targetChild: Code.AbstractObjectDeclaration | undefined,
    targetUnit: Code.CompilationUnit | undefined,
    type: OmniType,
    root: CodeRootAstNode,
    features: TargetFeatures,
  ): void {

    if (!targetChild) {
      throw new Error(`Could not find the CompilationUnit target where '${OmniUtil.describe(type)}' is defined`);
    }

    const namespace = targetUnit?.children.find(it => it instanceof Code.Namespace);
    if (namespace) {

      // There is a wrapping namespace inside the unit. We will use that instead to collect nodes inside.
      namespace.block.block.children.push(
        sourceObject,
      );

    } else {

      if (!sourceObject.modifiers.children.find(it => it.kind == Code.ModifierKind.STATIC) && features.staticInnerTypes === StaticInnerTypeKind.DEFAULT_PARENT_ACCESSIBLE) {

        // Add the static modifier if it is not already added.
        sourceObject.modifiers.children.push(
          new Code.Modifier(Code.ModifierKind.STATIC),
        );
      }

      targetChild.body.children.push(
        sourceObject,
      );
    }

    const base = root.createVisitor<boolean>();
    const visitor: CodeVisitor<boolean> = {
      ...base,
      visitCompilationUnit: (n, v) => {
        const idx = n.children.indexOf(sourceObject);
        if (idx !== -1) {
          n.children.splice(idx, 1);
          return true;
        }
        return base.visitCompilationUnit(n, v);
      },
      visitBlock: (n, v) => {
        const idx = n.children.indexOf(sourceObject);
        if (idx !== -1) {
          n.children.splice(idx, 1);
          return true;
        }
        return base.visitBlock(n, v);
      },
    };

    const found = VisitResultFlattener.visitWithSingularResult(visitor, sourceUnit, false);

    if (!found) {
      throw new Error(`Unit for '${sourceObject.name.value}' was not found in source unit '${sourceUnit.name ?? sourceUnit}'`);
    }
  }
}
