import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {
  AstNode,
  CompositionKind, OmniDecoratingType,
  OmniEnumType,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniInterfaceType,
  OmniModel,
  OmniObjectType,
  OmniOptionallyNamedType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  PackageOptions,
} from '@omnigen/core';
import * as Java from '../ast';
import {JavaAstRootNode, Modifier, ModifierList, ModifierType} from '../ast';
import {JavaUtil} from '../util';
import {JavaAstUtils} from './JavaAstUtils.ts';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, NamePair, Naming, OmniUtil} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Supposed to be the first and relatively simple transformer that adds the object (class, interface, enum, et cetera) declarations.
 *
 * It is up to later transformers to do things like adding fields, accessors, annotations, and what else.
 *
 * The more that is moved out from the class and put into specific transformers, the better.
 */
export class AddObjectDeclarationsJavaAstTransformer extends AbstractJavaAstTransformer {

  private readonly _map = new Map<OmniType, AstNode>();

  transformAst(args: JavaAstTransformerArgs): void {

    // TODO: Remove this "getAllExportableTypes" and instead use a visitor pattern where we find the relevant types for our first pass
    const exportableTypes = OmniUtil.getAllExportableTypes(args.model, args.model.types);

    const namePairs: NamePair<OmniType & OmniOptionallyNamedType>[] = [];
    for (const type of exportableTypes.all) {
      if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
        // These should keep their names, which are generally just 'T'.
        continue;
      }

      // NOTE: Check if wrapped type has a name and resolve/change it too?
      if ('name' in type) {
        namePairs.push({
          owner: type,
          name: type.name,
        });
      }
    }

    // TODO: This sorting should probably be more general and prefer Object > Interface > Composition
    namePairs.sort((a, b) => {
      if (a.owner.kind == OmniTypeKind.COMPOSITION && b.owner.kind != OmniTypeKind.COMPOSITION) {
        return 1;
      } else if (a.owner.kind != OmniTypeKind.COMPOSITION && b.owner.kind == OmniTypeKind.COMPOSITION) {
        return -1;
      } else {
        return 0;
      }
    });

    if (namePairs.length > 0) {
      const resolved = Naming.unwrap(namePairs);
      for (const pair of resolved) {
        pair.owner.name = Naming.prefixedPascalCase(pair.name);
      }
    }

    const removedTypes: OmniType[] = [];
    for (const type of exportableTypes.all) {
      removedTypes.push(...this.simplifyTypeAndReturnUnwanted(type));
    }

    // NOTE: Is this actually correct? Could it not delete types we actually want?
    exportableTypes.all = exportableTypes.all.filter(it => !removedTypes.includes(it));

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

  private transform(model: OmniModel, root: JavaAstRootNode, options: JavaAndTargetOptions, type: OmniType, isEdgeType: boolean): AstNode | undefined {

    if (type.kind == OmniTypeKind.ENUM) {
      return this.addEnum(type, undefined, root, options);
    } else if (type.kind == OmniTypeKind.COMPOSITION) {

      if (type.compositionKind == CompositionKind.XOR || (type.name && isEdgeType)) {
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
        if (targetIdentifier.type.kind == OmniTypeKind.COMPOSITION && targetIdentifier.type.compositionKind != CompositionKind.XOR) {

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
    root: Java.JavaAstRootNode,
    options: JavaAndTargetOptions,
  ): AstNode {

    const enumDeclaration = this.createEnum(type, originalType, options);
    return this.addObjectDeclaration(enumDeclaration, root, options);
  }

  private createEnum(
    type: OmniEnumType,
    originalType: OmniObjectType | undefined,
    options: JavaAndTargetOptions,
  ): Java.EnumDeclaration {

    const body = new Java.Block();

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

    const enumDeclaration = new Java.EnumDeclaration(
      new Java.EdgeType(type),
      new Java.Identifier(JavaUtil.getClassName(originalType || type, options)),
      body,
    );

    if (type.extendedBy) {
      throw new Error(
        `Not supported for enums (${OmniUtil.describe(type)}) to extend another (${OmniUtil.describe(type.extendedBy)}), must add java model transformer that translates into something viable`,
      );
    }

    if (type.enumConstants) {

      body.children.push(
        new Java.EnumItemList(
          ...type.enumConstants.map((item, idx) => {

            const comment = type.enumDescriptions ? new Java.CommentBlock(new Java.FreeText(type.enumDescriptions[`${item}`])) : undefined;
            const name = type.enumNames ? type.enumNames[idx] : Case.constant(String(item));

            return new Java.EnumItem(
              new Java.Identifier(name),
              new Java.Literal(item, type.primitiveKind),
              comment,
            );
          }),
        ),
      );

      const itemType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: type.primitiveKind,
      };

      const fieldType = new Java.EdgeType(itemType);
      const fieldIdentifier = new Java.Identifier('value');
      const field = new Java.Field(
        fieldType,
        fieldIdentifier,
        undefined,
      );

      body.children.push(field);

      const parameter = new Java.ConstructorParameter(
        new Java.FieldReference(field),
        fieldType,
        fieldIdentifier,
      );

      body.children.push(
        new Java.ConstructorDeclaration(
          new Java.ConstructorParameterList(parameter),
          new Java.Block(
            new Java.Statement(
              new Java.AssignExpression(new Java.FieldReference(field), new Java.DeclarationReference(parameter)),
            ),
          ),
          new Java.ModifierList(),
        ),
      );
    }

    return enumDeclaration;
  }

  private addObjectDeclaration(dec: Java.AbstractObjectDeclaration, root: Java.JavaAstRootNode, options: PackageOptions): Java.CompilationUnit {

    const cu = new Java.CompilationUnit(
      new Java.PackageDeclaration(JavaUtil.getPackageName(dec.type.omniType, dec.name.value, options)),
      new Java.ImportList(
        [],
      ),
      dec,
    );

    root.children.push(cu);
    return cu;
  }

  private transformInterface(
    type: OmniInterfaceType,
    options: JavaAndTargetOptions,
    root: Java.JavaAstRootNode,
  ): Java.InterfaceDeclaration {

    const declaration = JavaAstUtils.createInterfaceWithBody(type, options);

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(JavaUtil.getPackageName(type, declaration.name.value, options)),
      new Java.ImportList(
        [],
      ),
      declaration,
    ));

    return declaration;
  }

