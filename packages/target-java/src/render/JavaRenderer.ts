import {AstNode, AstVisitor, OmniArrayKind, OmniTypeKind, RenderedCompilationUnit, Renderer, UnknownKind, VisitResult} from '@omnigen/core';
import * as Java from '../ast';
import {DecoratingTypeNode, GenericTypeDeclarationList, JavaAstRootNode, TokenKind} from '../ast';
import {createJavaVisitor, DefaultJavaVisitor, JavaVisitor} from '../visit';
import {JavaOptions} from '../options';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '@omnigen/core-util';
import {JavaUtil} from '../util';

const logger = LoggerFactory.create(import.meta.url);

function getModifierString(type: Java.ModifierType): 'public' | 'private' | 'protected' | 'final' | 'static' | 'abstract' | '' {
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
    case Java.ModifierType.ABSTRACT:
      return 'abstract';
  }
}

function getTokenTypeString(type: Java.TokenKind): string {
  switch (type) {
    case Java.TokenKind.ASSIGN:
      return '=';
    case Java.TokenKind.EQUALS:
      return '==';
    case Java.TokenKind.NOT_EQUALS:
      return '!=';
    case Java.TokenKind.GT:
      return '>';
    case Java.TokenKind.LT:
      return '<';
    case Java.TokenKind.GTE:
      return '>=';
    case Java.TokenKind.LTE:
      return '<=';
    case Java.TokenKind.ADD:
      return '+';
    case Java.TokenKind.SUBTRACT:
      return '-';
    case Java.TokenKind.MULTIPLY:
      return '*';
    case Java.TokenKind.COMMA:
      return ',';
    case Java.TokenKind.OR:
      return '||';
    case Java.TokenKind.AND:
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

export const render = <N extends AstNode, V extends AstVisitor<string>>(node: N | undefined, visitor: V): string => {
  if (node === undefined) {
    return '';
  }

  return join(node.visit(visitor));
};

function renderListWithWrapping(children: AstNode[], visitor: JavaVisitor<string>): string {

  const listStrings = children.map(it => render(it, visitor));
  const joinedListString = listStrings.join(', ');

  // TODO: Make 100 an option
  if (joinedListString.length > 100) {

    const spaces = getIndentation(1);

    return `\n${spaces}${listStrings.join(`,\n${spaces}`)}\n`;
  }

  return joinedListString;
}

function replaceWithHtml(text: string | undefined): string {

  if (!text) {
    return '';
  }

  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

const visitCommonTypeDeclaration = (
  visitor: JavaVisitor<string>,
  node: Java.AbstractObjectDeclaration,
  typeString: string,
  objectDecStack: Java.AbstractObjectDeclaration[],
): VisitResult<string> => {

  try {

    objectDecStack.push(node);

    let generics: GenericTypeDeclarationList | undefined;
    if (node instanceof Java.ClassDeclaration) {
      generics = node.genericParameterList;
    }

    const modifiers = render(node.modifiers, visitor);
    const name = render(node.name, visitor);
    const genericsString = generics ? render(generics, visitor) : '';
    const classExtension = node.extends ? ` extends ${render(node.extends, visitor)}` : '';
    const classImplementations = node.implements ? ` implements ${render(node.implements, visitor)}` : '';

    const typeDeclarationContent: VisitResult<string>[] = [];

    // typeDeclarationContent.push(`// TYPE DEBUG: ${OmniUtil.describe(node.type.omniType)}\n`);

    if (node.comments) {
      typeDeclarationContent.push(node.comments.visit(visitor));
      typeDeclarationContent.push('\n');
    }
    if (node.annotations) {
      typeDeclarationContent.push(node.annotations.visit(visitor));
      typeDeclarationContent.push('\n');
    }

    typeDeclarationContent.push(`${modifiers} ${typeString} ${name}${genericsString}${classExtension}${classImplementations} {\n`);
    typeDeclarationContent.push(visitor.visitObjectDeclarationBody(node, visitor));
    typeDeclarationContent.push(('}\n'));

    return typeDeclarationContent;
  } finally {
    objectDecStack.pop();
  }
};

const getIndentation = (d: number): string => {
  return '  '.repeat(d);
};

export interface JavaRendererOptions {
  fileExtension: string;
}

export const DefaultJavaRendererOptions: JavaRendererOptions = {
  fileExtension: 'java',
};

export const createJavaRenderer = (root: JavaAstRootNode, options: JavaOptions, renderOptions = DefaultJavaRendererOptions): JavaRenderer => {

  let blockDepth = 0;
  let insideDeclaration = false;
  const patternLineStart = new RegExp(/(?<!$)^/mg);
  const tokenPrefix = ' ';
  const tokenSuffix = ' ';
  const objectDecStack: Java.AbstractObjectDeclaration[] = [];

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

    visitFieldReference: (node, visitor) => {

      const field = root.getNodeWithId<Java.Field>(node.targetId);
      return `this.${render(field.identifier, visitor)}`;
    },

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

      const owner = objectDecStack[objectDecStack.length - 1];

      return `\n${annotations}${modifiers}${render(owner.name, visitor)}(${render(node.parameters, visitor)}) {${body}}\n\n`;
    },
    visitConstructorParameterList: (node, visitor) => renderListWithWrapping(node.children, visitor),

    visitBlock: (node, visitor) => {
      blockDepth++;
      const indentation = getIndentation(1);
      const blockContent = join(node.children.map(it => it.visit(visitor))).trim();
      blockDepth--;

      return blockContent.replace(patternLineStart, indentation) + '\n';
    },

    visitClassDeclaration: (node, visitor) => visitCommonTypeDeclaration(visitor, node, 'class', objectDecStack),
    visitInterfaceDeclaration: (node, visitor) => visitCommonTypeDeclaration(visitor, node, 'interface', objectDecStack),
    visitEnumDeclaration: (node, visitor) => visitCommonTypeDeclaration(visitor, node, 'enum', objectDecStack),

    visitGenericTypeDeclaration(node, visitor) {

      let str = render(node.name, visitor);
      if (node.upperBounds) {
        str += ` extends ${render(node.upperBounds, visitor)}`;
      }

      if (node.lowerBounds) {
        str += ` super ${render(node.lowerBounds, visitor)}`;
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

      const text = join(node.text.visit(visitor))
        .trim()
        .replaceAll('\r', '')
        .replaceAll('\n', '\n * ');

      return `/**\n * ${text}\n */`;
    },

    visitComment: (node, visitor) => {

      const commentContent = join(node.text.visit(visitor))
        .replaceAll('\r', '')
        .replaceAll('\n', '\n// ')
        .trim();

      return `// ${commentContent}`;
    },

    visitCompilationUnit: (node, visitor) => {

      const content = join([
        node.packageDeclaration.visit(visitor),
        node.imports.visit(visitor),
        node.children.map(it => it.visit(visitor)),
      ]);

      // This was a top-level class/interface, so we will output it as a compilation unit.
      units.push({
        content: content,
        name: node.children[0].name.value,
        fileName: `${node.children[0].name.value}.${renderOptions.fileExtension}`,
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

      if (node.type instanceof Java.EdgeType) {

        const importName = node.type.getImportName();
        if (!importName) {
          throw new Error(`Import name is not set for '${OmniUtil.describe(node.type.omniType)}'`);
        }

        return `import ${importName};`;
      }

      return undefined;
    },

    visitImplementsDeclaration: (node, visitor) => render(node.types, visitor),

    visitEnumItem: (node, visitor) => {

      const comment = node.comment ? `${render(node.comment, visitor)}\n` : '';
      const key = render(node.identifier, visitor);
      const value = render(node.value, visitor);
      return [
        comment,
        `${key}(${value})`,
      ];
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
      const annotations = (node.annotations && node.annotations.children.length > 0) ? `${render(node.annotations, visitor)}\n` : '';
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
    //        visitClassAnnotationList, visitFieldAnnotationList, visitMethodAnnotationList, visitParameterAnnotationList
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
          if (node.primitiveKind == OmniTypeKind.DOUBLE) {
            return (`${node.value}d`);
          } else if (node.primitiveKind == OmniTypeKind.FLOAT) {
            return (`${node.value}f`);
          } else if (node.primitiveKind == OmniTypeKind.LONG) {
            return (`${node.value}L`);
          } else if (node.primitiveKind == OmniTypeKind.INTEGER) {
            return (`${node.value}`);
          } else if (node.primitiveKind == OmniTypeKind.NUMBER) {
            // If the type is just 'number' we will have to hope type inference is good enough.
          }
        }
        return (`${node.value}`);
      }
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

    visitParameter: (node, visitor) => {

      const annotations = node.annotations ? `${render(node.annotations, visitor)} ` : '';
      const type = render(node.type, visitor);
      const identifier = render(node.identifier, visitor);

      return `${annotations}${type} ${identifier}`;
    },

    visitParameterList: (node, visitor) => renderListWithWrapping(node.children, visitor),

    visitArgumentList: (node, visitor) => node.children.map(it => render(it, visitor)).join(', '),
    visitTypeList: (node, visitor) => node.children.map(it => render(it, visitor)).join(', '),

    visitEdgeType: node => {
      const localName = node.getLocalName();
      if (localName) {
        return localName;
      } else {
        const path = objectDecStack.map(it => it.name.value).join(' -> ');
        throw new Error(`Local name must be set. Package name transformer not ran for ${OmniUtil.describe(node.omniType)} inside ${path}`);
      }
    },

    visitWildcardType: n => {

      const unknownKind = n.omniType.unknownKind ?? options.unknownType;
      return JavaUtil.getUnknownTypeString(unknownKind, options);
    },

    visitBoundedType: (n, v) => {

      const baseString = render(n.type, v);

      if (n.upperBound) {
        return `${baseString} extends ${render(n.upperBound, v)}`;
      } else if (n.lowerBound) {
        return `${baseString} super ${render(n.lowerBound, v)}`;
      } else {
        return `${baseString}`;
      }
    },

    visitArrayType: (node, visitor) => {

      const baseTypeString = render(node.of, visitor);

      if (node.omniType.arrayKind == OmniArrayKind.SET) {
        return node.implementation ? `HashSet<${baseTypeString}>` : `Set<${baseTypeString}>`;
      } else if (node.omniType.arrayKind == OmniArrayKind.LIST) {
        return node.implementation ? `ArrayList<${baseTypeString}>` : `List<${baseTypeString}>`;
      }

      return `${baseTypeString}[]`;
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
        if (node.token.type == TokenKind.EQUALS && node.right.value == true) {
          return render(node.left, visitor);
        } else if (node.token.type == TokenKind.NOT_EQUALS && node.right.value == false) {
          return render(node.left, visitor);
        } else if (node.token.type == TokenKind.EQUALS && node.right.value == false) {
          return `!${render(node.left, visitor)}`;
        } else if (node.token.type == TokenKind.NOT_EQUALS && node.right.value == true) {
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

    visitClassName: (node, visitor) => `${render(node.type, visitor)}`,
    visitClassReference: (node, visitor) => `${render(node.className, visitor)}.class`,

    visitDecoratingTypeNode: (n, v) => {

      // All we do is delegate the rendering to our inner type node.
      return render(n.of, v);
    },

    visitArrayInitializer: (node, visitor) => {

      // TODO: This needs to support multiple levels. Right now it only supports one. Or is that up to end-user to add blocks?
      const entries = node.children.map(it => render(it, visitor));
      const indentation = getIndentation(1);
      return `{\n${indentation}${entries.join(',\n' + indentation)}\n}`;
    },

    visitStaticMemberReference: (node, visitor) => `${render(node.target, visitor)}.${render(node.member, visitor)}`,
    visitCast: (node, visitor) => `((${render(node.toType, visitor)}) ${render(node.expression, visitor)})`,
    visitFreeText: node => replaceWithHtml(node.text),
    visitFreeTextHeader: (node, visitor) => `\n<h${node.level}>${join(node.child.visit(visitor))}</h${node.level}>\n`,
    visitFreeTextParagraph: (node, visitor) => `<p>${join(node.child.visit(visitor))}</p>\n`,

    visitFreeTextSection: (node, visitor) => {
      const indentation = getIndentation(1);
      const header = render(node.header, visitor);
      const content = join(node.content.visit(visitor));
      const blockContent = `${header}${content.trim()}`;

      const indentedBlock = blockContent.replace(patternLineStart, indentation);

      return `<section>\n${indentedBlock}\n</section>\n`;
    },

    visitFreeTextLine: (node, visitor) => `${join(node.child.visit(visitor))}\n`,
    visitFreeTextIndent: (node, visitor) => {
      const indentation = getIndentation(1);
      const blockContent = join(node.child.visit(visitor));
      return blockContent.replace(patternLineStart, indentation);
    },

    // TODO: Do we not need a way to say here that "we want the type without the generics"?
    //  Or do we need to specify on creation?
    visitFreeTextTypeLink: (node, visitor) => `{@link ${render(node.type, visitor)}}`,
    visitFreeTextMethodLink: (node, visitor) => {

      if ('identifier' in node.method && node.method.identifier instanceof Java.Identifier) {
        return `{@link ${render(node.type, visitor)}#${render(node.method.identifier, visitor)}}`;
      } else {
        return `{@link ${render(node.type, visitor)}#???`;
      }
    },
    visitFreeTextPropertyLink: (node, visitor) => {

      const targetName = OmniUtil.getPropertyName(node.property.name, true);
      // .fieldName || node.property.propertyName || node.property.name;
      return `{@link ${render(node.type, visitor)}#${targetName}}`;
    },
    visitFreeTextList: (node, visitor) => {

      const tag = node.ordered ? 'ol' : 'ul';
      const indent = getIndentation(1);
      const lines = node.children.map(it => join(it.visit(visitor))).join(`</li>\n${indent}<li>`);

      return `<${tag}>\n${indent}<li>${lines}</li>\n</${tag}>`;
    },
  };
};
