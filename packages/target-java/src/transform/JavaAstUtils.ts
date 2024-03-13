import {
  AstNode,
  OmniDictionaryType,
  OmniGenericTargetType,
  OmniInterfaceOrObjectType,
  OmniInterfaceType,
  OmniObjectType,
  OmniPrimitiveKind,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  UnknownKind,
} from '@omnigen/core';
import {JavaUtil} from '../util';
import * as Java from '../ast';
import {JavaAstRootNode} from '../ast';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, OmniUtil, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import {JavaOptions} from '../options';
import {createJavaVisitor, DefaultJavaVisitor, JavaVisitor} from '../visit';
import {JavaAndTargetOptions} from './AbstractJavaAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

export class JavaAstUtils {

  public static addInterfaceProperties(type: OmniInterfaceOrObjectType, body: Java.Block): void {

    const interfaceLikeTarget = (type.kind == OmniTypeKind.INTERFACE) ? type.of : type;

    // Transform the object, but add no fields and only add the abstract method declaration (signature only)
    for (const property of OmniUtil.getPropertiesOf(interfaceLikeTarget)) {
      body.children.push(
        new Java.AbstractMethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier(JavaUtil.getGetterName(property.propertyName || property.name, property.type)),
            JavaAstUtils.createTypeNode(property.type, false),
          ),
        ),
      );
    }
  }

  public static createTypeNode<T extends OmniType>(type: T, implementation?: boolean): Java.RegularType<T> | Java.GenericType | Java.WildcardType {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.lowerBound) {
        return new Java.WildcardType(type, JavaAstUtils.createTypeNode(type.lowerBound, implementation), implementation);
      } else {
        return new Java.WildcardType(type, undefined, implementation);
      }
    } else {
      return new Java.RegularType<T>(type, implementation);
    }
  }

  private static createGenericTargetTypeNode<T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const baseType = new Java.RegularType(type, implementation);

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

      return JavaAstUtils.createTypeNode(referenceType);
    });

    return new Java.GenericType(baseType, mappedGenericTargetArguments);
  }

  private static createMapTypeNode(
    type: OmniDictionaryType,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const mapClassOrInterface = implementation == false ? 'Map' : 'HashMap';
    const mapClass = `java.util.${mapClassOrInterface}`;
    const mapType = new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
    const keyType = JavaAstUtils.createTypeNode(type.keyType, true);
    const valueType = JavaAstUtils.createTypeNode(type.valueType, true);

    return new Java.GenericType(mapType, [keyType, valueType]);
  }

  public static addOmniPropertyToBlockAsField(body: Java.Block, property: OmniProperty, options: JavaOptions): void {

    if (OmniUtil.isNull(property.type) && !options.includeAlwaysNullProperties) {
      return;
    }

    if (property.abstract) {

      // If the property is abstract, then we should not be adding a field for it.
      // Instead it will be added by another transformer that deals with the getters and setters.
      return;
    }

    const fieldType = JavaAstUtils.createTypeNode(property.type);
    const fieldIdentifier = new Java.Identifier(property.fieldName || Case.camel(property.name), property.name);

    const field = new Java.Field(
      fieldType,
      fieldIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
      ),
    );

    if (property.type.kind == OmniTypeKind.PRIMITIVE) {
      if (property.type.primitiveKind == OmniPrimitiveKind.NULL) {
        field.initializer = new Java.Literal(property.type.value ?? null, property.type.primitiveKind);
      } else if (property.type.value !== undefined) {
        if (options.immutableModels && !property.type.literal) {

          // If the model is immutable and the value given is just a default,
          // then it will have to be given through the constructor in the constructor transformer.

        } else {

          field.initializer = new Java.Literal(property.type.value, property.type.primitiveKind);
        }
      }
    }

    field.property = property;

    if (options.immutableModels || OmniUtil.isNull(property.type)) {
      field.modifiers.children.push(new Java.Modifier(Java.ModifierType.FINAL));
    }

    body.children.push(field);
  }

  public static addInterfaceOf(objectType: OmniObjectType, root: JavaAstRootNode, options: JavaAndTargetOptions): OmniInterfaceType {

    // TODO: Interface should be an actual interface :)
    // TODO: Need to add a step that adds any missing types -- unsure how that is best done, or if it should be done manually at every location things are changed'
    // TODO: Find or create default way of translating object to interface
    // TODO: Check if one already exists, and if it does then use the existing one!
    // TODO: Possible to add way to easily visit all nodes but only care about some visitor functions? How?

    const astClassDeclarations: Java.ClassDeclaration[] = [];

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

      const interfaceDeclaration = JavaAstUtils.createInterfaceWithBody(interfaceType, options);

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

        ast.implements.types.children.push(JavaAstUtils.createTypeNode(interfaceType));
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

  public static createInterfaceWithBody(type: OmniInterfaceType, options: JavaAndTargetOptions) {

    const declaration = new Java.InterfaceDeclaration(
      JavaAstUtils.createTypeNode(type),
      new Java.Identifier(`${JavaUtil.getClassName(type, options)}`),
      new Java.Block(),
    );

    JavaAstUtils.addInterfaceProperties(type, declaration.body);

    return declaration;
  }

  public static getConstructorRequirements(
    root: AstNode,
    node: Java.AbstractObjectDeclaration,
    followSupertype = false,
  ): [Java.Field[], Java.ConstructorParameter[]] {

    const constructors: Java.ConstructorDeclaration[] = [];
    const fields: Java.Field[] = [];
    const setters: Java.FieldBackedSetter[] = [];

    const fieldVisitor: JavaVisitor<void> = {
      ...DefaultJavaVisitor,
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
      return [[], []];
    }

    const fieldsWithSetters = setters.map(setter => setter.field);
    const fieldsWithFinal = fields.filter(field => field.modifiers.children.some(m => m.type == Java.ModifierType.FINAL));
    const fieldsWithoutSetters = fields.filter(field => !fieldsWithSetters.includes(field));
    const fieldsWithoutInitializer = fieldsWithoutSetters.filter(field => field.initializer == undefined);

    const immediateRequired = fields.filter(field => {

      if (fieldsWithSetters.includes(field) && fieldsWithoutInitializer.includes(field)) {
        return true;
      }

      if (fieldsWithFinal.includes(field) && fieldsWithoutInitializer.includes(field)) {
        return true;
      }

      return false;
    });

    if (followSupertype && node.extends) {

      const supertypeArguments: Java.ConstructorParameter[] = [];
      const extendedBy = JavaUtil.getClassDeclaration(root, node.extends.type.omniType);
      if (extendedBy) {

        const constructorVisitor = VisitorFactoryManager.create(DefaultJavaVisitor, {
          visitConstructor: node => {
            if (node.parameters) {
              supertypeArguments.push(...node.parameters.children);
            }
          },
        });

        extendedBy.visit(constructorVisitor);
      }

      return [
        immediateRequired,
        supertypeArguments,
      ];

    } else {
      return [
        immediateRequired,
        [],
      ];
    }
  }

  public static getGetterField(method: Java.MethodDeclaration): Java.Field | undefined {

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

    if (statement.expression instanceof Java.FieldReference) {
      if (method.signature.type == statement.expression.field.type) {
        return statement.expression.field;
      }
    }

    return undefined;
  }

  public static unwrap(node: AstNode): AstNode {

    if (node instanceof Java.Statement) {
      return node.child;
    }

    return node;
  }
}
