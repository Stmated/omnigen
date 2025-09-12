import {LoggerFactory} from '@omnigen/core-log';
import {
  AstNode,
  AstTargetFunctions,
  AstVisitor,
  NameParts,
  NodeResolveCtx, OMNI_GENERIC_FEATURES,
  OmniArrayType,
  OmniGenericTargetType,
  OmniInterfaceOrObjectType,
  OmniInterfaceType,
  OmniObjectType,
  OmniProperty, OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  PackageOptions,
  Reference,
  RootAstNode, TargetFeatures,
  TargetOptions,
  TypeName,
  TypeNode,
  TypeUseKind,
  UnknownKind,
} from '@omnigen/api';
import {AbortVisitingWithResult, Case, isDefined, OmniUtil, Visitor, VisitResultFlattener} from '@omnigen/core';
import * as Code from '../ast/Code';
import {CodeRootAstNode} from './CodeRootAstNode';
import {CodeOptions} from '../options/CodeOptions';

const logger = LoggerFactory.create(import.meta.url);

export class CodeAstUtils implements AstTargetFunctions {

  public createTypeNode<const T extends OmniType>(type: T, implementation?: boolean): TypeNode {

    if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return this.createArrayTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.upperBound) {
        return new Code.BoundedType(type, new Code.WildcardType(type, implementation), this.createTypeNode(type.upperBound, implementation));
      } else {
        return new Code.WildcardType(type, implementation);
      }
    } else if (type.kind == OmniTypeKind.DECORATING) {
      const of = this.createTypeNode(type.of, implementation);
      return new Code.DecoratingTypeNode(of, type);
    }

    return new Code.EdgeType(type, implementation);
  }

  private createArrayTypeNode<const T extends OmniArrayType>(
    type: T,
    implementation: boolean | undefined,
  ): TypeNode<T> {

    const itemNode = this.createTypeNode(type.of);
    return new Code.ArrayType(type, itemNode, implementation);
  }

  private createGenericTargetTypeNode<const T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): TypeNode<T> {

    const baseType = new Code.EdgeType(type, implementation);

    // NOTE: In future versions of Java it might be possible to have primitive generic arguments.
    //        But for now we change all the primitive types into a reference type.
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => {

      let referenceType = OmniUtil.toReferenceType(it.type);
      if (referenceType.kind === OmniTypeKind.UNKNOWN && !referenceType.unknownKind) {

        // No set unknown type and Object, are probably better off as wildcard type ?
        referenceType = {
          ...referenceType,
          unknownKind: UnknownKind.WILDCARD,
        };
      }

      return this.createTypeNode(referenceType);
    });

    return new Code.GenericType(type, baseType, mappedGenericTargetArguments);
  }

  public static getReferenceIdNodeMap<
    R,
    V extends AstVisitor<R>
  >(
    root: RootAstNode,
    partial: (ctx: NodeResolveCtx<R, V>) => Partial<V>,
  ): Map<number, AstNode> {

    const map = new Map<number, AstNode>();
    const ids: number[] = [];

    // NOTE: Bad conversion. Needs to be fixed one day (after all visitors have been made non-generic)
    const defaultVisitor = root.createVisitor<void>() as unknown as V;
    root.visit({
      ...defaultVisitor,
      ...partial({ids, map, visitor: defaultVisitor}),
    });

    for (const key of map.keys()) {
      if (!ids.includes(key)) {
        map.delete(key);
      }
    }

    return map;
  }

  public static getGetterFieldReference(root: RootAstNode, method: Code.MethodDeclaration): Reference<Code.Field> | undefined {

    const fieldRef = CodeAstUtils.getSoloReturnOfNoArgsMethod(method);
    if (!(fieldRef instanceof Code.FieldReference)) {
      return undefined;
    }

    return fieldRef;
  }

  public static getGetterField(root: RootAstNode, method: Code.MethodDeclaration): Code.Field | undefined {

    const fieldId = CodeAstUtils.getGetterFieldReference(root, method);
    if (fieldId === undefined) {
      return undefined;
    }

    return root.resolveNodeRef<Code.Field>(fieldId);
  }

  public static isVisibleToSubTypes(node: Code.Field): boolean {
    return node.modifiers.children.some(it => it.kind === Code.ModifierKind.PUBLIC || it.kind === Code.ModifierKind.PROTECTED);
  }

  public static getSoloReturnOfNoArgsMethod(method: Code.MethodDeclaration): AstNode | undefined {

    if (method.signature.parameters && method.signature.parameters.children.length > 0) {
      return undefined;
    }

    if (!method.body || method.body.children.length != 1) {
      return undefined;
    }

    const statement = CodeAstUtils.unwrap(method.body.children[0]);
    if (!(statement instanceof Code.ReturnStatement)) {
      return undefined;
    }

    return statement.expression;
  }

  public static unwrap(node: AstNode): AstNode {

    if (node instanceof Code.Statement) {
      return node.child;
    }

    return node;
  }

  public static createInterfaceWithBody(
    root: RootAstNode,
    type: OmniInterfaceType,
    options: TargetOptions & CodeOptions,
    features: TargetFeatures,
    classNameMapper: (t: OmniInterfaceType<OmniSuperTypeCapableType>, o: TargetOptions & CodeOptions) => string,
  ) {

    const declaration = new Code.InterfaceDeclaration(
      root.getAstUtils().createTypeNode(type),
      new Code.Identifier(classNameMapper(type, options)),
      new Code.Block(),
    );

    CodeAstUtils.addInterfaceProperties(root, type, declaration.body, features);

    return declaration;
  }

  public static addInterfaceProperties(
    root: RootAstNode,
    type: OmniInterfaceOrObjectType,
    body: Code.Block,
    features: TargetFeatures,
  ): void {

    const interfaceLikeTarget = (type.kind === OmniTypeKind.INTERFACE) ? type.of : type;

    // Transform the object, but add no fields and only add the abstract method declaration (signature only)
    for (const property of OmniUtil.getPropertiesOf(interfaceLikeTarget)) {

      const accessorName = OmniUtil.getPropertyAccessorName(property.name);
      if (!accessorName) {
        continue;
      }

      const identifier = new Code.Identifier(accessorName);
      const getterIdentifier = new Code.GetterIdentifier(identifier, property.type);

      if (features.interfaceWithFields) {

        const field = new Code.Field(
          new Code.EdgeType(property.type),
          identifier,
          new Code.ModifierList(),
          undefined,
          undefined,
        );

        field.property = property;

        body.children.push(field);
      } else {

        body.children.push(
          new Code.MethodDeclaration(
            new Code.MethodDeclarationSignature(
              getterIdentifier,
              new Code.EdgeType(property.type),
              undefined,
              new Code.ModifierList(),
            ),
          ),
        );
      }
    }
  }

  public static getOmniType(root: RootAstNode, node: AstNode): OmniType | undefined {

    if (node instanceof Code.AbstractObjectDeclaration) {
      return node.omniType;
    } else if (node instanceof Code.StaticMemberReference) {
      return CodeAstUtils.getOmniType(root, node.member);
    } else if (node instanceof Code.FieldReference) {
      const resolved = node.resolve(root);
      return CodeAstUtils.getOmniType(root, resolved);
    } else if (node instanceof Code.DeclarationReference) {
      const resolved = node.resolve(root);
      return CodeAstUtils.getOmniType(root, resolved);
    } else if ('type' in node && node.type) {
      return CodeAstUtils.getOmniType(root, node.type as AstNode);
    } else if ('omniType' in node && typeof node.omniType == 'object' && node.omniType && 'kind' in node.omniType) {

      // NOTE: This is quite ugly
      return node.omniType as OmniType;
    }

    return undefined;
  }

  public static addOmniPropertyToBlockAsField(args: {
    root: RootAstNode,
    property: OmniProperty,
    body: Code.Block,
    options: CodeOptions,
    modifiers?: Code.ModifierKind[],
  }): Code.Field | undefined {

    if (OmniUtil.isNull(args.property.type) && !args.options.includeAlwaysNullProperties) {
      return undefined;
    }

    if (args.property.abstract) {

      // If the property is abstract, then we should not be adding a field for it.
      // Instead it will be added by another transformer that deals with the getters and setters.
      return undefined;
    }

    const fieldType = OmniUtil.asNonNullableIfHasDefault(args.property.type, OMNI_GENERIC_FEATURES);

    const fieldTypeNode = args.root.getAstUtils().createTypeNode(fieldType);
    let originalName: TypeName | undefined = OmniUtil.getPropertyName(args.property.name);
    if (!originalName) {
      if (OmniUtil.isPatternPropertyName(args.property.name)) {

        // The field's property does not have a name per se.
        // But the field needs a name until it can be replaced by something better at later stages.
        // If the target supports several index accessors, there might be several of these.
        // But if the target only supports a regular map or similar, then this will likely be the only one.
        originalName = `additionalProperties`;

      } else {
        return undefined;
      }
    }

    const fieldName = OmniUtil.getPropertyFieldNameOnly(args.property.name) || Case.camel(originalName);
    const fieldIdentifier = new Code.Identifier(fieldName, originalName);

    const field = new Code.Field(
      fieldTypeNode,
      fieldIdentifier,
      new Code.ModifierList(
        ...(args.modifiers ?? [Code.ModifierKind.PRIVATE]).map(m => new Code.Modifier(m)),
      ),
    );

    if (OmniUtil.isPrimitive(args.property.type)) {
      if (args.property.type.kind == OmniTypeKind.NULL) {
        field.initializer = new Code.Literal(args.property.type.value ?? null, args.property.type.kind);
      } else if (args.property.type.value !== undefined) {
        if (args.options.immutable && !args.property.type.literal) {

          // If the model is immutable and the value given is just a default,
          // then it will have to be given through the constructor in the constructor transformer.

        } else {

          field.initializer = new Code.Literal(args.property.type.value, args.property.type.kind);
        }
      }
    }

    field.property = args.property;

    // if (args.property.readOnly === true || (args.property.readOnly === undefined && args.options.immutable) || OmniUtil.isNull(args.property.type)) {
    //   field.modifiers.children.push(new Code.Modifier(Code.ModifierKind.FINAL));
    // }

    args.body.children.push(field);
    return field;
  }

  public static addInterfaceOf(
    objectType: OmniObjectType,
    root: CodeRootAstNode,
    options: PackageOptions & TargetOptions & CodeOptions,
    features: TargetFeatures,
  ): OmniInterfaceType {

    const objectDeclarations: Code.AbstractObjectDeclaration[] = [];

    const baseVisitor = root.createVisitor<OmniInterfaceType>();

    const result = VisitResultFlattener.flattenToSingle(root.visit(Visitor.create(baseVisitor, {
      visitInterfaceDeclaration: node => {
        const ot = node.type.omniType;
        if (ot.kind === OmniTypeKind.INTERFACE && ot.of === objectType) {
          return ot;
        } else {
          return undefined;
        }
      },
      visitObjectDeclaration: (node, visitor) => {
        if (node.type.omniType === objectType) {
          objectDeclarations.push(node);
        }
        return baseVisitor.visitObjectDeclaration(node, visitor);
      },
      visitMethodDeclaration: () => undefined,
    })));

    if (!result) {

      const interfaceType: OmniInterfaceType = {
        kind: OmniTypeKind.INTERFACE,
        of: objectType,
        debug: `Created from composition member transformer because ${OmniUtil.describe(objectType)} used as interface`,
      };

      const nameResolver = root.getNameResolver();
      const name = nameResolver.investigate({type: interfaceType, options: options});
      const interfaceName = nameResolver.build({name: name, with: NameParts.NAME, use: TypeUseKind.DECLARED});
      const packageName = nameResolver.build({name: name, with: NameParts.NAMESPACE});

      const interfaceDeclaration = CodeAstUtils.createInterfaceWithBody(root, interfaceType, options, features, () => interfaceName);

      root.children.push(new Code.CompilationUnit(
        new Code.PackageDeclaration(packageName),
        new Code.ImportList(),
        interfaceDeclaration,
      ));

      for (const ast of objectDeclarations) {
        if (!ast.implements) {
          ast.implements = new Code.ImplementsDeclaration(new Code.TypeList<OmniInterfaceOrObjectType>());
        }

        ast.implements.types.children.push(root.getAstUtils().createTypeNode(interfaceType));
      }

      return interfaceType;
    } else if (Array.isArray(result)) {

      if (result.length != 1) {
        throw new Error(`There were more than one (${result.length}) interfaces found for '${OmniUtil.describe(objectType)}'`);
      }

      return result[0];
    } else {
      return result;
    }
  }

  public static getFieldPropertyNameIdentifier(field: Code.Field): Code.Identifier {

    if (field.property) {

      const accessorName = OmniUtil.getPropertyAccessorName(field.property.name);
      if (accessorName) {
        const original = field.identifier.original ?? field.identifier.value;
        if (accessorName === original) {
          return new Code.Identifier(accessorName);
        }
        return new Code.Identifier(accessorName, original);
      }
    }

    return field.identifier;
  }

  public static getTypeToClassDecMap(root: Code.CodeRootAstNode) {

    const defaultVisitor = root.createVisitor();
    const typeToDec = new Map<OmniType, Code.ClassDeclaration>();
    root.visit(Visitor.create(defaultVisitor, {
      visitEnumDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
      visitMethodDeclaration: () => {
      },

      visitClassDeclaration: (n, visitor) => {
        typeToDec.set(n.type.omniType, n);
        defaultVisitor.visitClassDeclaration(n, visitor);
      },
    }));

    return typeToDec;
  }

  public static getSuperClassDeclarations(typeToDec: Map<OmniType, Code.ClassDeclaration>, extDec: Code.ExtendsDeclaration): Code.ClassDeclaration[] {

    return extDec.types.children.map(it => {
      const unwrapped = OmniUtil.getTopLevelType(it.omniType);
      const mapped = typeToDec.get(unwrapped);
      if (mapped) {
        logger.silent(`Found ${OmniUtil.describe(unwrapped)} -> ${mapped}`);
        return mapped;
      } else {
        return undefined;
      }

    }).filter(isDefined) ?? [];
  }

  public static getSuperFields(root: Code.CodeRootAstNode, classDeclarations: Code.ClassDeclaration[], subField: Code.Field): Code.Field[] {

    const subFieldName = subField.identifier.original ?? subField.identifier.value;
    return classDeclarations.map(it => CodeAstUtils.getField(root, it, subFieldName)).filter(isDefined);
  }

  public static getField(root: Code.CodeRootAstNode, node: Code.AbstractCodeNode, name: string): Code.Field | undefined {

    const defaultVisitor = root.createVisitor();
    return Visitor.single(Visitor.create(defaultVisitor, {
      visitMethodDeclaration: () => {
      },
      visitField: n => {
        if (n.identifier.original === name || n.identifier.value === name) {
          throw new AbortVisitingWithResult(n);
        }
      },
    }), node, undefined);

    // return classDeclarations.map(it => {
    //   const otherField =
    //
    //   return (otherField != subField) ? otherField : undefined;
    // }).filter(isDefined);
  }
}
