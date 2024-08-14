import {AstNode, NameParts, OmniInterfaceOrObjectType, OmniInterfaceType, OmniObjectType, OmniProperty, OmniType, Reference, RootAstNode} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {JavaOptions} from '../options';
import {JavaAndTargetOptions} from './AbstractJavaAstTransformer';
import {CodeAstUtils} from '@omnigen/target-code';
import * as Java from '../ast/JavaAst';

const logger = LoggerFactory.create(import.meta.url);

export class JavaAstUtils extends CodeAstUtils {

  public static addInterfaceProperties(root: RootAstNode, type: OmniInterfaceOrObjectType, body: Java.Block): void {
    return CodeAstUtils.addInterfaceProperties(root, type, body);
  }

  public static addOmniPropertyToBlockAsField(args: {
    root: RootAstNode,
    property: OmniProperty,
    body: Java.Block,
    options: JavaOptions,
    modifiers?: Java.ModifierKind[],
  }): void {
    return CodeAstUtils.addOmniPropertyToBlockAsField(args);

    // if (OmniUtil.isNull(args.property.type) && !args.options.includeAlwaysNullProperties) {
    //   return;
    // }
    //
    // if (args.property.abstract) {
    //
    //   // If the property is abstract, then we should not be adding a field for it.
    //   // Instead it will be added by another transformer that deals with the getters and setters.
    //   return;
    // }
    //
    // const fieldType = args.root.getAstUtils().createTypeNode(args.property.type);
    // let originalName: TypeName | undefined = OmniUtil.getPropertyName(args.property.name);
    // if (!originalName) {
    //   if (OmniUtil.isPatternPropertyName(args.property.name)) {
    //
    //     // The field's property does not have a name per se.
    //     // But the field needs a name until it can be replaced by something better at later stages.
    //     // If the target supports several index accessors, there might be several of these.
    //     // But if the target only supports a regular map or similar, then this will likely be the only one.
    //     originalName = `additionalProperties`;
    //
    //   } else {
    //     return;
    //   }
    // }
    //
    // const fieldName = OmniUtil.getPropertyFieldNameOnly(args.property.name) || Case.camel(originalName);
    //
    // const fieldIdentifier = new Java.Identifier(fieldName, originalName);
    //
    // const field = new Java.Field(
    //   fieldType,
    //   fieldIdentifier,
    //   new Java.ModifierList(
    //     ...(args.modifiers ?? [Java.ModifierKind.PRIVATE]).map(m => new Java.Modifier(m)),
    //   ),
    // );
    //
    // if (OmniUtil.isPrimitive(args.property.type)) {
    //   if (args.property.type.kind == OmniTypeKind.NULL) {
    //     field.initializer = new Java.Literal(args.property.type.value ?? null, args.property.type.kind);
    //   } else if (args.property.type.value !== undefined) {
    //     if (args.options.immutable && !args.property.type.literal) {
    //
    //       // If the model is immutable and the value given is just a default,
    //       // then it will have to be given through the constructor in the constructor transformer.
    //
    //     } else {
    //
    //       field.initializer = new Java.Literal(args.property.type.value, args.property.type.kind);
    //     }
    //   }
    // }
    //
    // field.property = args.property;
    //
    // if (args.property.readOnly === true || (args.property.readOnly === undefined && args.options.immutable) || OmniUtil.isNull(args.property.type)) {
    //   field.modifiers.children.push(new Code.Modifier(Code.ModifierKind.FINAL));
    // }
    //
    // args.body.children.push(field);
  }

  public static addInterfaceOf(objectType: OmniObjectType, root: Java.JavaAstRootNode, options: JavaAndTargetOptions): OmniInterfaceType {
    return CodeAstUtils.addInterfaceOf(objectType, root, options);
  }

  public static createInterfaceWithBody(root: RootAstNode, type: OmniInterfaceType, options: JavaAndTargetOptions) {

    return CodeAstUtils.createInterfaceWithBody(root, type, options, () => {
      const nameResolver = root.getNameResolver();
      const resolved = nameResolver.investigate({type: type, options: options});
      return nameResolver.build({name: resolved, with: NameParts.NAME});
    });
  }

  public static getGetterFieldReference(root: RootAstNode, method: Java.MethodDeclaration): Reference<Java.Field> | undefined {
    return CodeAstUtils.getGetterFieldReference(root, method);
  }

  public static getGetterField(root: RootAstNode, method: Java.MethodDeclaration): Java.Field | undefined {
    return CodeAstUtils.getGetterField(root, method);
  }

  public static getOmniType(root: RootAstNode, node: AstNode): OmniType | undefined {
    return CodeAstUtils.getOmniType(root, node);
  }

  public static unwrap(node: AstNode): AstNode {
    return CodeAstUtils.unwrap(node);
  }
}