  private transformSubType(
    model: OmniModel,
    type: OmniType,
    originalType: OmniGenericSourceType | undefined,
    options: JavaAndTargetOptions,
    root: Java.JavaAstRootNode,
    genericSourceIdentifiers?: OmniGenericSourceIdentifierType[],
  ): AstNode {

    // TODO: This could be an interface, if it's only extended from, and used in multiple inheritance.
    //        Make use of the DependencyGraph to figure things out...
    const body = new Java.Block();

    const declaration = this.createSubTypeDeclaration(genericSourceIdentifiers, type, originalType, body, options);

    // TODO: Move to separate transformer, which job it is to add the proper extends / implements
    const [typeExtends, typeImplements] = JavaUtil.getExtendsAndImplements(model, type);
    const lowerBoundImplements: OmniType[] = typeImplements;

    const idxOfExtendsInImplements = typeExtends ? lowerBoundImplements.indexOf(typeExtends) : -1;
    if (idxOfExtendsInImplements != -1) {

      logger.warn(`Both extending and implementing '${OmniUtil.describe(typeExtends)}' for '${OmniUtil.describe(type)}'. Will remove from 'implements' list`);
      typeImplements.splice(idxOfExtendsInImplements, 1);
    }

    if (typeExtends) {
      declaration.extends = new Java.ExtendsDeclaration(
        JavaAstUtils.createTypeNode(typeExtends),
      );

      if (!this._map.has(typeExtends)) {
        const ast = this.transform(model, root, options, typeExtends, false);
        if (ast) {
          this._map.set(typeExtends, ast);
        }
      }
    }

    if (typeImplements.length > 0) {
      declaration.implements = new Java.ImplementsDeclaration(
        new Java.TypeList(typeImplements.map(it => JavaAstUtils.createTypeNode(it))),
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

    const packageName = JavaUtil.getPackageName(type, declaration.name.value, options);
    const cu = new Java.CompilationUnit(
      new Java.PackageDeclaration(packageName),
      new Java.ImportList(
        [],
      ),
      declaration,
    );

    root.children.push(cu);
    return cu;
  }

  private createSubTypeDeclaration(
    genericSourceIdentifiers: OmniGenericSourceIdentifierType[] | undefined,
    type: OmniType,
    originalType: OmniGenericSourceType | undefined,
    body: Java.Block,
    options: JavaAndTargetOptions,
  ): Java.AbstractObjectDeclaration {

    const javaClassName = JavaUtil.getClassName(originalType || type, options);
    const javaType = JavaAstUtils.createTypeNode(type);
    const javaClassIdentifier = new Java.Identifier(javaClassName);
    if (OmniUtil.isIdentifiable(type) && !type.name) {
      javaClassIdentifier.implicit = true;
    }

    if (genericSourceIdentifiers) {

      const genericSourceArgExpressions = genericSourceIdentifiers.map(it => new Java.GenericTypeDeclaration(
        new Java.Identifier(it.placeholderName),
        it,
        it.upperBound ? JavaAstUtils.createTypeNode(it.upperBound) : undefined,
        it.lowerBound ? JavaAstUtils.createTypeNode(it.lowerBound) : undefined,
      ));

      return new Java.ClassDeclaration(
        javaType,
        javaClassIdentifier,
        body,
        undefined,
        new Java.GenericTypeDeclarationList(genericSourceArgExpressions),
      );
    }

    const modifiers = new ModifierList(new Modifier(ModifierType.PUBLIC));

    if (type.kind == OmniTypeKind.OBJECT) {
      if (type.abstract) {
        modifiers.children.push(new Modifier(ModifierType.ABSTRACT));
      }
    }

    return new Java.ClassDeclaration(javaType, javaClassIdentifier, body, modifiers);
  }

  /**
   * TODO: Remove and do this in another transformer (is it not already?)
   */
  private simplifyTypeAndReturnUnwanted(type: OmniType): OmniType[] {

    if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.XOR) {
        if (type.types.length == 2) {
          const nullType = type.types.find(it => it.kind == OmniTypeKind.PRIMITIVE && it.primitiveKind == OmniPrimitiveKind.NULL);
          if (nullType) {
            const otherType = type.types.find(it => !(it.kind == OmniTypeKind.PRIMITIVE && it.primitiveKind == OmniPrimitiveKind.NULL));
            if (otherType && otherType.kind == OmniTypeKind.PRIMITIVE) {

              // Clear. then assign all the properties of the Other (plus nullable: true) to target type.
              this.clearProperties(type);
              Object.assign(type, {
                ...otherType,
                nullable: true,
              });
              return [otherType];
            } else if (otherType && otherType.kind == OmniTypeKind.OBJECT) {

              // For Java, any object can always be null.
              // TODO: Perhaps we should find all the places that use the type, and say {required: false}? Or is that not the same thing?
              this.clearProperties(type);
              Object.assign(type, otherType);
              return [otherType];
            }
          }
        }
      }
    }

    return [];
  }

  private clearProperties(type: OmniType): void {
    for (const key of Object.keys(type)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (type as any)[key];
    }
  }
}
