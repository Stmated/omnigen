import {Code} from '@omnigen/target-code';
import {
  AstTargetFunctions,
  AstTransformer,
  OmniArrayKind,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetType,
  OmniHardcodedReferenceType,
  OmniType,
  OmniTypeKind,
  TargetOptions,
  UnknownKind,
} from '@omnigen/api';
import {CSharpAstTransformerArguments, CSharpRootNode} from './index.ts';
import {CSharpOptions} from '../options';
import {TokenKind} from '@omnigen/target-code/ast';

/**
 * Replace:
 * - Generic modifiers into specific modifiers, like `static final` to `const`
 * - Super constructor calls with `dynamic` type cast to `object`
 * - Ternary `(a == null ? b : a)` into `a ?? b`
 * - Generic `array type` into `(I)List`, `(I)Set`.
 */
export class ToCSharpAstTransformer implements AstTransformer<CSharpRootNode, TargetOptions & CSharpOptions> {

  private static readonly _MAP_GENERIC_SOURCES = new Map<String, OmniGenericSourceType>();
  private static readonly _LIST_GENERIC_SOURCES = new Map<String, OmniGenericSourceType>();

  transformAst(args: CSharpAstTransformerArguments): void {

    const astUtils = args.root.getAstUtils();

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceModifierList: (n, r) => {

        const isStatic = n.children.some(it => it.kind === Code.ModifierKind.STATIC);
        const isFinal = n.children.some(it => it.kind === Code.ModifierKind.FINAL);

        if (isStatic && isFinal) {

          const altered = [...n.children].filter(it => it.kind !== Code.ModifierKind.CONST && it.kind !== Code.ModifierKind.STATIC && it.kind !== Code.ModifierKind.FINAL);

          altered.push(new Code.Modifier(Code.ModifierKind.CONST));

          return new Code.ModifierList(...altered).withIdFrom(n);
        }

        return n;
      },

      reduceSuperConstructorCall: (n, r) => {

        const reduced = defaultReducer.reduceSuperConstructorCall(n, r);
        if (!reduced) {
          return undefined;
        }

        let alteredArgumentCount = 0;
        const newArguments = new Code.ArgumentList();
        for (let i = 0; i < reduced.arguments.children.length; i++) {
          const argument = reduced.arguments.children[i];
          let resolvedArgument = argument;
          let needsCast = false;
          if (resolvedArgument instanceof Code.DeclarationReference) {
            resolvedArgument = resolvedArgument.resolve(args.root);
          }
          if (resolvedArgument instanceof Code.Parameter) {
            const t = resolvedArgument.type.omniType;
            needsCast = (t.kind === OmniTypeKind.UNKNOWN && (t.unknownKind ?? args.options.unknownType) === UnknownKind.ANY);
          }

          if (needsCast) {

            // C# does not allow `dynamic` to be used in the constructor base call. So need to do a cast.
            // NOTE: This might require deletion later, if decide to move away from `dynamic`
            alteredArgumentCount++;
            const castedArgument = new Code.Cast(
              args.root.getAstUtils().createTypeNode({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'object'}}),
              argument,
            );

            newArguments.children.push(castedArgument);

          } else {
            newArguments.children.push(argument);
          }
        }

        if (alteredArgumentCount > 0) {
          return new Code.SuperConstructorCall(newArguments).withIdFrom(n);
        }

        return reduced;
      },

      reducePropertyIdentifier: (n, r) => {

        // Properties should not be possible to have reserved words, since the keywords are lowercase and properties pascal-case
        return n;
      },

      reduceIdentifier: (n, r) => {

        if (args.root.getNameResolver().isReservedWord(n.value)) {
          return new Code.Identifier(`@${n.value}`, n.original ?? n.value).withIdFrom(n);
        }

        return defaultReducer.reduceIdentifier(n, r);
      },

      reduceTernaryExpression: (n, r) => {

        const reduced = defaultReducer.reduceTernaryExpression(n, r);
        if (!reduced) {
          return undefined;
        }

        if (reduced instanceof Code.TernaryExpression && reduced.predicate instanceof Code.BinaryExpression && reduced.predicate.token === TokenKind.EQUALS) {
          if (reduced.predicate.right instanceof Code.Literal && reduced.predicate.right.primitiveKind === OmniTypeKind.NULL && reduced.predicate.left === reduced.failing) {
            return new Code.BinaryExpression(
              reduced.predicate.left,
              Code.TokenKind.COALESCE_NULL,
              reduced.passing,
            );
          }
        }

        return reduced;
      },

