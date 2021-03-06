import * as Java from '@java/cst/JavaCstTypes';
import {CompilationUnitCallback} from '@cst/CompilationUnitCallback';
import {ICstVisitor, VisitResult} from '@visit';
import {IRenderer} from '@render';
import {ICstNode} from '@cst';
import {IJavaCstVisitor, JavaVisitFn} from '@java/visit/IJavaCstVisitor';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {pascalCase} from 'change-case';
import {JavaOptions, JavaUtil} from '@java';
import {AbstractJavaNode, GenericTypeDeclarationList, TypeList} from '@java/cst/JavaCstTypes';

type JavaRendererVisitFn<N extends ICstNode> = JavaVisitFn<N, string>;

export class JavaRenderer extends JavaVisitor<string> implements IRenderer {
  private blockDepth = 0;
  private readonly pattern_lineStart = new RegExp(/(?<!$)^/mg);
  private tokenPrefix = ' ';
  private tokenSuffix = ' ';
  private readonly _options: JavaOptions;

  private readonly cuCallback: CompilationUnitCallback;

  constructor(options: JavaOptions, callback: CompilationUnitCallback) {
    super();
    this._options = options;
    this.cuCallback = callback;
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
    return (`return ${this.render(node.expression, visitor)}`);
  }

  visitToken: JavaRendererVisitFn<Java.JavaToken> = (node, visitor) => {
    return (`${this.tokenPrefix}${JavaRenderer.getTokenTypeString(node.type)}${this.tokenSuffix}`);
  }

