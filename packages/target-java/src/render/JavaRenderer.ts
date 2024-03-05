import {AstNode, AstVisitor, OmniPrimitiveKind, RenderedCompilationUnit, Renderer, VisitResult} from '@omnigen/core';
import * as Java from '../ast/index.ts';
import {GenericTypeDeclarationList, TokenType} from '../ast/index.ts';
import {createJavaVisitor, DefaultJavaVisitor, JavaVisitor} from '../visit/index.ts';
import {JavaOptions} from '../options/index.ts';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

function getModifierString(type: Java.ModifierType): 'public' | 'private' | 'protected' | 'final' | 'static' | '' {
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

function getTokenTypeString(type: Java.TokenType): string {
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

export type JavaRenderer = JavaVisitor<string> & Renderer;

const join = (result: VisitResult<string>): string => {
  if (Array.isArray(result)) {
    return result.map(it => join(it)).join('');
  } else {
    if (typeof result == 'string') {
      return result;
    } else {
      return '';
    }
  }
};

const render = <N extends AstNode, V extends AstVisitor<string>>(node: N | undefined, visitor: V): string => {
  if (node === undefined) {
    return '';
  }

  return join(node.visit(visitor || DefaultJavaVisitor));
};

const visitCommonTypeDeclaration = (
  visitor: JavaVisitor<string>,
  node: Java.AbstractObjectDeclaration,
  typeString: string,
  generics?: GenericTypeDeclarationList,
): VisitResult<string> => {

  const modifiers = render(node.modifiers, visitor);
  const name = render(node.name, visitor);
  const genericsString = generics ? render(generics, visitor) : '';
  const classExtension = node.extends ? ` extends ${render(node.extends, visitor)}` : '';
  const classImplementations = node.implements ? ` implements ${render(node.implements, visitor)}` : '';

  let typeDeclarationContent = '';
  typeDeclarationContent += (node.comments ? `${render(node.comments, visitor)}\n` : '');
  typeDeclarationContent += (node.annotations ? `${render(node.annotations, visitor)}\n` : '');
  typeDeclarationContent += (`${modifiers} ${typeString} ${name}${genericsString}${classExtension}${classImplementations} {\n`);
  typeDeclarationContent += (render(node.body, visitor));
  typeDeclarationContent += ('}\n');

  return typeDeclarationContent;
};

const getIndentation = (d: number): string => {
  return '  '.repeat(d);
};

export const createJavaRenderer = (options: JavaOptions): JavaRenderer => {

  let blockDepth = 0;
  let insideDeclaration = false;
  const patternLineStart = new RegExp(/(?<!$)^/mg);
  const tokenPrefix = ' ';
  const tokenSuffix = ' ';

  /**
   * TODO: Maybe change so that renderer either returns string OR the compilation unit.
   */
  const units: RenderedCompilationUnit[] = [];

  return {
    ...createJavaVisitor(),

    executeRender: (node, visitor) => {
      if (node === undefined) {
        return [];
      }

      units.length = 0;
      node.visit(visitor);
      return units;
    },

    visitFieldReference: (node, visitor) => (`this.${render(node.field.identifier, visitor)}`),

    /**
     * TODO: Should this be used together with the field reference above?
     */
    visitSelfReference: () => `this`,
    visitVariableDeclaration: (node, visitor) => {

      const constant = (node.constant) ? 'final ' : '';
      const type = (options.preferVar || !node.type) ? 'var ' : `${render(node.type, visitor)} `;
      const name = render(node.identifier, visitor);

      insideDeclaration = true;
      const initializer = node.initializer ? ` = ${render(node.initializer, visitor)}` : '';
      insideDeclaration = false;

      return `${constant}${type}${name}${initializer}`;
    },

    visitReturnStatement: (node, visitor) => (`return ${render(node.expression, visitor)}`),
    visitToken: node => (`${tokenPrefix}${getTokenTypeString(node.type)}${tokenSuffix}`),

    visitConstructor: (node, visitor) => {
      const annotations = node.annotations ? `${render(node.annotations, visitor)}\n` : '';
      const body = node.body ? `\n${render(node.body, visitor)}` : '';
      const modifiers = node.modifiers.children.length > 0 ? `${render(node.modifiers, visitor)} ` : '';

      return `${annotations}${modifiers}${render(node.owner.name, visitor)}(${render(node.parameters, visitor)}) {${body}}\n\n`;
    },

    visitBlock: (node, visitor) => {
      blockDepth++;
      const indentation = getIndentation(1);
      const blockContent = join(node.children.map(it => it.visit(visitor))).trim();
      blockDepth--;

      return blockContent.replace(patternLineStart, indentation) + '\n';
    },

    visitClassDeclaration: (node, visitor) => visitCommonTypeDeclaration(visitor, node, 'class'),

    visitGenericClassDeclaration: (node, visitor) => {
      const filtered = node.typeList.types.length > 0 ? node.typeList : undefined;
      return visitCommonTypeDeclaration(visitor, node, 'class', filtered);
    },

    visitInterfaceDeclaration: (node, visitor) => visitCommonTypeDeclaration(visitor, node, 'interface'),
    visitEnumDeclaration: (node, visitor) => visitCommonTypeDeclaration(visitor, node, 'enum'),

    visitGenericTypeDeclaration(node, visitor) {

      let str = render(node.name, visitor);
      if (node.lowerBounds) {
        str += ` extends ${render(node.lowerBounds, visitor)}`;
      }
      if (node.upperBounds) {
        str += ` super ${render(node.upperBounds, visitor)}`;
      }

      return str;
    },

    visitGenericTypeDeclarationList: (node, visitor) => {

      const genericTypes = node.types.map(it => render(it, visitor));
      if (genericTypes.length == 0) {
        // TODO: This should not happen. Fix the location that puts in the empty generics.
        return '';
      }

      return `<${genericTypes.join(', ')}>`;
    },

    visitCommentBlock: (node, visitor) => {

      const text = join(visitor.visitFreeTextGlobal(node.text, visitor, it => it))
        .trim()
        .replaceAll('\r', '')
        .replaceAll('\n', '\n * ');

      return `/**\n * ${text}\n */`;
    },

    visitComment: (node, visitor) => {

      const textString = join(visitor.visitFreeTextGlobal(node.text, visitor, it => it));

      return textString
        .replaceAll('\r', '')
        .replaceAll('\n', '\n// ')
        .trim();
    },

    visitCompilationUnit: (node, visitor) => {

      const content = join([
        node.packageDeclaration.visit(visitor),
        node.imports.visit(visitor),
        node.object.visit(visitor),
      ]);

      // This was a top-level class/interface, so we will output it as a compilation unit.
      units.push({
        content: content,
        name: node.object.name.value,
        fileName: `${node.object.name.value}.java`,
        directories: node.packageDeclaration.fqn.split('.'),
        node: node,
      });

      return content;
    },

    visitPackage: node => `package ${node.fqn};\n\n`,

    visitImportList: (node, visitor) => {

      const importStrings = node.children.map(it => render(it, visitor));
      if (importStrings.length == 0) {
        return '';
      }

      return `${importStrings.join('\n')}\n\n`;
    },

    visitImportStatement: node => {
      // We always render the Fully Qualified Name here, and not the relative nor local name.
      // But we remove any generics that the import might have.
      // const fqn = JavaUtil.getName({
      //   type: node.type.omniType,
      //   withSuffix: false,
      //   withPackage: true,
      //   implementation: node.type.implementation,
      //   options: this.options
      // });

      const importName = node.type.getImportName();
      if (!importName) {
        throw new Error(`Import name is not set for '${OmniUtil.describe(node.type.omniType)}'`);
      }

      return `import ${importName};`;
    },

    visitImplementsDeclaration: (node, visitor) => render(node.types, visitor),

    visitEnumItem: (node, visitor) => {
      const key = render(node.identifier, visitor);
      const value = render(node.value, visitor);
      return `${key}(${value})`;
    },

    visitEnumItemList: (node, visitor) => `${node.children.map(it => render(it, visitor)).join(',\n')};\n`,

    visitMethodDeclaration: (node, visitor) => {
      const signature = render(node.signature, visitor);
      const body = node.body ? render(node.body, visitor) : '';

      return [
        `${signature} {\n`,
        body,
        '}\n\n',
      ];
    },

    visitMethodDeclarationSignature: (node, visitor) => {
      const comments = node.comments ? `${render(node.comments, visitor)}\n` : '';
      const annotations = node.annotations ? `${render(node.annotations, visitor)}\n` : '';
      const modifiers = render(node.modifiers, visitor);
      const type = render(node.type, visitor);
      const name = render(node.identifier, visitor);
      const parameters = node.parameters ? render(node.parameters, visitor) : '';
      const throws = node.throws ? ` throws ${render(node.throws, visitor)}` : '';

      return [
        comments,
        annotations,
        `${modifiers} ${type} ${name}(${parameters})${throws}`,
      ];
    },

    visitAbstractMethodDeclaration: (node, visitor) => {

      const superVisitor = {...visitor, visitAbstractMethodDeclaration: DefaultJavaVisitor.visitAbstractMethodDeclaration};
      return `${render(node.signature, superVisitor)};\n`;
    },

    visitMethodCall: (node, visitor) => {

      const targetString = render(node.target, visitor);
      const methodString = render(node.methodName, visitor);
      const argumentsString = render(node.methodArguments, visitor);

      if (insideDeclaration && (node.target instanceof Java.MethodCall)) {
        const indentation = getIndentation(2);
        return `${targetString}\n${indentation}.${methodString}(${argumentsString})`;
      } else {
        return `${targetString}.${methodString}(${argumentsString})`;
      }
    },

    visitStatement: (node, visitor) => [
      node.child.visit(visitor),
      ';\n',
    ],

    // TODO: The "multiline" should be contextual and automatic in my opinion.
    //        There should be different methods:
    //        visitClassAnnotationList, visitFieldAnnotationList, visitMethodAnnotationList, visitArgumentAnnotationList
    visitAnnotationList: (node, visitor) => (node.children.map(it => render(it, visitor)).join(node.multiline ? '\n' : ' ')),

    visitAnnotation: (node, visitor) => {
      const pairs = node.pairs ? `(${render(node.pairs, visitor)})` : '';
      return (`@${render(node.type, visitor)}${pairs}`);
    },

    visitAnnotationKeyValuePairList: (node, visitor) => (node.children.map(it => render(it, visitor)).join(', ')),

    visitAnnotationKeyValuePair: (node, visitor) => {
      const key = node.key ? `${render(node.key, visitor)} = ` : '';
      return (`${key}${render(node.value, visitor)}`);
    },

    visitLiteral: node => {
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
    },

    visitFieldGetterSetter: (node, visitor) => {
      const content = join([
        node.field.visit(visitor),
        node.getter.visit(visitor),
        node.setter.visit(visitor),
      ]);

      return `${content}\n`;
    },

    visitField: (node, visitor) => {
      const comments = node.comments ? `${render(node.comments, visitor)}\n` : '';
      const annotations = node.annotations ? `${render(node.annotations, visitor)}\n` : '';
      let modifiers = render(node.modifiers, visitor);
      const typeName = render(node.type, visitor);
      const initializer = node.initializer ? ` = ${render(node.initializer, visitor)}` : '';
      const identifier = render(node.identifier, visitor);

      if (modifiers.length > 0) {
        modifiers += ' ';
      }

      return [
        comments,
        annotations,
        `${modifiers}${typeName} ${identifier}${initializer};\n`,
      ];
    },

    visitNewStatement: (node, visitor) => {
      const parameters = node.constructorArguments ? render(node.constructorArguments, visitor) : '';
      return `new ${render(node.type, visitor)}(${parameters})`;
    },

    visitThrowStatement: (node, visitor) => {
      const thrownExpression = render(node.expression, visitor);
      return `throw ${thrownExpression}`;
    },

    visitIdentifier: node => node.value,

    visitArgumentDeclaration: (node, visitor) => {
      // TODO: Make this simpler by allowing to "visit" between things,
      //  so we can insert spaces or delimiters without tinkering inside the base visitor
      const annotations = node.annotations ? `${render(node.annotations, visitor)} ` : '';
      const type = render(node.type, visitor);
      const identifier = render(node.identifier, visitor);

      return `${annotations}${type} ${identifier}`;
    },

    visitArgumentDeclarationList: (node, visitor) => {

      const listString = node.children.map(it => render(it, visitor)).join(', ');
      if (listString.length > 100) {
        // TODO: Make 100 an option
        const spaces = getIndentation(1);
        return `\n${spaces}${listString.replaceAll(/, /g, `,\n${spaces}`)}\n`;
      }

      return listString;
    },

    visitArgumentList: (node, visitor) => node.children.map(it => render(it, visitor)).join(', '),
    visitTypeList: (node, visitor) => node.children.map(it => render(it, visitor)).join(', '),

    visitRegularType: node => {
      const localName = node.getLocalName();
      if (localName) {
        // return `${localName} /*${OmniUtil.describe(node.omniType)}*/`;
        return localName;
      } else {
        throw new Error(`Local name must be set. Package name transformer not ran for ${OmniUtil.describe(node.omniType)}`);
      }
    },

    visitGenericType: (node, visitor) => {

      const baseTypeString = render(node.baseType, visitor);
      const genericArgumentStrings = node.genericArguments.map(it => render(it, visitor));

      if (genericArgumentStrings.length == 0) {

        // There is a possibility that the generic arguments have been filtered away by a transformer.
        // But it was never replaced with a RegularType. But we'll be nice and just render it as one.
        return `${baseTypeString}`;
      } else {
        return `${baseTypeString}<${genericArgumentStrings.join(', ')}>`;
      }
    },

    visitModifierList: (node, visitor) => {
      return node.children.map(it => render(it, visitor)).join(' ');
    },

    visitModifier: node => {
      const modifierString = getModifierString(node.type);
      if (modifierString) {
        return modifierString;
      }

      return undefined;
    },

    visitSuperConstructorCall: (node, visitor) => `super(${render(node.parameters, visitor)})`,
    visitIfStatement: (node, visitor) => `if (${render(node.predicate, visitor)}) {\n${render(node.body, visitor)}}\n`,

    visitPredicate(node, visitor) {

      if (node.right instanceof Java.Literal) {
        if (node.token.type == TokenType.EQUALS && node.right.value == true) {
          return render(node.left, visitor);
        } else if (node.token.type == TokenType.NOT_EQUALS && node.right.value == false) {
          return render(node.left, visitor);
        } else if (node.token.type == TokenType.EQUALS && node.right.value == false) {
          return `!${render(node.left, visitor)}`;
        } else if (node.token.type == TokenType.NOT_EQUALS && node.right.value == true) {
          return `!${render(node.left, visitor)}`;
        }
      }

      return visitor.visitBinaryExpression(node, visitor);
    },

    visitIfElseStatement: (node, visitor) => {

      const ifs = node.ifStatements.map(it => render(it, visitor));
      const el = node.elseBlock ? ` else {\n${render(node.elseBlock, visitor)}}\n` : '';

      return `${ifs.join('else ').trim()}${el}`;
    },

    visitTernaryExpression: (node, visitor) => {

      const condition = render(node.predicate, visitor);
      const passing = render(node.passing, visitor);
      const failing = render(node.failing, visitor);

      return `((${condition}) ? ${passing} : ${failing})`;
    },

    visitRuntimeTypeMapping: (node, visitor) => [
      ...node.fields.map(it => render(it, visitor)),
      ...node.getters.map(it => render(it, visitor)),
      ...node.methods.map(it => render(it, visitor)),
    ],
    visitClassName: (node, visitor) => `${render(node.type, visitor)}`,
    visitClassReference: (node, visitor) => `${render(node.className, visitor)}.class`,

    visitArrayInitializer: (node, visitor) => {

      // TODO: This needs to support multiple levels. Right now it only supports one. Or is that up to end-user to add blocks?
      const entries = node.children.map(it => render(it, visitor));
      const indentation = getIndentation(1);
      return `{\n${indentation}${entries.join(',\n' + indentation)}\n}`;
    },

    visitStaticMemberReference: (node, visitor) => `${render(node.target, visitor)}.${render(node.member, visitor)}`,
    visitCast: (node, visitor) => `((${render(node.toType, visitor)}) ${render(node.expression, visitor)})`,
    visitFreeText: node => node.text,
    visitFreeTextHeader: (node, visitor) => `<h${node.level}>${join(visitor.visitFreeTextGlobal(node.child, visitor, it => it))}</h${node.level}>\n`,
    visitFreeTextParagraph: (node, visitor) => `<p>${join(visitor.visitFreeTextGlobal(node.child, visitor, it => it))}</p>\n`,

    visitFreeTextSection: (node, visitor) => {
      const indentation = getIndentation(1);
      const header = render(node.header, visitor);
      const content = join(visitor.visitFreeTextGlobal(node.content, visitor, it => it));
      const blockContent = `${header}${content.trim()}`;

      const indentedBlock = blockContent.replace(patternLineStart, indentation);

      return `<section>\n${indentedBlock}\n</section>\n`;
    },

    visitFreeTextLine: (node, visitor) => `${join(visitor.visitFreeTextGlobal(node.child, visitor, it => it))}\n`,
    visitFreeTextIndent: (node, visitor) => {
      const indentation = getIndentation(1);
      const blockContent = join(visitor.visitFreeTextGlobal(node.child, visitor, it => it));
      return blockContent.replace(patternLineStart, indentation);
    },

    // TODO: Do we not need a way to say here that "we want the type without the generics"?
    //  Or do we need to specify on creation?
    visitFreeTextTypeLink: (node, visitor) => `{@link ${render(node.type, visitor)}}`,
    visitFreeTextMethodLink: (node, visitor) => `{@link ${render(node.type, visitor)}#${render(node.method.identifier, visitor)}}`,
    visitFreeTextPropertyLink: (node, visitor) => {

      const targetName = node.property.fieldName || node.property.propertyName || node.property.name;
      return `{@link ${render(node.type, visitor)}#${targetName}}`;
    },
  };
};
