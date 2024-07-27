import {AstTransformer, AstTransformerArguments, OmniGenericSourceIdentifierType, OmniGenericSourceType, OmniType, OmniTypeKind, TypeDiffKind} from '@omnigen/core';
import {OmniUtil, Visitor} from '@omnigen/core-util';
import {CodeRootAstNode} from '../CodeRootAstNode';
import {LoggerFactory} from '@omnigen/core-log';
import {GenericType} from '../CodeAst.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If all target identifiers to a source have the same type, then replace that source identifier with inline type.
 *
 * This could happen if the model had type literals as generics, but the target language does not support it.
 * Then the rendered type will be the common denominator primitive of the literal, and be the same everywhere.
 *
 * There could also be some other transformer that replaces one type with another, making them clones in the end.
 */
export class SimplifyGenericsAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    type TargetInfo = { source: OmniGenericSourceType, targetTypes: Set<OmniType> };
    const sourceIdentifierToTargetsMap = new Map<OmniGenericSourceIdentifierType, TargetInfo>();

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(defaultVisitor, {
      visitGenericType: node => {
        const type = node.baseType.omniType;
        if (type.kind === OmniTypeKind.GENERIC_TARGET) {

          for (const target of type.targetIdentifiers) {

            const sourceIdentifier = target.sourceIdentifier;
            if (target.type.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
              logger.trace(`Skipping potential simplification of ${OmniUtil.describe(sourceIdentifier)}, since it is referring to ${OmniUtil.describe(target.type)}`);
              continue;
            }

            const info = (
              sourceIdentifierToTargetsMap.has(sourceIdentifier)
                ? sourceIdentifierToTargetsMap
                : sourceIdentifierToTargetsMap.set(sourceIdentifier, {source: type.source, targetTypes: new Set()})
            ).get(sourceIdentifier)!;

            const normalizedType = OmniUtil.asNonNullableIfHasDefault(target.type, args.features);
            info.targetTypes.add(normalizedType);
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
          allowedDiffs.push(TypeDiffKind.POLYMORPHIC_LITERAL);
          allowedDiffs.push(TypeDiffKind.CONCRETE_VS_ABSTRACT);
        }

        const distinctTypes = OmniUtil.getDistinctTypes(
          [...targetTypes],
          args.features,
          diff => allowedDiffs.includes(diff),
        );

        if (distinctTypes.length == 1) {

          // This is not necessarily the best type to pick!
          // We just know what the types are not distinct according to the language features.
          // But one type might be Literal String and the other a regular String.
          // We should then prefer to have the regular String as result here, to not confuse other code.
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

    const genericTypesToSimplify: GenericType[] = [];

    args.root.visit(Visitor.create(defaultVisitor, {
      visitGenericType: (n, v) => {
        const type = n.baseType.omniType;
        if (type.kind == OmniTypeKind.GENERIC_TARGET) {

          // Go backwards, so we do not get invalid indexes while removing inline.
          for (let i = type.targetIdentifiers.length - 1; i >= 0; i--) {

            const target = type.targetIdentifiers[i];
            if (sourceIdentifierReplacements.has(target.sourceIdentifier)) {

              // Remove the corresponding node from the generic type.
              // This assumes that the two are *identical* and 1:1 and not changed by another transformer.
              // Could use some better way of investigating what should actually be removed.
              logger.silent(`Removing generic argument ${i} from ${OmniUtil.describe(type)}`);
              type.debug = OmniUtil.addDebug(type.debug, `Removed generic argument ${OmniUtil.describe(n.genericArguments[i].omniType)}`);
              n.genericArguments.splice(i, 1);
            }
          }

          if (n.genericArguments.length === 0) {
            genericTypesToSimplify.push(n);
          }
        } else {
          defaultVisitor.visitGenericType(n, v);
        }
      },

      visitEdgeType: n => {

        if (n.omniType.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
          const replacement = sourceIdentifierReplacements.get(n.omniType);
          if (replacement) {
            n.omniType = replacement;
          }
        }
      },

      visitClassDeclaration: (n, v) => {

        if (n.genericParameterList) {
          n.genericParameterList.types = n.genericParameterList.types.filter(it => {
            return !(it.sourceIdentifier && sourceIdentifierReplacements.has(it.sourceIdentifier));
          });

          if (n.genericParameterList.types.length === 0) {
            n.genericParameterList = undefined;
          }
        }

        defaultVisitor.visitClassDeclaration(n, v);
      },
    }));

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce(Visitor.create(defaultReducer, {
      reduceGenericType: n => {

        if (genericTypesToSimplify.includes(n)) {

          // There are no longer any generic arguments for this type, and it has qualified for simplification.
          return n.baseType;
        }

        return n;
      },
    }));

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