  private static getTokenTypeString(type: Java.TokenType): '=' | '==' | '!=' | '<' | '>' | '<=' | '>=' | '+' | '-' | '*' | ',' {
    switch (type) {
      case Java.TokenType.ASSIGN:
        return '=';
      case Java.TokenType.EQUALS:
        return '==';
      case Java.TokenType.NOT_EQUALS:
        return '!=';
      case Java.TokenType.GT:
        return '>';
      case Java.TokenType.LT:
        return '<';
      case Java.TokenType.GTE:
        return '>=';
      case Java.TokenType.LTE:
        return '<=';
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

    return `${annotations}${this.render(node.modifiers, visitor)} ${this.render(node.owner.name, visitor)}(${this.render(node.parameters, visitor)}) {${body}}\n\n`;
  }

  visitBlock: JavaRendererVisitFn<Java.Block> = (node, visitor) => {
    this.blockDepth++;
    const indentation = this.getIndentation(1);
    const blockContent = this.join(node.children.map(it => it.visit(visitor)));
    this.blockDepth--;

    return blockContent.replace(this.pattern_lineStart, indentation);
  }

  visitCommonTypeDeclaration(visitor: IJavaCstVisitor<string>, node: Java.AbstractObjectDeclaration, typeString: string, generics?: GenericTypeDeclarationList): VisitResult<string> {

    const modifiers = this.render(node.modifiers, visitor);
    const name = this.render(node.name, visitor);
    const genericsString = generics ? this.render(generics, visitor) : '';
    const classExtension = node.extends ? ` extends ${this.render(node.extends, visitor)}` : '';
    const classImplementations = node.implements ? ` implements ${this.render(node.implements, visitor)}` : '';

    let typeDeclarationContent = '';
    typeDeclarationContent += (node.comments ? `${this.render(node.comments, visitor)}\n` : '');
    typeDeclarationContent += (node.annotations ? `${this.render(node.annotations, visitor)}\n` : '');
    typeDeclarationContent += (`${modifiers} ${typeString} ${name}${genericsString}${classExtension}${classImplementations} {\n`);
    typeDeclarationContent += (this.render(node.body, visitor));
    typeDeclarationContent += ('}\n');

    return typeDeclarationContent;
  }

  visitClassDeclaration: JavaRendererVisitFn<Java.ClassDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'class');
  }

  visitGenericClassDeclaration: JavaRendererVisitFn<Java.GenericClassDeclaration> = (node, visitor) => {
    const filtered = node.typeList.types.length > 0 ? node.typeList : undefined;
    return this.visitCommonTypeDeclaration(visitor, node, 'class', filtered);
  }

  visitInterfaceDeclaration: JavaRendererVisitFn<Java.InterfaceDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'interface');
  }

  visitEnumDeclaration: JavaRendererVisitFn<Java.EnumDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'enum');
  }

  visitGenericTypeDeclaration: JavaRendererVisitFn<Java.GenericTypeDeclaration> = (node, visitor) => {

    let str = this.render(node.name, visitor);
    if (node.lowerBounds) {
      str += ` extends ${this.render(node.lowerBounds, visitor)}`;
    }
    if (node.upperBounds) {
      str += ` super ${this.render(node.upperBounds, visitor)}`;
    }

    return str;
  }

  visitGenericTypeDeclarationList: JavaRendererVisitFn<Java.GenericTypeDeclarationList> = (node, visitor) => {

    const genericTypes = node.types.map(it => this.render(it, visitor));
    if (genericTypes.length == 0) {
      // TODO: This should not happen. Fix the location that puts in the empty generics.
      return '';
    }

    return `<${genericTypes.join(', ')}>`;
  }

  visitGenericTypeUseList: JavaRendererVisitFn<Java.GenericTypeUseList> = (node, visitor) => {
    const genericTypes = node.types.map(it => this.render(it, visitor));
    if (genericTypes.length == 0) {
      return '';
    }

    return genericTypes;
  }

  visitGenericTypeUse: JavaRendererVisitFn<Java.GenericTypeUse> = (node, visitor) => {
    return this.render(node.name, visitor);
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

    const importStrings = node.children.map(it => this.render(it, visitor));
    if (importStrings.length == 0) {
      return '';
    }

    return `${importStrings.join('\n')}\n\n`;
  }

  visitImportStatement: JavaRendererVisitFn<Java.ImportStatement> = (node, visitor) => {
    // We always render the Fully Qualified Name here, and not the relative nor local name.
    // But we remove any generics that the import might have.
    const fqn = JavaUtil.getName({
      type: node.type.omniType,
      withSuffix: false,
      options: this._options
    });

    return `import ${fqn};`;
  }

  visitImplementsDeclaration: JavaRendererVisitFn<Java.ImplementsDeclaration> = (node, visitor) => {
    return (node.types.children.map(it => this.escapeImplements(this.render(it, visitor))).join(', '));
  }

  visitEnumItem: JavaRendererVisitFn<Java.EnumItem> = (node, visitor) => {
    const key = this.render(node.identifier, visitor);
    const value = this.render(node.value, visitor);
    return `${key}(${value})`;
  }

  visitEnumItemList: JavaRendererVisitFn<Java.EnumItemList> = (node, visitor) => {
    return `${node.children.map(it => this.render(it)).join(',\n')};\n`;
  }

  visitMethodDeclaration: JavaRendererVisitFn<Java.MethodDeclaration> = (node, visitor) => {
    const signature = this.render(node.signature, visitor);
    const body = node.body ? this.render(node.body, visitor) : '';

    return [
      `${signature} {\n`,
      body,
      '}\n\n',
    ];
  }

  visitMethodDeclarationSignature: JavaRendererVisitFn<Java.MethodDeclarationSignature> = (node, visitor) => {
    const comments = node.comments && node.comments.children.length > 0 ? `${this.render(node.comments, visitor)}\n` : '';
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)}\n` : '';
    const modifiers = this.render(node.modifiers, visitor);
    const type = this.render(node.type, visitor);
    const name = this.render(node.identifier, visitor);
    const parameters = node.parameters ? this.render(node.parameters, visitor) : '';

    return [
      comments,
      annotations,
      `${modifiers} ${type} ${name}(${parameters})`,
    ];
  }

  visitAbstractMethodDeclaration: JavaRendererVisitFn<Java.AbstractMethodDeclaration> = (node, visitor) => {

    const superVisitor = {...visitor, ...{visitAbstractMethodDeclaration: this.visitor_java.visitAbstractMethodDeclaration}};
    return `${this.render(node.signature, superVisitor)};\n`;
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
    // TODO: The "multiline" should be contextual and automatic in my opinion.
    //        There should be different methods:
    //        visitClassAnnotationList, visitFieldAnnotationList, visitMethodAnnotationList, visitArgumentAnnotationList
    return (node.children.map(it => this.render(it, visitor)).join(node.multiline ? '\n' : ' '));
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

  visitArgumentDeclarationList: JavaRendererVisitFn<Java.ArgumentDeclarationList> = (node, visitor) => {

    const listString = node.children.map(it => this.render(it, visitor)).join(', ');
    if (listString.length > 100) {
      // TODO: Make 100 an option
      const spaces = this.getIndentation(1);
      return `\n${spaces}${listString.replaceAll(/, /g, `,\n${spaces}`)}\n`;
    }

    return listString;
  }

  visitArgumentList: JavaRendererVisitFn<Java.ArgumentList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(', ');
  }

  visitTypeList: JavaRendererVisitFn<Java.TypeList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(' ');
  }

  visitType: JavaRendererVisitFn<Java.Type> = (node, visitor) => {
    return node.getLocalName() || node.getFQN(this._options);
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

  visitSuperConstructorCall: JavaRendererVisitFn<Java.SuperConstructorCall> = (node, visitor) => {

    return `super(${this.render(node.parameters, visitor)})`;
  }

  visitIfStatement: JavaRendererVisitFn<Java.IfStatement> = (node, visitor) => {
    return `if (${this.render(node.predicate, visitor)}) {\n${this.render(node.body)}}\n`;
  }

  visitIfElseStatement: JavaRendererVisitFn<Java.IfElseStatement> = (node, visitor) => {

    const ifs = node.ifStatements.map(it => this.render(it, visitor));
    const el = node.elseBlock ? `\nelse {\n${this.render(node.elseBlock)}\n}` : '';

    return `${ifs.join('else ')}${el}`;
  }

  visitRuntimeTypeMapping: JavaRendererVisitFn<Java.RuntimeTypeMapping> = (node, visitor) => {

    return [
      ...node.fields.map(it => this.render(it, visitor)),
      ...node.getters.map(it => this.render(it, visitor)),
      ...node.methods.map(it => this.render(it, visitor))
    ];
  }

  visitClassName: JavaRendererVisitFn<Java.ClassName> = (node, visitor) => {
    return `${this.render(node.type, visitor)}`;
  }

  visitClassReference: JavaRendererVisitFn<Java.ClassReference> = (node, visitor) => {
    return `${this.render(node.className, visitor)}.class`;
  }

  visitArrayInitializer: JavaRendererVisitFn<Java.ArrayInitializer<AbstractJavaNode>> = (node, visitor) => {

    // TODO: This needs to support multiple levels. Right now it only supports one. Or is that up to end-user to add blocks?
    const entries = node.children.map(it => this.render(it, visitor));
    const indentation = this.getIndentation(1);
    return `{\n${indentation}${entries.join(',\n' + indentation)}\n}`;
  }

  visitStaticMemberReference: JavaRendererVisitFn<Java.StaticMemberReference> = (node, visitor) => {
    return `${this.render(node.target, visitor)}.${this.render(node.member, visitor)}`;
  }

  private escapeImplements(value: string): string {

    // This will most likely result in *INCORRECT* Java Code, since it will refer to other type that intended.
    // But for now this is better than simply crashing.
    // TODO: But THIS MUST BE REMOVED later when the inheritance system is fully functional. Then it *should* crash on parse error.
    return pascalCase(value.replaceAll(/[^\w0-9]/g, '_'));
  }
}
