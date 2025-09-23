import {
  AstNode,
  AstTransformer,
  AstTransformerArguments,
  NameParts, OmniArrayType,
  OmniEnumType,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniInterfaceType,
  OmniModel, OmniNodeKind,
  OmniObjectType,
  OmniOptionallyNamedType,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  PackageOptions,
  RootAstNode, TargetFeatures,
  TargetOptions,
  TypeUseKind,
} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {ANY_KIND, Case, NamePair, Naming, OmniUtil, ProxyReducerOmni2, TypeCollection} from '@omnigen/core';
import * as Code from '../CodeAst';
import * as FreeText from '../FreeText';
import {CodeRootAstNode} from '../CodeRootAstNode';
import {CodeAstUtils} from '../CodeAstUtils';
import {CodeOptions} from '../../options/CodeOptions';
import {CodeUtil} from '../../util/CodeUtil';

const logger = LoggerFactory.create(import.meta.url);

const transparentKinds: OmniNodeKind[] = [
  OmniTypeKind.ARRAY,
  OmniTypeKind.DICTIONARY,
  OmniTypeKind.NEGATION,
  OmniTypeKind.UNION,
  OmniTypeKind.EXCLUSIVE_UNION,
  OmniTypeKind.INTERSECTION,
  OmniTypeKind.GENERIC_SOURCE,
  OmniTypeKind.GENERIC_TARGET,
];

/**
 * Supposed to be the first and relatively simple transformer that adds the object (class, interface, enum, et cetera) declarations.
 *
 * It is up to later transformers to do things like adding fields, accessors, annotations, and what else.
 *
 * The more that is moved out from the class and put into specific transformers, the better.
 */
export class AddObjectDeclarationsCodeAstTransformer implements AstTransformer<CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions> {

  private readonly _map = new Map<OmniType, AstNode>();

  transformAst(args: AstTransformerArguments<CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>): void {

    // TODO: Remove this "getAllExportableTypes" and instead use a visitor pattern where we find the relevant types for our first pass
    const exportableTypes = AddObjectDeclarationsCodeAstTransformer.getAllExportableTypes(args.model);

    const nameResolver = args.root.getNameResolver();

    const namePairs: NamePair<OmniType & OmniOptionallyNamedType>[] = [];
    for (const type of exportableTypes.all) {
      if (type.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
        // These should keep their names, which are generally just 'T'.
        continue;
      }

      if (OmniUtil.isComposition(type) && !type.name && !type.inline) {
        const investigatedName = nameResolver.investigate({type: type, options: args.options});
        const stringName = nameResolver.build({name: investigatedName, with: NameParts.NAME, use: TypeUseKind.CONCRETE});
        type.name = {
          name: stringName,
        };
      }

      // NOTE: Check if wrapped type has a name and resolve/change it too?
      if (OmniUtil.isNameable(type) && type.name) {
        namePairs.push({
          owner: type,
          name: type.name,
        });
      }
    }

    namePairs.sort((a, b) => {
      let res = (OmniUtil.isPrimitive(a.owner) ? 1 : 0) - (OmniUtil.isPrimitive(b.owner) ? 1 : 0);
      if (res === 0) {
        res = (OmniUtil.isComposition(a.owner) ? 1 : 0) - (OmniUtil.isComposition(b.owner) ? 1 : 0);
        if (res === 0) {
          res = (a.owner.kind === OmniTypeKind.INTERFACE ? 1 : 0) - (b.owner.kind === OmniTypeKind.INTERFACE ? 1 : 0);
        }
      }
      return res;
    });

    if (namePairs.length > 0) {
      const resolved = Naming.unwrapPairs(namePairs);
      for (const pair of resolved) {
        pair.owner.name = CodeUtil.getSafeIdentifierName(pair.name);
      }
    }

    for (const type of exportableTypes.all) {

      if (this._map.has(type)) {
        continue;
      }

      const ast = this.transform(args.model, args.root, args.options, type, exportableTypes.edge.includes(type), args.features);
      if (ast) {
        this._map.set(type, ast);
      }
    }
  }

