import {
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
import {JavaUtil} from '../util/index.ts';
import * as Java from '../ast/index.ts';
import {JavaAstRootNode} from '../ast/index.ts';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, OmniUtil, VisitResultFlattener} from '@omnigen/core-util';
import {JavaOptions} from '../options';
import {createJavaVisitor} from '../visit';
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

  public static createTypeNode<T extends OmniType>(type: T, implementation?: boolean): Java.RegularType<T> | Java.GenericType {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
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
    field.annotations = JavaAstUtils.getGetterAnnotations(property);

    if (options.immutableModels || OmniUtil.isNull(property.type)) {
      field.modifiers.children.push(new Java.Modifier(Java.ModifierType.FINAL));
    }

    body.children.push(field);
  }

  private static getGetterAnnotations(property: OmniProperty): Java.AnnotationList | undefined {

    // TODO: Move this to another transformer which checks for differences between field name and original name.
    const getterAnnotations: Java.Annotation[] = [];
    if (property.fieldName || property.propertyName) {
      getterAnnotations.push(
        new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonProperty',
          }),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              undefined,
              new Java.Literal(property.name),
            ),
          ),
        ),
      );
    }

    return (getterAnnotations.length > 0)
      ? new Java.AnnotationList(...getterAnnotations)
      : undefined;
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
}
