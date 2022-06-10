import * as Java from '@java/cst/types';
import {JavaCstVisitor} from '@java';
import {CompilationUnitCallback} from '@cst/CompilationUnitCallback';
import {VisitResult} from '@visit';
import {IRenderer} from '@render';
import {ICstNode} from '@cst';
import {CompilationUnit} from '@java/cst/types';

export class JavaRenderer extends JavaCstVisitor<string> implements IRenderer {
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

  public render(node: ICstNode | undefined): string {
    if (node === undefined) {
      return '';
    }

    return this.join(node.visit<string>(this));
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

  visitFieldReference(node: Java.FieldReference): VisitResult<string> {
    return (`this.${this.render(node.field.identifier)}`);
  }

  visitReturnStatement(node: Java.ReturnStatement): VisitResult<string> {
    return (`return ${this.render(node.expression)};`);
  }

  visitToken(node: Java.JavaToken): VisitResult<string> {
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

  visitConstructor(node: Java.ConstructorDeclaration): VisitResult<string> {
    const annotations = node.annotations ? `${this.render(node.annotations)}\n` : '';
    const body = node.body ? `\n${this.render(node.body)}` : '';

    return `\n${annotations}${this.render(node.modifiers)} ${this.render(node.owner.name)}(${this.render(node.parameters)}) {${body}}\n\n`;
  }

  visitBlock(node: Java.Block): VisitResult<string> {
    this.blockDepth++;
    const indentation = this.getIndentation();
    const blockContent = this.join(super.visitBlock(node));
    this.blockDepth--;

    return blockContent.replace(this.pattern_lineStart, indentation);
  }

  visitCommonTypeDeclaration(node: Java.AbstractObjectDeclaration, typeType: string): VisitResult<string> {

    const modifiers = this.render(node.modifiers);
    const name = this.render(node.name);
    const classExtension = node.extends ? ` extends ${this.render(node.extends)}` : '';
    const classImplementations = node.implements ? ` implements ${this.render(node.implements)}` : '';

    let typeDeclarationContent = '';
    typeDeclarationContent += (node.comments ? `${this.render(node.comments)}\n` : '');
    typeDeclarationContent += (node.annotations ? `${this.render(node.annotations)}\n` : '');
    typeDeclarationContent += (`${modifiers} ${typeType} ${name}${classExtension}${classImplementations} {\n`);
    typeDeclarationContent += (this.render(node.body));
    typeDeclarationContent += ('}\n');

    return typeDeclarationContent;
  }

  visitCompilationUnit(node: CompilationUnit): VisitResult<string> {
    const content = this.join(super.visitCompilationUnit(node));

    // This was a top-level class/interface, so we will output it as a compilation unit.
    this.cuCallback({
      content: content,
      name: node.object.name.value,
      fileName: `${node.object.name.value}.java`
    });

    return content;
  }

  visitPackage(node: Java.PackageDeclaration): VisitResult<string> {
    return `package ${node.fqn};\n\n`;
  }

  visitImportList(node: Java.ImportList): VisitResult<string> {
    return `${node.children.map(it => this.render(it)).join('\n')}\n`;
  }

  visitImportStatement(node: Java.ImportStatement): VisitResult<string> {
    return `import ${this.render(node.type)};\n`;
  }

  visitImplementsDeclaration(node: Java.ImplementsDeclaration): VisitResult<string> {
    return (node.types.children.map(it => this.render(it)).join(', '));
  }

  visitExtendsDeclaration(node: Java.ExtendsDeclaration): VisitResult<string> {
    // return (node.type.children.map(it => this.render(it)).join(', '));
    return super.visitExtendsDeclaration(node);
  }

  visitClassDeclaration(node: Java.ClassDeclaration): VisitResult<string> {
    return this.visitCommonTypeDeclaration(node, 'class');
  }

  visitInterfaceDeclaration(node: Java.InterfaceDeclaration): VisitResult<string> {
    return this.visitCommonTypeDeclaration(node, 'interface');
  }

  visitEnumDeclaration(node: Java.EnumDeclaration): VisitResult<string> {
    return this.visitCommonTypeDeclaration(node, 'enum');
  }

  visitEnumItem(node: Java.EnumItem): VisitResult<string> {
    const key = this.render(node.identifier);
    const value = this.render(node.value);
    return (`${key}(${value});\n`);
  }

  visitMethodDeclaration(node: Java.AbstractMethodDeclaration): VisitResult<string> {
    const comments = node.comments ? `${this.render(node.comments)}\n` : '';
    const annotations = node.annotations ? `${this.render(node.annotations)}\n` : '';
    const modifiers = this.render(node.modifiers);
    const type = this.render(node.type);
    const name = this.render(node.name);
    const parameters = node.parameters ? this.render(node.parameters) : '';
    const body = node.body ? this.render(node.body) : '';

    return [
      comments,
      annotations,
      `${modifiers} ${type} ${name}(${parameters}) {\n`,
      body,
      '\n}\n',
    ];
  }

  visitAnnotationList(node: Java.AnnotationList): VisitResult<string> {
    return (node.children.map(it => this.render(it)).join('\n'));
  }

  visitAnnotation(node: Java.Annotation): VisitResult<string> {
    const pairs = node.pairs ? `(${this.render(node.pairs)})` : '';
    return (`@${this.render(node.type)}${pairs}`);
  }

  visitAnnotationKeyValuePairList(node: Java.AnnotationKeyValuePairList): VisitResult<string> {
    return (node.children.map(it => this.render(it)).join(', '));
  }

  visitAnnotationKeyValuePair(node: Java.AnnotationKeyValuePair): VisitResult<string> {
    const key = node.key ? `${this.render(node.key)} = ` : '';
    return (`${key}${this.render(node.value)}`);
  }

  visitLiteral(node: Java.Literal): VisitResult<string> {
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

  visitFieldGetterSetter(node: Java.FieldGetterSetter): VisitResult<string> {
    return `${this.join(super.visitFieldGetterSetter(node))}\n`;
  }

  visitField(node: Java.Field): VisitResult<string> {
    const comments = node.comments ? `${this.render(node.comments)}\n` : '';
    const annotations = node.annotations ? `${this.render(node.annotations)}\n` : '';
    const modifiers = this.render(node.modifiers);
    const typeName = this.render(node.type);
    const initializer = node.initializer ? ` = ${this.render(node.initializer)}` : '';
    const identifier = this.render(node.identifier);

    return [
      comments,
      annotations,
      `${modifiers} ${typeName} ${identifier}${initializer};\n`,
    ];
  }

  visitIdentifier(node: Java.Identifier): VisitResult<string> {
    return node.value;
  }

  visitArgumentDeclaration(node: Java.ArgumentDeclaration): VisitResult<string> {
    // TODO: Make this simpler by allowing to "visit" between things,
    //  so we can insert spaces or delimiters without tinkering inside the base visitor
    const annotations = node.annotations ? `${this.render(node.annotations)} ` : '';
    const type = this.render(node.type);
    const identifier = this.render(node.identifier);

    return `${annotations}${type} ${identifier}`;
  }

  visitBinaryExpression(node: Java.BinaryExpression): VisitResult<string> {
    return super.visitBinaryExpression(node);
  }

  visitAssignExpression(node: Java.AssignExpression): VisitResult<string> {
    // TODO: This is wrong. Need to find a better way!
    return [
      super.visitAssignExpression(node),
      ';\n',
    ];
  }

  visitArgumentDeclarationList(node: Java.ArgumentDeclarationList): VisitResult<string> {
    return node.children.map(it => this.render(it)).join(', ');
  }

  visitTypeList(node: Java.TypeList): VisitResult<string> {
    return node.children.map(it => this.render(it)).join(' ');
  }

  visitType(node: Java.Type): VisitResult<string> {
    return JavaRenderer.getTypeName(node);
  }

  visitModifierList(node: Java.ModifierList): VisitResult<string> {
    return node.modifiers.map(it => this.render(it)).join(' ');
  }

  visitModifier(node: Java.Modifier): VisitResult<string> {
    const modifierString = JavaRenderer.getModifierString(node.type);
    if (modifierString) {
      return modifierString;
    }
  }

  visitAdditionalPropertiesDeclaration(node: Java.AdditionalPropertiesDeclaration): VisitResult<string> {

    // TODO: Render it somehow. What is the best way to keep it modular and modifiable by others?
    return `// TODO: This is where the additionalProperties code should go\n`;
  }
}