  private transform(
    model: OmniModel,
    root: CodeRootAstNode,
    options: PackageOptions & TargetOptions & CodeOptions,
    type: OmniType,
    isEdgeType: boolean,
    features: TargetFeatures,
  ): AstNode | undefined {

    if (type.kind === OmniTypeKind.ENUM) {
      return this.addEnum(type, undefined, root, options);
    } else if (OmniUtil.isComposition(type)) {

      if (type.kind === OmniTypeKind.EXCLUSIVE_UNION || (type.name && isEdgeType)) {
        return this.transformSubType(model, type, undefined, options, features, root);
      }

    } else if (type.kind === OmniTypeKind.OBJECT) {

      // TODO: This should be removed and instead simplified elsewhere, where we compress/fix "incorrect" types
      // In Java we cannot extend from an enum. So we will try and redirect the output.
      if (type.extendedBy && type.extendedBy.kind === OmniTypeKind.ENUM) {
        if (OmniUtil.isEmptyType(type)) {
          return this.addEnum(type.extendedBy, type, root, options);
        } else {
          throw new Error('Do not know how to handle this type, since Java cannot inherit from en Enum');
        }
      }

      return this.transformSubType(model, type, undefined, options, features, root);
    } else if (type.kind === OmniTypeKind.INTERFACE) {
      if (type.of.kind === OmniTypeKind.GENERIC_TARGET) {
        throw new Error(`Do not know yet how to handle a generic interface. Fix it.`);
      } else {
        return this.transformInterface(type, options, root, features);
      }
    } else if (type.kind === OmniTypeKind.GENERIC_SOURCE) {
      return this.transformSubType(model, type.of, type, options, features, root, type.sourceIdentifiers);
    } else if (type.kind === OmniTypeKind.GENERIC_TARGET) {
      for (const targetIdentifier of type.targetIdentifiers) {
        if (OmniUtil.isComposition(targetIdentifier.type) && targetIdentifier.type.kind != OmniTypeKind.EXCLUSIVE_UNION) {

          // If a composition is used as a generic argument, then we will be required to create a class for it.
          return this.transformSubType(model, targetIdentifier.type, undefined, options, features, root);
        }
      }
    } else if (type.kind === OmniTypeKind.ARRAY && type.name) {
      // If it's an array and it has a name, then we should likely be adding it as as type as well.
      return this.addArray(model, type, undefined, options, features, root);
    }

    return undefined;
  }

