import * as Java from '@java/cst/types';
import {JavaCstVisitor} from '@java';
import {CompilationUnitCallback} from '@cst/CompilationUnitCallback';
import {ICstVisitor, VisitResult} from '@visit';
import {IRenderer} from '@render';
import {ICstNode} from '@cst';
import {IJavaCstVisitor, JavaVisitFn} from '@java/visit/IJavaCstVisitor';
import {JavaVisitor} from '@java/visit/JavaVisitor';

type JavaRendererVisitFn<N extends ICstNode> = JavaVisitFn<N, string>; 

export class JavaRenderer extends JavaVisitor<string> implements IRenderer {
  private blockDepth = 0;
  private readonly pattern_lineStart = new RegExp(/(?<!$)^/mg);
  private tokenPrefix = ' ';
  private tokenSuffix = ' ';

  private readonly cuCallback: CompilationUnitCallback;

  constructor(callback: CompilationUnitCallback) {
    super();
    this.cuCallback = callback;
  }

  private static getTypeName(type: Java.Type): string {
    return type.fqn;
  }

  private getIndentation(d: number = this.blockDepth): string {
    return '  '.repeat(d);
  }

  public render<N extends ICstNode, V extends ICstVisitor<string>>(node: N | undefined, visitor?: V): string {
    if (node === undefined) {
      return '';
    }

    return this.join(node.visit(visitor || this));
  }

  join(result: VisitResult<string>): string {
    if (Array.isArray(result)) {
      return result.map(it => this.join(it)).join('');
    } else {
      if (typeof result == 'string') {
        return result;
      } else {
        return '';
      }
    }
  }

  private static getModifierString(type: Java.ModifierType): 'public' | 'private' | 'protected' | 'final' | 'static' | '' {
    switch (type) {
      case Java.ModifierType.PUBLIC:
        return 'public';
      case Java.ModifierType.PRIVATE:
        return 'private';
      case Java.ModifierType.DEFAULT:
        return '';
      case Java.ModifierType.PROTECTED:
        return 'protected';
      case Java.ModifierType.FINAL:
        return 'final';
      case Java.ModifierType.STATIC:
        return 'static';
    }
  }

  visitFieldReference: JavaRendererVisitFn<Java.FieldReference> = (node, visitor) => {
    return (`this.${this.render(node.field.identifier, visitor)}`);
  }

  visitReturnStatement: JavaRendererVisitFn<Java.ReturnStatement> = (node, visitor) => {
    return (`return ${this.render(node.expression, visitor)};`);
  }

  visitToken: JavaRendererVisitFn<Java.JavaToken> = (node, visitor) => {
    return (`${this.tokenPrefix}${JavaRenderer.getTokenTypeString(node.type)}${this.tokenSuffix}`);
  }

  private static getTokenTypeString(type: Java.TokenType): '=' | '==' | '+' | '-' | '*' | ',' {
    switch (type) {
      case Java.TokenType.ASSIGN:
        return '=';
      case Java.TokenType.EQUALS:
        return '==';
      case Java.TokenType.ADD:
        return '+';
      case Java.TokenType.SUBTRACT:
        return '-';
      case Java.TokenType.MULTIPLY:
        return '*';
      case Java.TokenType.COMMA:
        return ',';
      default:
        throw new Error('Unknown token type');
    }
  }

