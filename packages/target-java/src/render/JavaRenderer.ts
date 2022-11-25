import {
  CompilationUnitRenderCallback,
  AstVisitor,
  VisitResult,
  OmniPrimitiveKind,
  OmniUtil,
  RealOptions,
  Renderer,
  AbstractStNode, Case,
} from '@omnigen/core';
import {AbstractJavaNode, Comment, GenericTypeDeclarationList} from '../ast/index.js';
import {JavaVisitor, JavaVisitFn} from '../visit/index.js';
import {JavaOptions} from '../options/index.js';
import * as Java from '../ast/index.js';

type JavaRendererVisitFn<N extends AbstractStNode> = JavaVisitFn<N, string>;

export class JavaRenderer extends JavaVisitor<string> implements Renderer {
  private _blockDepth = 0;
  private readonly _patternLineStart = new RegExp(/(?<!$)^/mg);
  private _tokenPrefix = ' ';
  private _tokenSuffix = ' ';
  private readonly _options: RealOptions<JavaOptions>;

  private readonly _cuCallback: CompilationUnitRenderCallback;

  constructor(options: RealOptions<JavaOptions>, callback: CompilationUnitRenderCallback) {
    super();
    this._options = options;
    this._cuCallback = callback;
  }

  private getIndentation(d: number = this._blockDepth): string {
    return '  '.repeat(d);
  }

  public render<N extends AbstractStNode, V extends AstVisitor<string>>(node: N | undefined, visitor?: V): string {
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
  };

  /**
   * TODO: Should this be used together with the field reference above?
   */
  visitSelfReference: JavaRendererVisitFn<Java.SelfReference> = () => {
    return `this`;
  };

  visitVariableDeclaration: JavaRendererVisitFn<Java.VariableDeclaration> = node => {

    const constant = (node.constant) ? 'final ' : '';
    const type = node.variableType ? this.render(node.variableType) : 'var ';
    const name = this.render(node.variableName);
    const initializer = node.initializer ? ` = ${this.render(node.initializer)}` : '';

    return `${constant}${type}${name}${initializer}`;
  };

  visitReturnStatement: JavaRendererVisitFn<Java.ReturnStatement> = (node, visitor) => {
    return (`return ${this.render(node.expression, visitor)}`);
  };

  visitToken: JavaRendererVisitFn<Java.JavaToken> = node => {
    return (`${this._tokenPrefix}${JavaRenderer.getTokenTypeString(node.type)}${this._tokenSuffix}`);
  };

