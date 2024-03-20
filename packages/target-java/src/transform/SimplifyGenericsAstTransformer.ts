import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {
  OmniGenericSourceIdentifierType,
  OmniGenericTargetSourcePropertyType,
  OmniType,
  OmniTypeKind,
  TypeDiffKind,
} from '@omnigen/core';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

/**
 * If all target identifiers to a source have the same type, then replace that source identifier with inline type.
 *
 * This could happen if the model had type literals as generics, but the target language does not support it.
 * Then the rendered type will be the common denominator primitive of the literal, and be the same everywhere.
 *
 * There could also be some other transformer that replaces one type with another, making them clones in the end.
 */
export class SimplifyGenericsAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    type TargetInfo = { source: OmniGenericTargetSourcePropertyType, targetTypes: Set<OmniType> };
    const sourceIdentifierToTargetsMap = new Map<OmniGenericSourceIdentifierType, TargetInfo>();

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {
      visitGenericType: node => {
        const type = node.baseType.omniType;
        if (type.kind == OmniTypeKind.GENERIC_TARGET) {

          for (const target of type.targetIdentifiers) {

            const sourceIdentifier = target.sourceIdentifier;
            const info = (
              sourceIdentifierToTargetsMap.has(sourceIdentifier)
                ? sourceIdentifierToTargetsMap
                : sourceIdentifierToTargetsMap.set(sourceIdentifier, {source: type.source, targetTypes: new Set()})
            ).get(sourceIdentifier)!;

            info.targetTypes.add(target.type);
          }
        }
      },
    }));

    const sourceIdentifierReplacements = new Map<OmniGenericSourceIdentifierType, OmniType>();
    for (const [sourceIdentifier, {targetTypes, source}] of sourceIdentifierToTargetsMap.entries()) {

      let replacement: OmniType | undefined = undefined;
      if (targetTypes.size == 1) {
        replacement = [...targetTypes.values()][0];
      } else {

        const allowedDiffs: TypeDiffKind[] = [];
        if (!args.features.primitiveGenerics) {
          allowedDiffs.push(TypeDiffKind.NULLABILITY);
        }
        if (!args.features.literalTypes) {
          allowedDiffs.push(TypeDiffKind.NARROWED_LITERAL_TYPE);
        }

        const distinctTypes = OmniUtil.getDistinctTypes(
          [...targetTypes],
          args.features,
          diff => allowedDiffs.includes(diff),
        );

        if (distinctTypes.length == 1) {
          replacement = OmniUtil.getGeneralizedType(distinctTypes[0]);
        }
      }

      if (replacement) {

        // Remove the source identifier and replace its use inside the class.
        const unwrapped = OmniUtil.getUnwrappedType(source);
        const identifierIndex = unwrapped.sourceIdentifiers.indexOf(sourceIdentifier);
        unwrapped.sourceIdentifiers.splice(identifierIndex, 1);
        OmniUtil.swapType(source, sourceIdentifier, replacement);

        sourceIdentifierReplacements.set(sourceIdentifier, replacement);
      }
    }

    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {
      visitGenericType: (node, visitor) => {
        const type = node.baseType.omniType;
        if (type.kind == OmniTypeKind.GENERIC_TARGET) {

          // Go backwards, so we do not get invalid indexes while removing inline.
          for (let i = type.targetIdentifiers.length - 1; i >= 0; i--) {

            const target = type.targetIdentifiers[i];
            if (sourceIdentifierReplacements.has(target.sourceIdentifier)) {

              // Remove the corresponding node from the generic type.
              // This assumes that the two are *identical* and 1:1 and not changed by another transformer.
              // Could use some better way of investigating what should actually be removed.
              node.genericArguments.splice(i, 1);
            }
          }
        } else {
          defaultVisitor.visitGenericType(node, visitor);
        }
      },

      visitEdgeType: node => {

        if (node.omniType.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
          const replacement = sourceIdentifierReplacements.get(node.omniType);
          if (replacement) {
            node.omniType = replacement;
          }
        }
      },

      visitClassDeclaration: (node, visitor) => {

        if (node.genericParameterList) {
          node.genericParameterList.types = node.genericParameterList.types.filter(it => {
            if (it.sourceIdentifier && sourceIdentifierReplacements.has(it.sourceIdentifier)) {
              return false;
            }

            return true;
          });
        }

        defaultVisitor.visitClassDeclaration(node, visitor);
      },
    }));
  }
}