  visitConstructor: JavaRendererVisitFn<Java.ConstructorDeclaration> = (node, visitor) => {
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)}\n` : '';
    const body = node.body ? `\n${this.render(node.body, visitor)}` : '';

    return `\n${annotations}${this.render(node.modifiers, visitor)} ${this.render(node.owner.name, visitor)}(${this.render(node.parameters, visitor)}) {${body}}\n\n`;
  }

  visitBlock: JavaRendererVisitFn<Java.Block> = (node, visitor) => {
    this.blockDepth++;
    const indentation = this.getIndentation(1);
    const blockContent = this.join(node.children.map(it => it.visit(visitor)));
    this.blockDepth--;

    return blockContent.replace(this.pattern_lineStart, indentation);
  }

  visitCommonTypeDeclaration(visitor: IJavaCstVisitor<string>, node: Java.AbstractObjectDeclaration, typeType: string): VisitResult<string> {

    const modifiers = this.render(node.modifiers, visitor);
    const name = this.render(node.name, visitor);
    const classExtension = node.extends ? ` extends ${this.render(node.extends, visitor)}` : '';
    const classImplementations = node.implements ? ` implements ${this.render(node.implements, visitor)}` : '';

    let typeDeclarationContent = '';
    typeDeclarationContent += (node.comments ? `${this.render(node.comments, visitor)}\n` : '');
    typeDeclarationContent += (node.annotations ? `${this.render(node.annotations, visitor)}\n` : '');
    typeDeclarationContent += (`${modifiers} ${typeType} ${name}${classExtension}${classImplementations} {\n`);
    typeDeclarationContent += (this.render(node.body, visitor));
    typeDeclarationContent += ('}\n');

    return typeDeclarationContent;
  }

  visitCommentList: JavaRendererVisitFn<Java.CommentList> = (node, visitor) => {
    const commentSections = node.children.map(it => this.render(it, visitor));
    return `/**\n * ${commentSections.join('\n *\n * ')}\n */`;
  }

  visitComment: JavaRendererVisitFn<Java.Comment> = (node, visitor) => {
    const lines = node.text.replace('\r', '').split('\n');
    return `${lines.join('\n * ')}`;
  }

  visitCompilationUnit: JavaRendererVisitFn<Java.CompilationUnit> = (node, visitor) => {

    const content = this.join([
      node.packageDeclaration.visit(visitor),
      node.imports.visit(visitor),
      node.object.visit(visitor),
    ]);

    // This was a top-level class/interface, so we will output it as a compilation unit.
    this.cuCallback({
      content: content,
      name: node.object.name.value,
      fileName: `${node.object.name.value}.java`
    });

    return content;
  }

  visitPackage: JavaRendererVisitFn<Java.PackageDeclaration> = (node, visitor) => {
    return `package ${node.fqn};\n\n`;
  }

  visitImportList: JavaRendererVisitFn<Java.ImportList> = (node, visitor) => {
    return `${node.children.map(it => this.render(it, visitor)).join('\n')}\n`;
  }

  visitImportStatement: JavaRendererVisitFn<Java.ImportStatement> = (node, visitor) => {
    return `import ${this.render(node.type, visitor)};\n`;
  }

  visitImplementsDeclaration: JavaRendererVisitFn<Java.ImplementsDeclaration> = (node, visitor) => {
    return (node.types.children.map(it => this.render(it, visitor)).join(', '));
  }

  visitClassDeclaration: JavaRendererVisitFn<Java.ClassDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'class');
  }

  visitInterfaceDeclaration: JavaRendererVisitFn<Java.InterfaceDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'interface');
  }

  visitEnumDeclaration: JavaRendererVisitFn<Java.EnumDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'enum');
  }

  visitEnumItem: JavaRendererVisitFn<Java.EnumItem> = (node, visitor) => {
    const key = this.render(node.identifier, visitor);
    const value = this.render(node.value, visitor);
    return (`${key}(${value});\n`);
  }

  visitMethodDeclaration: JavaRendererVisitFn<Java.AbstractMethodDeclaration> = (node, visitor) => {
    const comments = node.comments ? `${this.render(node.comments, visitor)}\n` : '';
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)}\n` : '';
    const modifiers = this.render(node.modifiers, visitor);
    const type = this.render(node.type, visitor);
    const name = this.render(node.name, visitor);
    const parameters = node.parameters ? this.render(node.parameters, visitor) : '';
    const body = node.body ? this.render(node.body, visitor) : '';

    return [
      comments,
      annotations,
      `${modifiers} ${type} ${name}(${parameters}) {\n`,
      body,
      '\n}\n',
    ];
  }

  visitMethodCall: JavaRendererVisitFn<Java.MethodCall> = (node, visitor) => {
    return `${this.render(node.target, visitor)}.${this.render(node.methodName, visitor)}(${this.render(node.methodArguments, visitor)})`;
  }

  visitStatement: JavaRendererVisitFn<Java.Statement> = (node, visitor) => {
    return [
      node.child.visit(this),
      ';\n',
    ];
  }

  visitAnnotationList: JavaRendererVisitFn<Java.AnnotationList> = (node, visitor) => {
    return (node.children.map(it => this.render(it, visitor)).join('\n'));
  }

  visitAnnotation: JavaRendererVisitFn<Java.Annotation> = (node, visitor) => {
    const pairs = node.pairs ? `(${this.render(node.pairs, visitor)})` : '';
    return (`@${this.render(node.type, visitor)}${pairs}`);
  }

  visitAnnotationKeyValuePairList: JavaRendererVisitFn<Java.AnnotationKeyValuePairList> = (node, visitor) => {
    return (node.children.map(it => this.render(it, visitor)).join(', '));
  }

  visitAnnotationKeyValuePair: JavaRendererVisitFn<Java.AnnotationKeyValuePair> = (node, visitor) => {
    const key = node.key ? `${this.render(node.key, visitor)} = ` : '';
    return (`${key}${this.render(node.value, visitor)}`);
  }

  visitLiteral: JavaRendererVisitFn<Java.Literal> = (node, visitor) => {
    if (typeof node.value === 'string') {
      return (`"${node.value}"`);
    } else if (typeof node.value == 'boolean') {
      return (`${node.value ? 'true' : 'false'}`);
    } else if (node.value === null) {
      return (`null`);
    } else {
      return (`${node.value}`);
    }
  }

  visitFieldGetterSetter: JavaRendererVisitFn<Java.FieldGetterSetter> = (node, visitor) => {
    const content = this.join([
      node.field.visit(visitor),
      node.getter.visit(visitor),
      node.setter.visit(visitor),
    ]);

    return `${content}\n`;
  }

  visitField: JavaRendererVisitFn<Java.Field> = (node, visitor) => {
    const comments = node.comments ? `${this.render(node.comments, visitor)}\n` : '';
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)}\n` : '';
    const modifiers = this.render(node.modifiers, visitor);
    const typeName = this.render(node.type, visitor);
    const initializer = node.initializer ? ` = ${this.render(node.initializer, visitor)}` : '';
    const identifier = this.render(node.identifier, visitor);

    return [
      comments,
      annotations,
      `${modifiers} ${typeName} ${identifier}${initializer};\n`,
    ];
  }

  visitNewStatement: JavaRendererVisitFn<Java.NewStatement> = (node, visitor) => {
    const parameters = node.constructorArguments ? this.render(node.constructorArguments, visitor) : '';
    return `new ${this.render(node.type, visitor)}(${parameters})`;
  }

  visitIdentifier: JavaRendererVisitFn<Java.Identifier> = (node, visitor) => {
    return node.value;
  }

  visitArgumentDeclaration: JavaRendererVisitFn<Java.ArgumentDeclaration> = (node, visitor) => {
    // TODO: Make this simpler by allowing to "visit" between things,
    //  so we can insert spaces or delimiters without tinkering inside the base visitor
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)} ` : '';
    const type = this.render(node.type, visitor);
    const identifier = this.render(node.identifier, visitor);

    return `${annotations}${type} ${identifier}`;
  }

  visitAssignExpression: JavaRendererVisitFn<Java.AssignExpression> = (node, visitor) => {
    // TODO: This is wrong. Need to find a better way!
    // TODO: This should make use of the "statement" to make it add the semi-colon. DO NOT DO IT HERE. FIX!
    return [
      this.visitBinaryExpression(node, visitor),
      ';\n',
    ];
  }

  visitArgumentDeclarationList: JavaRendererVisitFn<Java.ArgumentDeclarationList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(', ');
  }

  visitArgumentList: JavaRendererVisitFn<Java.ArgumentList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(', ');
  }

  visitTypeList: JavaRendererVisitFn<Java.TypeList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(' ');
  }

  visitType: JavaRendererVisitFn<Java.Type> = (node, visitor) => {
    return JavaRenderer.getTypeName(node);
  }

  visitModifierList: JavaRendererVisitFn<Java.ModifierList> = (node, visitor) => {
    return node.modifiers.map(it => this.render(it, visitor)).join(' ');
  }

  visitModifier: JavaRendererVisitFn<Java.Modifier> = (node, visitor) => {
    const modifierString = JavaRenderer.getModifierString(node.type);
    if (modifierString) {
      return modifierString;
    }

    return undefined;
  }

  visitSuperCall: JavaRendererVisitFn<Java.SuperCall> = (node, visitor) => {

    return `super(${this.render(node.parameters, visitor)})`;
  }

  // visitAdditionalPropertiesDeclaration: VisitFn<Java.AdditionalPropertiesDeclaration, string, this> = (node, visitor) => {
  //   return node.children.map(it => it.visit(this));
  //
  //   // TODO: Render it somehow. What is the best way to keep it modular and modifiable by others?
  //   return `// TODO: This is where the additionalProperties code should go\n`;
  // }
}
