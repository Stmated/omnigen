import {
  AstNode,
  AstTransformer,
  AstTransformerArguments,
  NameParts,
  OmniEnumType,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniInterfaceType,
  OmniModel,
  OmniObjectType,
  OmniOptionallyNamedType,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  PackageOptions,
  RootAstNode,
  TargetOptions,
  TypeUseKind,
} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, NamePair, Naming, OmniUtil} from '@omnigen/core';
import * as Code from '../CodeAst';
import * as FreeText from '../FreeText';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import {CodeAstUtils} from '../CodeAstUtils.ts';
import {CodeOptions} from '../../options/CodeOptions.ts';
import {CodeUtil} from '../../util/CodeUtil.ts';

const logger = LoggerFactory.create(import.meta.url);

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
    const exportableTypes = OmniUtil.getAllExportableTypes(args.model, args.model.types);

    const nameResolver = args.root.getNameResolver();

    const namePairs: NamePair<OmniType & OmniOptionallyNamedType>[] = [];
    for (const type of exportableTypes.all) {
      if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
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
      if ('name' in type && type.name) {
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

      // if ( && !OmniUtil.isComposition(b.owner)) {
      //   return 1;
      // } else if (!OmniUtil.isComposition(a.owner) && OmniUtil.isComposition(b.owner)) {
      //   return -1;
      // } else if (OmniUtil.isPrimitive(a.owner) && !OmniUtil.isPrimitive(b.owner)) {
      //   return 1;
      // } else if (!OmniUtil.isPrimitive(a.owner) && OmniUtil.isPrimitive(b.owner)) {
      //   return -1;
      // } else {
      //   return 0;
      // }
    });

    if (namePairs.length > 0) {
      const resolved = Naming.unwrapPairs(namePairs);
      for (const pair of resolved) {
        pair.owner.name = CodeUtil.getSafeIdentifierName(Naming.prefixedPascalCase(pair.name));
      }
    }

    // const removedTypes: OmniType[] = [];
    // for (const type of exportableTypes.all) {
    //   removedTypes.push(...this.simplifyTypeAndReturnUnwanted(type));
    // }

    // NOTE: Is this actually correct? Could it not delete types we actually want?
    // exportableTypes.all = exportableTypes.all.filter(it => !removedTypes.includes(it));

    for (const type of exportableTypes.all) {

      if (this._map.has(type)) {
        continue;
      }

      const ast = this.transform(args.model, args.root, args.options, type, exportableTypes.edge.includes(type));
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
  ): AstNode | undefined {

    if (type.kind == OmniTypeKind.ENUM) {
      return this.addEnum(type, undefined, root, options);
    } else if (OmniUtil.isComposition(type)) {

      if (type.kind == OmniTypeKind.EXCLUSIVE_UNION || (type.name && isEdgeType)) {
        return this.transformSubType(model, type, undefined, options, root);
      }

    } else if (type.kind == OmniTypeKind.OBJECT) {

      // TODO: This should be removed and instead simplified elsewhere, where we compress/fix "incorrect" types
      // In Java we cannot extend from an enum. So we will try and redirect the output.
      if (type.extendedBy && type.extendedBy.kind == OmniTypeKind.ENUM) {
        if (OmniUtil.isEmptyType(type)) {
          return this.addEnum(type.extendedBy, type, root, options);
        } else {
          throw new Error('Do not know how to handle this type, since Java cannot inherit from en Enum');
        }
      }

      return this.transformSubType(model, type, undefined, options, root);
    } else if (type.kind == OmniTypeKind.INTERFACE) {
      if (type.of.kind == OmniTypeKind.GENERIC_TARGET) {
        throw new Error(`Do not know yet how to handle a generic interface. Fix it.`);
      } else {
        return this.transformInterface(type, options, root);
      }
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return this.transformSubType(model, type.of, type, options, root, type.sourceIdentifiers);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      for (const targetIdentifier of type.targetIdentifiers) {
        if (OmniUtil.isComposition(targetIdentifier.type) && targetIdentifier.type.kind != OmniTypeKind.EXCLUSIVE_UNION) {

          // If a composition is used as a generic argument, then we will be required to create a class for it.
          return this.transformSubType(model, targetIdentifier.type, undefined, options, root);
        }
      }
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

    // const packageName = JavaUtil.getPackageName(dec.type.omniType, dec.name.value, options);
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

      body.children.push(
        new Code.ConstructorDeclaration(
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
        ),
      );
    }

    return enumDeclaration;
  }

  private transformInterface(
    type: OmniInterfaceType,
    options: PackageOptions & TargetOptions & CodeOptions,
    root: CodeRootAstNode,
  ): Code.InterfaceDeclaration {

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: type, options: options});
    const className = nameResolver.build({name: investigatedName, with: NameParts.NAME, use: TypeUseKind.DECLARED});
    const packageName = nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE});

    const declaration = CodeAstUtils.createInterfaceWithBody(root, type, options, () => className);

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
        const ast = this.transform(model, root, options, typeExtends, false);
        if (ast) {
          this._map.set(typeExtends, ast);
        }
      }
    }

    if (typeImplements.length > 0) {
      declaration.implements = new Code.ImplementsDeclaration(
        new Code.TypeList(...typeImplements.map(it => root.getAstUtils().createTypeNode(it))),
      );

      for (const typeInterface of typeImplements) {
        if (!this._map.has(typeInterface)) {
          const ast = this.transform(model, root, options, typeInterface, false);
          if (ast) {
            this._map.set(typeInterface, ast);
          }
        }
      }
    }

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: type, customName: declaration.name.value, options: options});
    const packageName = nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE}); // JavaUtil.getPackageName(type, declaration.name.value, options);
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
    const javaClassName = nameResolver.build({name: investigatedName, with: NameParts.NAME, use: TypeUseKind.CONCRETE});

    const javaType = root.getAstUtils().createTypeNode(type);
    const javaClassIdentifier = new Code.Identifier(javaClassName);

    if (genericSourceIdentifiers) {

      const genericSourceArgExpressions = genericSourceIdentifiers.map(it => new Code.GenericTypeDeclaration(
        new Code.Identifier(it.placeholderName),
        it,
        it.upperBound ? root.getAstUtils().createTypeNode(it.upperBound) : undefined,
        it.lowerBound ? root.getAstUtils().createTypeNode(it.lowerBound) : undefined,
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

  // /**
  //  * TODO: Remove and do this in another transformer (is it not already?)
  //  */
  // private simplifyTypeAndReturnUnwanted(type: OmniType): OmniType[] {
  //
  //   if (type.kind === OmniTypeKind.EXCLUSIVE_UNION && type.types.length == 2) {
  //
  //     const nullType = type.types.find(it => it.kind == OmniTypeKind.NULL);
  //     if (nullType) {
  //       const otherType = type.types.find(it => it.kind != OmniTypeKind.NULL);
  //       if (otherType && OmniUtil.isPrimitive(otherType)) {
  //
  //         // Clear. then assign all the properties of the Other (plus nullable: true) to target type.
  //         this.clearProperties(type);
  //         Object.assign(type, {
  //           ...otherType,
  //           nullable: true,
  //         });
  //         return [otherType];
  //       } else if (otherType && otherType.kind == OmniTypeKind.OBJECT) {
  //
  //         // For Java, any object can always be null.
  //         // TODO: Perhaps we should find all the places that use the type, and say {required: false}? Or is that not the same thing?
  //         this.clearProperties(type);
  //         Object.assign(type, otherType);
  //         return [otherType];
  //       }
  //     }
  //   }
  //
  //   return [];
  // }
  //
  // private clearProperties(type: OmniType): void {
  //   for (const key of Object.keys(type)) {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     delete (type as any)[key];
  //   }
  // }
}