  private addEnum(
    type: OmniEnumType,
    originalType: OmniObjectType | undefined,
    root: CodeRootAstNode,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): AstNode {

    const dec = this.createEnum(root, type, originalType, options);

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: dec.type.omniType, customName: dec.name.value, options: options});
    const packageName = nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE});

    const cu = new Code.CompilationUnit(
      new Code.PackageDeclaration(packageName),
      new Code.ImportList(),
      dec,
    );

    root.children.push(cu);
    return cu;
  }

  private addArray(
    model: OmniModel,
    arrayType: OmniArrayType,
    originalType: OmniGenericSourceType | undefined,
    options: PackageOptions & TargetOptions & CodeOptions,
    features: TargetFeatures,
    root: CodeRootAstNode,
  ): AstNode {

    const typeNode = root.getAstUtils().createTypeNode(arrayType, false);

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: arrayType, options: options});
    const identifierName = nameResolver.build({name: investigatedName, with: NameParts.NAME});
    const packageName = nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE});

    // TODO: Wrong. It should be a new type of declaration for a `type` -- or perhaps we need a new `Code.ArrayDeclaration`
    const dec = new Code.VariableDeclaration(
      new Code.Identifier(identifierName),
      typeNode,
      undefined,
      true,
    );

    const cu = new Code.CompilationUnit(
      new Code.PackageDeclaration(packageName),
      new Code.ImportList(),
      new Code.Statement(dec),
    );

    root.children.push(cu);
    return cu;
  }

  private createEnum(
    root: CodeRootAstNode,
    type: OmniEnumType,
    originalType: OmniObjectType | undefined,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): Code.EnumDeclaration {

    const body = new Code.Block();

    if (originalType) {

      type = {
        ...type,
        name: originalType.name ?? type.name,
        description: originalType.description ?? type.description,
        summary: originalType.summary ?? type.summary,
        accessLevel: originalType.accessLevel ?? type.accessLevel,
        debug: originalType.debug ?? type.debug,
        title: originalType.title ?? type.title,
        absoluteUri: originalType.absoluteUri ?? type.absoluteUri,
      };
    }

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: originalType || type, options: options});
    const className = nameResolver.build({name: investigatedName, with: NameParts.NAME, use: TypeUseKind.DECLARED});

    const enumDeclaration = new Code.EnumDeclaration(
      new Code.EdgeType(type),
      new Code.Identifier(className),
      body,
    );

    if (type.extendedBy) {
      throw new Error(
        `Not supported for enums (${OmniUtil.describe(type)}) to extend another (${OmniUtil.describe(type.extendedBy)}), must add java model transformer that translates into something viable`,
      );
    }

    if (type.members) {

      body.children.push(
        new Code.EnumItemList(
          ...type.members.map(item => {
            let comment: Code.Comment | undefined = undefined;
            if (item.description) {
              comment = new Code.Comment(new FreeText.FreeText(item.description));
            }

            return new Code.EnumItem(
              new Code.Identifier(item.name || Case.constant(String(item.value))),
              new Code.Literal(item.value, type.itemKind),
              comment,
            );
          }),
        ),
      );

      const itemType: OmniPrimitiveType = {
        kind: type.itemKind,
      };

      const fieldType = new Code.EdgeType(itemType);
      const fieldIdentifier = new Code.Identifier('value');
      const field = new Code.Field(
        fieldType,
        fieldIdentifier,
      );
      field.modifiers = new Code.ModifierList(
        new Code.Modifier(Code.ModifierKind.PRIVATE),
        new Code.Modifier(Code.ModifierKind.FINAL),
      );

      body.children.push(field);
      body.children.push(new Code.FieldBackedGetter(new Code.FieldReference(field)));

      const parameterName = CodeUtil.getPrettyParameterName(fieldIdentifier.value);
      const parameterIdentifier = new Code.Identifier(parameterName);
      const parameter = new Code.ConstructorParameter(
        new Code.FieldReference(field),
        fieldType,
        parameterIdentifier,
      );

      const constructorDec = new Code.ConstructorDeclaration(
        new Code.ConstructorParameterList(parameter),
        new Code.Block(
          new Code.Statement(
            new Code.BinaryExpression(
              new Code.MemberAccess(new Code.SelfReference(), new Code.FieldReference(field)),
              Code.TokenKind.ASSIGN,
              new Code.DeclarationReference(parameter),
            ),
          ),
        ),
        new Code.ModifierList(),
      );

      body.children.push(constructorDec);

      if (options.debug) {
        constructorDec.comments = CodeUtil.addComment(constructorDec.comments, `Enum constructor, to take a non-standard backing value`);
      }
    }

    return enumDeclaration;
  }

  private transformInterface(
    type: OmniInterfaceType,
    options: PackageOptions & TargetOptions & CodeOptions,
    root: CodeRootAstNode,
    features: TargetFeatures,
  ): Code.InterfaceDeclaration {

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: type, options: options});
    const className = nameResolver.build({name: investigatedName, with: NameParts.NAME, use: TypeUseKind.DECLARED});
    const packageName = nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE});

    const declaration = CodeAstUtils.createInterfaceWithBody(root, type, options, features, () => className);

    root.children.push(new Code.CompilationUnit(
      new Code.PackageDeclaration(packageName),
      new Code.ImportList(),
      declaration,
    ));

    return declaration;
  }

  private transformSubType(
    model: OmniModel,
    type: OmniType,
    originalType: OmniGenericSourceType | undefined,
    options: PackageOptions & TargetOptions & CodeOptions,
    features: TargetFeatures,
    root: CodeRootAstNode,
    genericSourceIdentifiers?: OmniGenericSourceIdentifierType[],
  ): AstNode {

    // TODO: This could be an interface, if it's only extended from, and used in multiple inheritance.
    //        Make use of the DependencyGraph to figure things out...
    const body = new Code.Block();

    const declaration = this.createSubTypeDeclaration(root, genericSourceIdentifiers, type, originalType, body, options);

    // TODO: Move to separate transformer, which job it is to add the proper extends / implements
    const [typeExtends, typeImplements] = CodeUtil.getExtendsAndImplements(model, type, root.getFunctions());
    const lowerBoundImplements: OmniType[] = typeImplements;

    const idxOfExtendsInImplements = typeExtends ? lowerBoundImplements.indexOf(typeExtends) : -1;
    if (idxOfExtendsInImplements != -1) {

      logger.warn(`Both extending and implementing '${OmniUtil.describe(typeExtends)}' for '${OmniUtil.describe(type)}'. Will remove from 'implements' list`);
      typeImplements.splice(idxOfExtendsInImplements, 1);
    }

    if (typeExtends) {
      declaration.extends = new Code.ExtendsDeclaration(
        new Code.TypeList(root.getAstUtils().createTypeNode(typeExtends)),
      );

      if (!this._map.has(typeExtends)) {
        const ast = this.transform(model, root, options, typeExtends, false, features);
        if (ast) {
          this._map.set(typeExtends, ast);
        }
      }
    }

    for (const property of OmniUtil.getPropertiesOf(type)) {
      const propertyType = property.type;
      if (!this._map.has(propertyType)) {
        const ast = this.transform(model, root, options, propertyType, true, features);
        if (ast) {
          this._map.set(propertyType, ast);
        }
      }
    }

    if (typeImplements.length > 0) {
      declaration.implements = new Code.ImplementsDeclaration(
        new Code.TypeList(...typeImplements.map(it => root.getAstUtils().createTypeNode(it))),
      );

      for (const typeInterface of typeImplements) {
        if (!this._map.has(typeInterface)) {
          const ast = this.transform(model, root, options, typeInterface, false, features);
          if (ast) {
            this._map.set(typeInterface, ast);
          }
        }
      }
    }

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: type, customName: declaration.name.value, options: options});
    const packageName = nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE});
    const cu = new Code.CompilationUnit(
      new Code.PackageDeclaration(packageName),
      new Code.ImportList(),
      declaration,
    );

    root.children.push(cu);
    return cu;
  }

  private createSubTypeDeclaration(
    root: RootAstNode,
    genericSourceIdentifiers: OmniGenericSourceIdentifierType[] | undefined,
    type: OmniType,
    originalType: OmniGenericSourceType | undefined,
    body: Code.Block,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): Code.AbstractObjectDeclaration {

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: originalType || type, options: options});
    const className = nameResolver.build({name: investigatedName, with: NameParts.NAME, use: TypeUseKind.CONCRETE});

    const astUtils = root.getAstUtils();
    const javaType = astUtils.createTypeNode(type);
    const javaClassIdentifier = new Code.Identifier(className);

    if (genericSourceIdentifiers) {

      const genericSourceArgExpressions = genericSourceIdentifiers.map(it => new Code.GenericTypeDeclaration(
        new Code.Identifier(it.placeholderName),
        it,
        it.upperBound ? astUtils.createTypeNode(it.upperBound) : undefined,
        it.lowerBound ? astUtils.createTypeNode(it.lowerBound) : undefined,
      ));

      return new Code.ClassDeclaration(
        javaType,
        javaClassIdentifier,
        body,
        undefined,
        new Code.GenericTypeDeclarationList(...genericSourceArgExpressions),
      );
    }

    const modifiers = new Code.ModifierList(new Code.Modifier(Code.ModifierKind.PUBLIC));

    if (type.kind === OmniTypeKind.OBJECT) {
      if (type.abstract) {
        modifiers.children.push(new Code.Modifier(Code.ModifierKind.ABSTRACT));
      }
    }

    return new Code.ClassDeclaration(javaType, javaClassIdentifier, body, modifiers);
  }

  public static getAllExportableTypes(model: OmniModel): TypeCollection {

    const all = new Set<OmniType>();
    const edges = new Set<OmniType>();

    const typeDepths: number[] = [0];
    ProxyReducerOmni2.builder().reduce(model, {immutable: true}, {
      [ANY_KIND]: (n, r) => {

        if (!OmniUtil.isType(n)) {
          return r.callBase();
        }

        if (all.has(n)) {
          if (typeDepths[typeDepths.length - 1] === 0 || model.types.includes(n)) {
            // This type has been found before, but this time it was found as a property or was part of manual model types.
            edges.add(n);
          }
        } /*else if (OmniUtil.isComposition(n) && n.inline) {
          // Inline composition types are not edge types.
          all.add(n);
          return r.callBase();
        } */ else if (n.kind !== OmniTypeKind.GENERIC_SOURCE && r.parent && (r.parent.kind === OmniTypeKind.GENERIC_SOURCE || r.parent.kind === OmniTypeKind.GENERIC_TARGET)) {

          // The type that is inside the generic type is not itself exportable, only the generic class actually is.
          // TODO: This special handling is confusing and brittle when it comes to how `AddObjectDeclarationsCodeAstTransformer` works.
          //        Would be better to just let that transformer visit the whole model recursively and let it decide when to create something or not.
          r.callBase();
        } else {

          all.add(n);
          if (typeDepths[typeDepths.length - 1] === 0 || model.types.includes(n)) {
            edges.add(n);
          }

          const increaseBy = transparentKinds.includes(n.kind) ? 0 : 1;
          typeDepths[typeDepths.length - 1] += increaseBy;
          r.callBase();
          typeDepths[typeDepths.length - 1] -= increaseBy;
        }
      },
      PROPERTY: (_, r) => {
        try {
          typeDepths.push(0);
          r.callBase();
        } finally {
          typeDepths.pop();
        }
      },
    });

    return {
      all: [...all],
      edge: [...edges],
      named: [],
    };
  }
}
