import {AstNode, NameParts, OmniInterfaceOrObjectType, OmniInterfaceType, OmniObjectType, OmniProperty, OmniType, Reference, RootAstNode} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {JavaOptions} from '../options';
import {JavaAndTargetOptions} from './AbstractJavaAstTransformer';
import {CodeAstUtils} from '@omnigen/target-code';
import * as Java from '../ast/JavaAst';
import * as Code from '@omnigen/target-code/ast';

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
  }): Code.Field | undefined {
    return CodeAstUtils.addOmniPropertyToBlockAsField(args);
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