  private static getTokenTypeString(type: Java.TokenType): string {
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
      case Java.TokenType.OR:
        return '||';
      case Java.TokenType.AND:
        return '&&';
      default:
        throw new Error('Unknown token type');
    }
  }

  visitConstructor: JavaRendererVisitFn<Java.ConstructorDeclaration> = (node, visitor) => {
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)}\n` : '';
    const body = node.body ? `\n${this.render(node.body, visitor)}` : '';
    const modifiers = node.modifiers.children.length > 0 ? `${this.render(node.modifiers, visitor)} ` : '';

    return `${annotations}${modifiers}${this.render(node.owner.name, visitor)}(${this.render(node.parameters, visitor)}) {${body}}\n\n`;
  };

  visitBlock: JavaRendererVisitFn<Java.Block> = (node, visitor) => {
    this._blockDepth++;
    const indentation = this.getIndentation(1);
    const blockContent = this.join(node.children.map(it => it.visit(visitor))).trim();
    this._blockDepth--;

    return blockContent.replace(this._patternLineStart, indentation) + '\n';
  };

  visitCommonTypeDeclaration(
    visitor: JavaVisitor<string>,
    node: Java.AbstractObjectDeclaration,
    typeString: string,
    generics?: GenericTypeDeclarationList,
  ): VisitResult<string> {

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
  };

  visitGenericClassDeclaration: JavaRendererVisitFn<Java.GenericClassDeclaration> = (node, visitor) => {
    const filtered = node.typeList.types.length > 0 ? node.typeList : undefined;
    return this.visitCommonTypeDeclaration(visitor, node, 'class', filtered);
  };

  visitInterfaceDeclaration: JavaRendererVisitFn<Java.InterfaceDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'interface');
  };

  visitEnumDeclaration: JavaRendererVisitFn<Java.EnumDeclaration> = (node, visitor) => {
    return this.visitCommonTypeDeclaration(visitor, node, 'enum');
  };

  visitGenericTypeDeclaration: JavaRendererVisitFn<Java.GenericTypeDeclaration> = (node, visitor) => {

    let str = this.render(node.name, visitor);
    if (node.lowerBounds) {
      str += ` extends ${this.render(node.lowerBounds, visitor)}`;
    }
    if (node.upperBounds) {
      str += ` super ${this.render(node.upperBounds, visitor)}`;
    }

    return str;
  };

  visitGenericTypeDeclarationList: JavaRendererVisitFn<Java.GenericTypeDeclarationList> = (node, visitor) => {

    const genericTypes = node.types.map(it => this.render(it, visitor));
    if (genericTypes.length == 0) {
      // TODO: This should not happen. Fix the location that puts in the empty generics.
      return '';
    }

    return `<${genericTypes.join(', ')}>`;
  };

  visitGenericTypeUseList: JavaRendererVisitFn<Java.GenericTypeUseList> = (node, visitor) => {
    const genericTypes = node.types.map(it => this.render(it, visitor));
    if (genericTypes.length == 0) {
      return '';
    }

    return genericTypes;
  };

  visitGenericTypeUse: JavaRendererVisitFn<Java.GenericTypeUse> = (node, visitor) => {
    return this.render(node.name, visitor);
  };

  visitCommentBlock: JavaRendererVisitFn<Java.CommentBlock> = (node, visitor) => {

    const text = this.join(this.visitFreeTextRecursively(node.text, visitor, it => it))
      .trim()
      .replaceAll('\r', '')
      .replaceAll('\n', '\n * ');

    return `/**\n * ${text}\n */`;
  };

  visitComment: JavaRendererVisitFn<Java.Comment> = (node, visitor) => {

    const textString = this.join(this.visitFreeTextRecursively(node.text, visitor, it => it));

    return textString
      .replaceAll('\r', '')
      .replaceAll('\n', '\n// ')
      .trim();
  };

  visitCompilationUnit: JavaRendererVisitFn<Java.CompilationUnit> = (node, visitor) => {

    const content = this.join([
      node.packageDeclaration.visit(visitor),
      node.imports.visit(visitor),
      node.object.visit(visitor),
    ]);

    // This was a top-level class/interface, so we will output it as a compilation unit.
    this._cuCallback({
      content: content,
      name: node.object.name.value,
      fileName: `${node.object.name.value}.java`,
      directories: node.packageDeclaration.fqn.split('.'),
      node: node,
    });

    return content;
  };

  visitPackage: JavaRendererVisitFn<Java.PackageDeclaration> = node => {
    return `package ${node.fqn};\n\n`;
  };

  visitImportList: JavaRendererVisitFn<Java.ImportList> = (node, visitor) => {

    const importStrings = node.children.map(it => this.render(it, visitor));
    if (importStrings.length == 0) {
      return '';
    }

    return `${importStrings.join('\n')}\n\n`;
  };

  visitImportStatement: JavaRendererVisitFn<Java.ImportStatement> = node => {
    // We always render the Fully Qualified Name here, and not the relative nor local name.
    // But we remove any generics that the import might have.
    // const fqn = JavaUtil.getName({
    //   type: node.type.omniType,
    //   withSuffix: false,
    //   withPackage: true,
    //   implementation: node.type.implementation,
    //   options: this._options
    // });

    const importName = node.type.getImportName();
    if (!importName) {
      throw new Error(`Import name is not set for '${OmniUtil.describe(node.type.omniType)}'`);
    }

    return `import ${importName};`;
  };

  visitImplementsDeclaration: JavaRendererVisitFn<Java.ImplementsDeclaration> = (node, visitor) => {
    return (node.types.children.map(it => this.render(it, visitor)).join(', '));
  };

  visitEnumItem: JavaRendererVisitFn<Java.EnumItem> = (node, visitor) => {
    const key = this.render(node.identifier, visitor);
    const value = this.render(node.value, visitor);
    return `${key}(${value})`;
  };

  visitEnumItemList: JavaRendererVisitFn<Java.EnumItemList> = node => {
    return `${node.children.map(it => this.render(it)).join(',\n')};\n`;
  };

  visitMethodDeclaration: JavaRendererVisitFn<Java.MethodDeclaration> = (node, visitor) => {
    const signature = this.render(node.signature, visitor);
    const body = node.body ? this.render(node.body, visitor) : '';

    return [
      `${signature} {\n`,
      body,
      '}\n\n',
    ];
  };

  visitMethodDeclarationSignature: JavaRendererVisitFn<Java.MethodDeclarationSignature> = (node, visitor) => {
    const comments = node.comments ? `${this.render(node.comments, visitor)}\n` : '';
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
  };

  visitAbstractMethodDeclaration: JavaRendererVisitFn<Java.AbstractMethodDeclaration> = (node, visitor) => {

    const superVisitor = {...visitor, visitAbstractMethodDeclaration: this.visitorJava.visitAbstractMethodDeclaration};
    return `${this.render(node.signature, superVisitor)};\n`;
  };

  visitMethodCall: JavaRendererVisitFn<Java.MethodCall> = (node, visitor) => {
    return `${this.render(node.target, visitor)}.${this.render(node.methodName, visitor)}(${this.render(node.methodArguments, visitor)})`;
  };

  visitStatement: JavaRendererVisitFn<Java.Statement> = node => {
    return [
      node.child.visit(this),
      ';\n',
    ];
  };

  visitAnnotationList: JavaRendererVisitFn<Java.AnnotationList> = (node, visitor) => {
    // TODO: The "multiline" should be contextual and automatic in my opinion.
    //        There should be different methods:
    //        visitClassAnnotationList, visitFieldAnnotationList, visitMethodAnnotationList, visitArgumentAnnotationList
    return (node.children.map(it => this.render(it, visitor)).join(node.multiline ? '\n' : ' '));
  };

  visitAnnotation: JavaRendererVisitFn<Java.Annotation> = (node, visitor) => {
    const pairs = node.pairs ? `(${this.render(node.pairs, visitor)})` : '';
    return (`@${this.render(node.type, visitor)}${pairs}`);
  };

  visitAnnotationKeyValuePairList: JavaRendererVisitFn<Java.AnnotationKeyValuePairList> = (node, visitor) => {
    return (node.children.map(it => this.render(it, visitor)).join(', '));
  };

  visitAnnotationKeyValuePair: JavaRendererVisitFn<Java.AnnotationKeyValuePair> = (node, visitor) => {
    const key = node.key ? `${this.render(node.key, visitor)} = ` : '';
    return (`${key}${this.render(node.value, visitor)}`);
  };

  visitLiteral: JavaRendererVisitFn<Java.Literal> = node => {
    if (typeof node.value === 'string') {
      return (`"${node.value}"`);
    } else if (typeof node.value == 'boolean') {
      return (`${node.value ? 'true' : 'false'}`);
    } else if (node.value === null) {
      return (`null`);
    } else {
      if (node.primitiveKind !== undefined) {
        if (node.primitiveKind == OmniPrimitiveKind.DOUBLE) {
          return (`${node.value}d`);
        } else if (node.primitiveKind == OmniPrimitiveKind.FLOAT) {
          return (`${node.value}f`);
        } else if (node.primitiveKind == OmniPrimitiveKind.LONG) {
          return (`${node.value}L`);
        } else if (node.primitiveKind == OmniPrimitiveKind.INTEGER) {
          return (`${node.value}`);
        } else if (node.primitiveKind == OmniPrimitiveKind.NUMBER) {
          // If the type is just 'number' we will have to hope type inference is good enough.
        }
      }
      return (`${node.value}`);
    }
  };

  visitFieldGetterSetter: JavaRendererVisitFn<Java.FieldGetterSetter> = (node, visitor) => {
    const content = this.join([
      node.field.visit(visitor),
      node.getter.visit(visitor),
      node.setter.visit(visitor),
    ]);

    return `${content}\n`;
  };

  visitField: JavaRendererVisitFn<Java.Field> = (node, visitor) => {
    const comments = node.comments ? `${this.render(node.comments, visitor)}\n` : '';
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)}\n` : '';
    let modifiers = this.render(node.modifiers, visitor);
    const typeName = this.render(node.type, visitor);
    const initializer = node.initializer ? ` = ${this.render(node.initializer, visitor)}` : '';
    const identifier = this.render(node.identifier, visitor);

    if (modifiers.length > 0) {
      modifiers += ' ';
    }

    return [
      comments,
      annotations,
      `${modifiers}${typeName} ${identifier}${initializer};\n`,
    ];
  };

  visitNewStatement: JavaRendererVisitFn<Java.NewStatement> = (node, visitor) => {
    const parameters = node.constructorArguments ? this.render(node.constructorArguments, visitor) : '';
    return `new ${this.render(node.type, visitor)}(${parameters})`;
  };

  visitIdentifier: JavaRendererVisitFn<Java.Identifier> = node => {
    return node.value;
  };

  visitArgumentDeclaration: JavaRendererVisitFn<Java.ArgumentDeclaration> = (node, visitor) => {
    // TODO: Make this simpler by allowing to "visit" between things,
    //  so we can insert spaces or delimiters without tinkering inside the base visitor
    const annotations = node.annotations ? `${this.render(node.annotations, visitor)} ` : '';
    const type = this.render(node.type, visitor);
    const identifier = this.render(node.identifier, visitor);

    return `${annotations}${type} ${identifier}`;
  };

  visitArgumentDeclarationList: JavaRendererVisitFn<Java.ArgumentDeclarationList> = (node, visitor) => {

    const listString = node.children.map(it => this.render(it, visitor)).join(', ');
    if (listString.length > 100) {
      // TODO: Make 100 an option
      const spaces = this.getIndentation(1);
      return `\n${spaces}${listString.replaceAll(/, /g, `,\n${spaces}`)}\n`;
    }

    return listString;
  };

  visitArgumentList: JavaRendererVisitFn<Java.ArgumentList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(', ');
  };

  visitTypeList: JavaRendererVisitFn<Java.TypeList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(' ');
  };

  visitRegularType: JavaRendererVisitFn<Java.RegularType> = node => {
    if (node.getLocalName()) {
      return node.getLocalName();
    } else {
      throw new Error(`Local name must have been set. Has the package name transformer not been ran?`);
    }
  };

  visitGenericType: JavaRendererVisitFn<Java.GenericType> = (node, visitor) => {

    const baseTypeString = this.render(node.baseType, visitor);
    const genericArgumentStrings = node.genericArguments.map(it => this.render(it, visitor));

    return `${baseTypeString}<${genericArgumentStrings.join(', ')}>`;
  };

  visitModifierList: JavaRendererVisitFn<Java.ModifierList> = (node, visitor) => {
    return node.children.map(it => this.render(it, visitor)).join(' ');
  };

  visitModifier: JavaRendererVisitFn<Java.Modifier> = node => {
    const modifierString = JavaRenderer.getModifierString(node.type);
    if (modifierString) {
      return modifierString;
    }

    return undefined;
  };

  visitSuperConstructorCall: JavaRendererVisitFn<Java.SuperConstructorCall> = (node, visitor) => {

    return `super(${this.render(node.parameters, visitor)})`;
  };

  visitIfStatement: JavaRendererVisitFn<Java.IfStatement> = (node, visitor) => {
    return `if (${this.render(node.predicate, visitor)}) {\n${this.render(node.body)}}\n`;
  };

  visitIfElseStatement: JavaRendererVisitFn<Java.IfElseStatement> = (node, visitor) => {

    const ifs = node.ifStatements.map(it => this.render(it, visitor));
    const el = node.elseBlock ? ` else {\n${this.render(node.elseBlock)}}\n` : '';

    return `${ifs.join('else ').trim()}${el}`;
  };

  visitRuntimeTypeMapping: JavaRendererVisitFn<Java.RuntimeTypeMapping> = (node, visitor) => {

    return [
      ...node.fields.map(it => this.render(it, visitor)),
      ...node.getters.map(it => this.render(it, visitor)),
      ...node.methods.map(it => this.render(it, visitor)),
    ];
  };

  visitClassName: JavaRendererVisitFn<Java.ClassName> = (node, visitor) => {
    return `${this.render(node.type, visitor)}`;
  };

  visitClassReference: JavaRendererVisitFn<Java.ClassReference> = (node, visitor) => {
    return `${this.render(node.className, visitor)}.class`;
  };

  visitArrayInitializer: JavaRendererVisitFn<Java.ArrayInitializer<AbstractJavaNode>> = (node, visitor) => {

    // TODO: This needs to support multiple levels. Right now it only supports one. Or is that up to end-user to add blocks?
    const entries = node.children.map(it => this.render(it, visitor));
    const indentation = this.getIndentation(1);
    return `{\n${indentation}${entries.join(',\n' + indentation)}\n}`;
  };

  visitStaticMemberReference: JavaRendererVisitFn<Java.StaticMemberReference> = (node, visitor) => {
    return `${this.render(node.target, visitor)}.${this.render(node.member, visitor)}`;
  };

  visitCast: JavaRendererVisitFn<Java.Cast> = (node, visitor) => {
    return `((${this.render(node.toType)}) ${this.render(node.expression, visitor)})`;
  };

  visitFreeText: JavaRendererVisitFn<Java.FreeText> = (node, visitor) => {
    return node.text;
  };

  visitFreeTextHeader: JavaRendererVisitFn<Java.FreeTextHeader> = (node, visitor) => {
    return `<h${node.level}>${this.join(this.visitFreeTextRecursively(node.child, visitor, it => it))}</h${node.level}>\n`;
  };

  visitFreeTextParagraph: JavaRendererVisitFn<Java.FreeTextParagraph> = (node, visitor) => {
    return `<p>${this.join(this.visitFreeTextRecursively(node.child, visitor, it => it))}</p>\n`;
  };

  visitFreeTextSection: JavaRendererVisitFn<Java.FreeTextSection> = (node, visitor) => {

    const indentation = this.getIndentation(1);
    const header = this.render(node.header, visitor);
    const content = this.join(this.visitFreeTextRecursively(node.content, visitor, it => it));
    const blockContent = `${header}${content.trim()}`;

    const indentedBlock = blockContent.replace(this._patternLineStart, indentation);

    return `<section>\n${indentedBlock}\n</section>\n`;
  };

  visitFreeTextLine: JavaRendererVisitFn<Java.FreeTextLine> = (node, visitor) => {
    return `${this.join(this.visitFreeTextRecursively(node.child, visitor, it => it))}\n`;
  };

  visitFreeTextIndent: JavaRendererVisitFn<Java.FreeTextLine> = (node, visitor) => {

    const indentation = this.getIndentation(1);
    const blockContent = this.join(this.visitFreeTextRecursively(node.child, visitor, it => it));

    return blockContent.replace(this._patternLineStart, indentation);
  };

  visitFreeTextTypeLink: JavaRendererVisitFn<Java.FreeTextTypeLink> = (node, visitor) => {
    // TODO: Do we not need a way to say here that "we want the type without the generics"?
    //  Or do we need to specify on creation?
    return `{@link ${this.render(node.type, visitor)}}`;
  };

  visitFreeTextMethodLink: JavaRendererVisitFn<Java.FreeTextMethodLink> = (node, visitor) => {
    return `{@link ${this.render(node.type, visitor)}#${this.render(node.method.identifier, visitor)}}`;
  };

  visitFreeTextPropertyLink: JavaRendererVisitFn<Java.FreeTextPropertyLink> = (node, visitor) => {

    const targetName = node.property.fieldName || node.property.propertyName || node.property.name;
    return `{@link ${this.render(node.type, visitor)}#${targetName}}`;
  };
}