      reduceArrayType: (n, r) => {

        const reduced = defaultReducer.reduceArrayType(n, r);

        if (reduced && reduced instanceof Code.ArrayType) {
          let baseType: string | undefined = undefined;
          if (reduced.omniType.arrayKind === OmniArrayKind.SET) {
            baseType = n.implementation ? `HashSet` : `ISet`;
          } else if (reduced.omniType.arrayKind === OmniArrayKind.LIST) {
            baseType = reduced.implementation ? `List` : `IList`;
          }

          if (baseType) {

            const implementation = n.implementation ?? false;
            const source = ToCSharpAstTransformer.getListGenericSource(baseType);
            const genericTargetType: OmniGenericTargetType = {
              kind: OmniTypeKind.GENERIC_TARGET,
              source: source,
              targetIdentifiers: [
                {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: n.itemTypeNode.omniType, sourceIdentifier: source.sourceIdentifiers[0]},
              ],
            };

            return args.root.getAstUtils().createTypeNode(genericTargetType, implementation).reduce(r);
          }
        }

        // Keep it as-is, and it will be rendered as something special by its renderer.
        return reduced;
      },

      reduceWildcardType: n => {
        return ToCSharpAstTransformer.getUnknownClassName(n.omniType.unknownKind ?? args.options.unknownType, n.implementation, astUtils).setId(n.id);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  public static getUnknownClassName(
    unknownKind: UnknownKind,
    implementation: boolean | undefined,
    astUtils: AstTargetFunctions,
  ): Code.TypeNode {

    switch (unknownKind) {
      case UnknownKind.DYNAMIC_OBJECT: {

        const targetKeyType: OmniType = {kind: OmniTypeKind.STRING};
        const targetValueType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System'], edgeName: 'Object'}};

        const source = this.getMapGenericSource(false);
        const genericTargetType: OmniGenericTargetType = {
          kind: OmniTypeKind.GENERIC_TARGET,
          source: source,
          targetIdentifiers: [
            {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: targetKeyType, sourceIdentifier: source.sourceIdentifiers[0]},
            {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: targetValueType, sourceIdentifier: source.sourceIdentifiers[1]},
          ],
        };

        return astUtils.createTypeNode(genericTargetType, implementation);
      }
      case UnknownKind.DYNAMIC_NATIVE:
      case UnknownKind.DYNAMIC:
      case UnknownKind.ANY:
        return new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'dynamic'}} satisfies OmniHardcodedReferenceType, implementation);
      case UnknownKind.OBJECT:
        return new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System'], edgeName: 'Object'}}, implementation);
      case UnknownKind.WILDCARD:
        return new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: '?'}}, implementation);
    }
  }

  private static getMapGenericSource(implementation: boolean): OmniGenericSourceType {

    const objectName = implementation ? 'Dictionary' : 'IDictionary';
    let source = ToCSharpAstTransformer._MAP_GENERIC_SOURCES.get(objectName);

    if (!source) {
      const mapType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System', 'Collections', 'Generic'], edgeName: objectName}};

      const sourceKeyType: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'K'};
      const sourceValueType: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'V'};

      source = Object.freeze({
        kind: OmniTypeKind.GENERIC_SOURCE,
        of: mapType,
        sourceIdentifiers: [
          sourceKeyType,
          sourceValueType,
        ],
      });

      ToCSharpAstTransformer._MAP_GENERIC_SOURCES.set(objectName, source);
    }

    return source;
  }

  private static getListGenericSource(objectName: string): OmniGenericSourceType {

    let source = ToCSharpAstTransformer._LIST_GENERIC_SOURCES.get(objectName);

    if (!source) {

      const mapType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System', 'Collections', 'Generic'], edgeName: objectName}};

      const itemType: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'T'};

      source = Object.freeze({
        kind: OmniTypeKind.GENERIC_SOURCE,
        of: mapType,
        sourceIdentifiers: [
          itemType,
        ],
      });

      ToCSharpAstTransformer._LIST_GENERIC_SOURCES.set(objectName, source);
    }

    return source;
  }
}
