import {
  AstNode,
  AstTargetFunctions,
  AstVisitor,
  NodeResolveCtx,
  OmniArrayType,
  OmniGenericTargetType,
  OmniInterfaceOrObjectType,
  OmniInterfaceType,
  OmniObjectType,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  Reference,
  RootAstNode,
  TypeNode,
  UnknownKind,
} from '@omnigen/core';
import {JavaUtil} from '../util';
import * as Java from '../ast';
import {Block, Field, JavaAstRootNode, ModifierList, ModifierType} from '../ast';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, OmniUtil, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import {JavaOptions} from '../options';
import {createJavaVisitor} from '../visit';
import {JavaAndTargetOptions} from './AbstractJavaAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

export class JavaAstUtils implements AstTargetFunctions {

  public static addInterfaceProperties(root: RootAstNode, type: OmniInterfaceOrObjectType, body: Java.Block): void {

    const interfaceLikeTarget = (type.kind == OmniTypeKind.INTERFACE) ? type.of : type;

    // Transform the object, but add no fields and only add the abstract method declaration (signature only)
    for (const property of OmniUtil.getPropertiesOf(interfaceLikeTarget)) {

      const accessorName = OmniUtil.getPropertyAccessorName(property.name);
      if (!accessorName) {
        continue;
      }

      body.children.push(
        new Java.AbstractMethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier(JavaUtil.getGetterName(accessorName, property.type)),
            root.getAstUtils().createTypeNode(property.type, false),
            undefined,
            new ModifierList(),
          ),
        ),
      );
    }
  }

  public createTypeNode<const T extends OmniType>(type: T, implementation?: boolean): TypeNode {

    if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return this.createArrayTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.upperBound) {
        return new Java.BoundedType(type, new Java.WildcardType(type, implementation), this.createTypeNode(type.upperBound, implementation));
      } else {
        return new Java.WildcardType(type, implementation);
      }
    } else if (type.kind == OmniTypeKind.DECORATING) {
      const of = this.createTypeNode(type.of, implementation);
      return new Java.DecoratingTypeNode(of, type);
    }

    return new Java.EdgeType(type, implementation);
  }

  private createArrayTypeNode<const T extends OmniArrayType>(
    type: T,
    implementation: boolean | undefined,
  ): TypeNode<T> {

    const itemNode = this.createTypeNode(type.of);
    return new Java.ArrayType(type, itemNode, implementation);
  }

  private createGenericTargetTypeNode<const T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): TypeNode<T> {

    const baseType = new Java.EdgeType(type, implementation);

    // NOTE: In future versions of Java it might be possible to have primitive generic arguments.
    //        But for now we change all the primitive types into a reference type.
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => {

      let referenceType = OmniUtil.toReferenceType(it.type);
      if (referenceType.kind == OmniTypeKind.UNKNOWN && (!referenceType.unknownKind || referenceType.unknownKind == UnknownKind.OBJECT)) {

        // No set unknown type and Object, are probably better off as wildcard type ?
        referenceType = {
          ...referenceType,
          unknownKind: UnknownKind.WILDCARD,
        };
      }

      return this.createTypeNode(referenceType);
    });

    return new Java.GenericType(type, baseType, mappedGenericTargetArguments);
  }

  public static addOmniPropertyToBlockAsField(args: {
    root: RootAstNode,
    property: OmniProperty,
    body: Block,
    options: JavaOptions,
    modifiers?: ModifierType[],
  }): void {

    if (OmniUtil.isNull(args.property.type) && !args.options.includeAlwaysNullProperties) {
      return;
    }

    if (args.property.abstract) {

      // If the property is abstract, then we should not be adding a field for it.
      // Instead it will be added by another transformer that deals with the getters and setters.
      return;
    }

    const fieldType = args.root.getAstUtils().createTypeNode(args.property.type);
    let originalName = OmniUtil.getPropertyName(args.property.name);
    if (!originalName) {
      if (OmniUtil.isPatternPropertyName(args.property.name)) {

        // The field's property does not have a name per se.
        // But the field needs a name until it can be replaced by something better at later stages.
        // So we set a (hopefully) temporary field name, which likely will not compile since it contains the regex.
        originalName = `additionalProperties=${OmniUtil.getPropertyName(args.property.name, true)}`;

      } else {
        return;
      }
    }

    const fieldName = OmniUtil.getPropertyFieldNameOnly(args.property.name) || Case.camel(originalName);

    const fieldIdentifier = new Java.Identifier(fieldName, originalName);

    const field = new Java.Field(
      fieldType,
      fieldIdentifier,
      new Java.ModifierList(
        ...(args.modifiers ?? [Java.ModifierType.PRIVATE]).map(m => new Java.Modifier(m)),
      ),
    );

    if (OmniUtil.isPrimitive(args.property.type)) {
      if (args.property.type.kind == OmniTypeKind.NULL) {
        field.initializer = new Java.Literal(args.property.type.value ?? null, args.property.type.kind);
      } else if (args.property.type.value !== undefined) {
        if (args.options.immutableModels && !args.property.type.literal) {

          // If the model is immutable and the value given is just a default,
          // then it will have to be given through the constructor in the constructor transformer.

        } else {

          field.initializer = new Java.Literal(args.property.type.value, args.property.type.kind);
        }
      }
    }

    field.property = args.property;

    if (args.options.immutableModels || OmniUtil.isNull(args.property.type)) {
      field.modifiers.children.push(new Java.Modifier(Java.ModifierType.FINAL));
    }

    args.body.children.push(field);
  }

  public static addInterfaceOf(objectType: OmniObjectType, root: JavaAstRootNode, options: JavaAndTargetOptions): OmniInterfaceType {

    // TODO: Interface should be an actual interface :)
    // TODO: Need to add a step that adds any missing types -- unsure how that is best done, or if it should be done manually at every location things are changed'
    // TODO: Find or create default way of translating object to interface
    // TODO: Check if one already exists, and if it does then use the existing one!
    // TODO: Possible to add way to easily visit all nodes but only care about some visitor functions? How?

    const astClassDeclarations: Java.AbstractObjectDeclaration[] = [];

    const baseVisitor = createJavaVisitor<OmniInterfaceType>();
    const javaVisitor = createJavaVisitor<OmniInterfaceType>({
      visitInterfaceDeclaration: node => {
        const ot = node.type.omniType;
        if (ot.kind == OmniTypeKind.INTERFACE && ot.of == objectType) {
          return ot;
        } else {
          return undefined;
        }
      },
      visitObjectDeclaration: (node, visitor) => {

        if (node.type.omniType == objectType) {
          astClassDeclarations.push(node);
        }

        return baseVisitor.visitObjectDeclaration(node, visitor);
      },
      visitMethodDeclaration: () => undefined,
    });

    const result = VisitResultFlattener.flattenToSingle(root.visit(javaVisitor));
    if (!result) {

      const interfaceType: OmniInterfaceType = {
        kind: OmniTypeKind.INTERFACE,
        of: objectType,
        debug: `Created from composition member transformer because ${OmniUtil.describe(objectType)} used as interface`,
      };

      const interfaceDeclaration = this.createInterfaceWithBody(root, interfaceType, options);

      root.children.push(new Java.CompilationUnit(
        new Java.PackageDeclaration(JavaUtil.getPackageName(interfaceType, interfaceDeclaration.name.value, options)),
        new Java.ImportList(
          [],
        ),
        interfaceDeclaration,
      ));

      for (const ast of astClassDeclarations) {
        if (!ast.implements) {
          ast.implements = new Java.ImplementsDeclaration(new Java.TypeList<OmniInterfaceOrObjectType>([]));
        }

        ast.implements.types.children.push(root.getAstUtils().createTypeNode(interfaceType));
      }

      return interfaceType;
    } else if (Array.isArray(result)) {

      if (result.length != 1) {
        throw new Error(`There were non-one (${result.length}) interfaces found for '${OmniUtil.describe(objectType)}'`);
      }

      return result[0];
    } else {
      return result;
    }
  }

  public static createInterfaceWithBody(root: RootAstNode, type: OmniInterfaceType, options: JavaAndTargetOptions) {

    const declaration = new Java.InterfaceDeclaration(
      root.getAstUtils().createTypeNode(type),
      new Java.Identifier(`${JavaUtil.getClassName(type, options)}`),
      new Java.Block(),
    );

    JavaAstUtils.addInterfaceProperties(root, type, declaration.body);

    return declaration;
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

  public static getConstructorRequirements(
    root: JavaAstRootNode,
    node: Java.AbstractObjectDeclaration,
    followSupertype = false,
  ): { fields: Java.Field[], parameters: Java.ConstructorParameter[] } {

    const constructors: Java.ConstructorDeclaration[] = [];
    const fields: Java.Field[] = [];
    const setters: Java.FieldBackedSetter[] = [];

    const voidVisitor = root.createVisitor<void>();
    const fieldVisitor: typeof voidVisitor = {
      ...voidVisitor,
      visitConstructor: n => {
        constructors.push(n);
      },
      visitObjectDeclaration: () => {
        // Do not go into any nested objects.
      },
      visitField: n => {
        fields.push(n);
      },
      visitFieldBackedSetter: n => {
        setters.push(n);
      },
    };

    node.body.visit(fieldVisitor);

    if (constructors.length > 0) {

      // This class already has a constructor, so we will trust that it is correct.
      // NOTE: In this future this could be improved into modifying the existing constructor as-needed.
      return {fields: [], parameters: []};
    }

    const fieldsWithSetters = setters.map(setter => root.resolveNodeRef(setter.fieldRef));
    const fieldsWithFinal = fields.filter(field => field.modifiers.children.some(m => m.type === Java.ModifierType.FINAL));
    const fieldsWithoutSetters = fields.filter(field => !fieldsWithSetters.includes(field));
    const fieldsWithoutInitializer = fieldsWithoutSetters.filter(field => field.initializer === undefined);

    const immediateRequired = fields.filter(field => {
      return fieldsWithoutInitializer.includes(field) && (fieldsWithSetters.includes(field) || fieldsWithFinal.includes(field));
    });

    if (followSupertype && node.extends) {

      const supertypeArguments: Java.ConstructorParameter[] = [];
      for (const extendChild of node.extends.types.children) {
        const extendedBy = JavaUtil.getClassDeclaration(root, extendChild.omniType);
        if (extendedBy) {

          let depth = 0;
          const defaultVisitor = root.createVisitor();
          extendedBy.visit(VisitorFactoryManager.create(defaultVisitor, {
            visitConstructor: n => {
              if (n.parameters) {
                supertypeArguments.push(...n.parameters.children);
              }
            },
            visitObjectDeclarationBody: (n, v) => {
              if (depth > 0) {
                // We only check one level of object declaration, or we will find nested ones.
                return;
              }

              try {
                depth++;
                defaultVisitor.visitObjectDeclarationBody(n, v);
              } finally {
                depth--;
              }
            },
          }));
        }
      }

      return {
        fields: immediateRequired,
        parameters: supertypeArguments,
      };

    } else {
      return {
        fields: immediateRequired,
        parameters: [],
      };
    }
  }

  public static getSoloReturn(method: Java.MethodDeclaration): AstNode | undefined {

    if (method.signature.parameters && method.signature.parameters.children.length > 0) {
      return undefined;
    }

    if (!method.body || method.body.children.length != 1) {
      return undefined;
    }

    const statement = JavaAstUtils.unwrap(method.body.children[0]);
    if (!(statement instanceof Java.ReturnStatement)) {
      return undefined;
    }

    return statement.expression;
  }

  public static getGetterFieldReference(root: RootAstNode, method: Java.MethodDeclaration): Reference<Field> | undefined {

    const fieldRef = JavaAstUtils.getSoloReturn(method);
    if (!(fieldRef instanceof Java.FieldReference)) {
      return undefined;
    }

    return fieldRef;
  }

  public static getGetterField(root: RootAstNode, method: Java.MethodDeclaration): Java.Field | undefined {

    const fieldId = JavaAstUtils.getGetterFieldReference(root, method);
    if (fieldId === undefined) {
      return undefined;
    }

    return root.resolveNodeRef<Java.Field>(fieldId);
  }

  public static getOmniType(node: AstNode): OmniType | undefined {

    if (node instanceof Java.AbstractObjectDeclaration) {
      return node.omniType;
    } else if ('omniType' in node && typeof node.omniType == 'object' && node.omniType && 'kind' in node.omniType) {

      // NOTE: This is quite ugly
      return node.omniType as OmniType;
    } else {
      return undefined;
    }
  }

  public static unwrap(node: AstNode): AstNode {

    if (node instanceof Java.Statement) {
      return node.child;
    }

    return node;
  }
}
