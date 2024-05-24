import {AstNode, AstVisitor, OmniArrayKind, OmniTypeKind, RenderedCompilationUnit, Renderer, VisitResult} from '@omnigen/core';
import {CodeOptions, CodeVisitor, createCodeVisitor} from '../';
import {LoggerFactory} from '@omnigen/core-log';
import {AbortVisitingWithResult, OmniUtil, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import * as Code from '../ast/CodeAst';
import {CodeRootAstNode} from '../ast/CodeRootAstNode.ts';

const logger = LoggerFactory.create(import.meta.url);

function getModifierString(type: Code.ModifierType): string {
  switch (type) {
    case Code.ModifierType.PUBLIC:
      return 'public';
    case Code.ModifierType.PRIVATE:
      return 'private';
    case Code.ModifierType.DEFAULT:
      return '';
    case Code.ModifierType.PROTECTED:
      return 'protected';
    case Code.ModifierType.FINAL:
      return 'final';
    case Code.ModifierType.STATIC:
      return 'static';
    case Code.ModifierType.ABSTRACT:
      return 'abstract';
    case Code.ModifierType.READONLY:
      return 'final';
    case Code.ModifierType.CONST:
      return 'final';
  }
}

function getTokenTypeString(type: Code.TokenKind): string {
  switch (type) {
    case Code.TokenKind.ASSIGN:
      return '=';
    case Code.TokenKind.EQUALS:
      return '==';
    case Code.TokenKind.NOT_EQUALS:
      return '!=';
    case Code.TokenKind.GT:
      return '>';
    case Code.TokenKind.LT:
      return '<';
    case Code.TokenKind.GTE:
      return '>=';
    case Code.TokenKind.LTE:
      return '<=';
    case Code.TokenKind.ADD:
      return '+';
    case Code.TokenKind.SUBTRACT:
      return '-';
    case Code.TokenKind.MULTIPLY:
      return '*';
    case Code.TokenKind.COMMA:
      return ',';
    case Code.TokenKind.OR:
      return '||';
    case Code.TokenKind.AND:
      return '&&';
    default:
      throw new Error('Unknown token type');
  }
}

export type CodeRenderer = CodeVisitor<string> & Renderer;

export const join = (result: VisitResult<string>): string => {
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

function renderListWithWrapping(children: AstNode[], visitor: CodeVisitor<string>): string {

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
  visitor: CodeVisitor<string>,
  node: Code.AbstractObjectDeclaration,
  typeString: string,
  objectDecStack: Code.AbstractObjectDeclaration[],
): VisitResult<string> => {

  try {

    objectDecStack.push(node);

    const modifiers = render(node.modifiers, visitor);
    const name = render(node.name, visitor);
    const genericsString = node.genericParameterList && node.genericParameterList.types.length > 0 ? render(node.genericParameterList, visitor) : '';
    const classExtension = node.extends ? ` extends ${render(node.extends, visitor)}` : '';
    const classImplementations = node.implements ? ` implements ${render(node.implements, visitor)}` : '';

    const typeDeclarationContent: VisitResult<string>[] = [];

    if (node.comments) {
      typeDeclarationContent.push(node.comments.visit(visitor));
      typeDeclarationContent.push('\n');
    }
    if (node.annotations) {
      typeDeclarationContent.push(node.annotations.visit(visitor));
      typeDeclarationContent.push('\n');
    }

    typeDeclarationContent.push(`${modifiers} ${typeString} ${name}${genericsString}${classExtension}${classImplementations}`);
    typeDeclarationContent.push(visitor.visitObjectDeclarationBody(node, visitor));
    typeDeclarationContent.push('\n');

    return typeDeclarationContent;
  } finally {
    objectDecStack.pop();
  }
};

const getIndentation = (d: number): string => {
  return '  '.repeat(d);
};

export interface CodeRendererOptions {
  fileExtension: string;
  blockPrefix?: string;
}

export const DefaultCodeRendererOptions: CodeRendererOptions = {
  fileExtension: 'unknown',
  blockPrefix: ' ',
};

export interface CodeRenderContext {
  insideDeclaration?: boolean;
  objectDecStack: Code.AbstractObjectDeclaration[];
  // TODO: Maybe change so that renderer either returns string OR the compilation unit.
  units: RenderedCompilationUnit[];
}

const patternLineStart = new RegExp(/(?<!$)^/mg);
const tokenPrefix = ' ';
const tokenSuffix = ' ';

export const createCodeRenderer = (root: CodeRootAstNode, options: CodeOptions, renderOptions = DefaultCodeRendererOptions, ctxIn?: CodeRenderContext): CodeRenderer => {

  const ctx: CodeRenderContext = ctxIn ?? {
    objectDecStack: [],
    units: [],
  };

  return {
    ...createCodeVisitor(),

    executeRender: (node, visitor) => {
      if (node === undefined) {
        return [];
      }

      ctx.units.length = 0;
      node.visit(visitor);
      return ctx.units;
    },

    visitFieldReference: (node, visitor) => {
      const resolved = root.resolveNodeRef(node);
      return `this.${render(resolved.identifier, visitor)}`;
    },

    visitDeclarationReference: (n, v) => {
      const resolved = root.resolveNodeRef(n);
      return `${render(resolved.identifier, v)}`;
    },

    /**
     * TODO: Should this be used together with the field reference above, so 'this.' is not hard coded
     */
    visitSelfReference: () => `this`,
    visitVariableDeclaration: (n, v) => {

      const constant = (n.constant) ? 'final ' : '';
      const type = (options.preferInferredType || !n.type) ? 'var ' : `${render(n.type, v)} `;
      const name = render(n.identifier, v);

      try {
        ctx.insideDeclaration = true;
        const initializer = n.initializer ? ` = ${render(n.initializer, v)}` : '';
        return `${constant}${type}${name}${initializer}`;
      } finally {
        ctx.insideDeclaration = false;
      }
    },

    visitReturnStatement: (n, v) => (`return ${render(n.expression, v)}`),
    visitToken: n => (`${tokenPrefix}${getTokenTypeString(n.type)}${tokenSuffix}`),

    visitConstructor: (n, v) => {
      const annotations = n.annotations ? `${render(n.annotations, v)}\n` : '';
      const body = n.body ? `${render(n.body, v)}` : '{}';
      const modifiers = n.modifiers.children.length > 0 ? `${render(n.modifiers, v)} ` : '';

      const owner = ctx.objectDecStack[ctx.objectDecStack.length - 1];
      const parameters = render(n.parameters, v);

      return `\n${annotations}${modifiers}${render(owner.name, v)}(${parameters})${body}\n`;
    },
    visitConstructorParameterList: (n, v) => renderListWithWrapping(n.children, v),
    visitConstructorParameter: (n, v) => v.visitParameter(n, v),

    visitBlock: (n, visitor) => {
      const indentation = getIndentation(1);
      const blockContent = join(n.children.map(it => it.visit(visitor))).trim();

      const indentedContent = blockContent.replace(patternLineStart, indentation);
      if (n.enclosed) {
        if (n.compact) {
          return `{ ${indentedContent.trim()} }`;
        } else {
          return `${renderOptions.blockPrefix ?? ''}{\n${indentedContent}\n}\n`;
        }
      } else {
        return `${indentedContent}\n`;
      }
    },

    visitClassDeclaration: (n, v) => visitCommonTypeDeclaration(v, n, 'class', ctx.objectDecStack),
    visitInterfaceDeclaration: (n, v) => visitCommonTypeDeclaration(v, n, 'interface', ctx.objectDecStack),
    visitEnumDeclaration: (n, v) => visitCommonTypeDeclaration(v, n, 'enum', ctx.objectDecStack),

    visitGenericTypeDeclaration(n, v) {

      let str = render(n.name, v);
      if (n.upperBounds) {
        str += ` extends ${render(n.upperBounds, v)}`;
      }

      if (n.lowerBounds) {
        str += ` super ${render(n.lowerBounds, v)}`;
      }

      return str;
    },

    visitGenericTypeDeclarationList: (n, v) => {
      const genericTypes = n.types.map(it => render(it, v));
      return `<${genericTypes.join(', ')}>`;
    },

    visitComment: (n, v) => {

      if (n.kind === Code.CommentKind.SINGLE) {

        const commentContent = join(n.text.visit(v))
          .replaceAll('\r', '')
          .replaceAll('\n', '\n// ')
          .trim();

        return `// ${commentContent}`;

      } else if (n.kind === Code.CommentKind.DOC) {

        const text = join(n.text.visit(v))
          .trim()
          .replaceAll('\r', '')
          .replaceAll('\n', '\n * ');

        return `/**\n * ${text}\n */`;
      }

      const text = join(n.text.visit(v))
        .trim()
      ;

      return `/* ${text} */`;
    },

    visitCompilationUnit: (n, v) => {

      const content = join([
        n.packageDeclaration.visit(v),
        n.imports.visit(v),
        n.children.map(it => it.visit(v)),
      ]);

      let unitName: string | undefined = n.name;
      if (!unitName) {

        // NOTE: This is quite ugly. There needs to be a better way to figure out the name/fileName of the unit.
        const visitor = VisitorFactoryManager.create(root.createVisitor<string>(), {
          visitObjectDeclaration: objNode => {
            if (objNode.name.value) {
              throw new AbortVisitingWithResult(objNode.name.value);
            }
          },
        });

        unitName = VisitResultFlattener.visitWithSingularResult(visitor, n, '');

        if (!unitName) {
          unitName = n.children[0].name.value;
        }
      }

      // This was a top-level class/interface, so we will output it as a compilation unit.
      ctx.units.push({
        content: content,
        name: unitName,
        fileName: `${unitName}.${renderOptions.fileExtension}`,
        directories: n.packageDeclaration.fqn.split('.'),
        node: n,
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

      if (node.type instanceof Code.EdgeType) {

        const importName = node.type.getImportName();
        if (!importName) {
          throw new Error(`Import name is not set for '${OmniUtil.describe(node.type.omniType)}'`);
        }

        return `import ${importName};`;
      }

      return undefined;
    },

    visitImplementsDeclaration: (n, v) => render(n.types, v),
    visitExtendsDeclaration: (n, v) => render(n.types, v),

    visitEnumItem: (n, v) => {

      const comment = n.comment ? `${render(n.comment, v)}\n` : '';
      const key = render(n.identifier, v);
      const value = render(n.value, v);
      return [
        comment,
        `${key}(${value})`,
      ];
    },

    visitEnumItemList: (node, visitor) => `${node.children.map(it => render(it, visitor)).join(',\n')};\n`,

    visitMethodDeclaration: (n, v) => {
      const signature = render(n.signature, v);
      const body = n.body ? render(n.body, v) : '';

      return [
        `${signature}`,
        body,
        '\n',
      ];
    },

    visitMethodDeclarationSignature: (n, v) => {
      const comments = n.comments ? `${render(n.comments, v)}\n` : '';
      const annotations = (n.annotations && n.annotations.children.length > 0) ? `${render(n.annotations, v)}\n` : '';
      const modifiers = n.modifiers.children.length > 0 ? `${render(n.modifiers, v)} ` : '';
      const type = render(n.type, v);
      const name = render(n.identifier, v);
      const parameters = n.parameters ? render(n.parameters, v) : '';
      const throws = n.throws ? ` throws ${render(n.throws, v)}` : '';

      return [
        comments,
        annotations,
        `${modifiers}${type} ${name}(${parameters})${throws}`,
      ];
    },

    visitAbstractMethodDeclaration: (n, v) => {
      return [n.signature.visit(v), ';\n'];
    },

    visitMethodCall: (n, v) => {

      const targetString = render(n.target, v);
      const argumentsString = render(n.methodArguments, v);
      return `${targetString}(${argumentsString})`;
    },

    visitStatement: (n, v) => [
      n.child.visit(v),
      ';\n',
    ],

    // TODO: The "multiline" should be contextual and automatic
    //        There should be different methods:
    //        visitClassAnnotationList, visitFieldAnnotationList, visitMethodAnnotationList, visitParameterAnnotationList
    visitAnnotationList: (n, v) => (n.children.map(it => render(it, v)).join(n.multiline ? '\n' : ' ')),

    visitAnnotation: (n, visitor) => {
      const pairs = n.pairs ? `(${render(n.pairs, visitor)})` : '';
      return (`@${render(n.type, visitor)}${pairs}`);
    },

    visitAnnotationKeyValuePairList: (n, v) => (n.children.map(it => render(it, v)).join(', ')),
    visitAnnotationKeyValuePair: (n, v) => {
      const key = n.key ? `${render(n.key, v)} = ` : '';
      return (`${key}${render(n.value, v)}`);
    },

    visitVirtualAnnotationNode: n => `[General annotation node ${JSON.stringify(n.value)} must be replaced with something target-specific or be removed]`,

    visitLiteral: n => {
      if (typeof n.value === 'string') {
        return (`"${n.value}"`);
      } else if (typeof n.value == 'boolean') {
        return (`${n.value ? 'true' : 'false'}`);
      } else if (n.value === null) {
        return (`null`);
      } else {
        if (n.primitiveKind !== undefined) {
          if (n.primitiveKind == OmniTypeKind.DOUBLE) {
            return (`${n.value}d`);
          } else if (n.primitiveKind == OmniTypeKind.FLOAT) {
            return (`${n.value}f`);
          } else if (n.primitiveKind == OmniTypeKind.LONG) {
            return (`${n.value}L`);
          } else if (n.primitiveKind == OmniTypeKind.INTEGER) {
            return (`${n.value}`);
          } else if (n.primitiveKind == OmniTypeKind.NUMBER) {
            // If the type is just 'number' we will have to hope type inference is good enough.
          }
        }
        return (`${n.value}`);
      }
    },

    visitField: (n, v) => {
      const comments = n.comments ? `${render(n.comments, v)}\n` : '';
      const annotations = n.annotations ? `${render(n.annotations, v)}\n` : '';
      const modifiers = n.modifiers.children.length > 0 ? `${render(n.modifiers, v)} ` : '';
      const typeName = render(n.type, v);
      const initializer = n.initializer ? ` = ${render(n.initializer, v)}` : '';
      const identifier = render(n.identifier, v);

      return [
        comments,
        annotations,
        `${modifiers}${typeName} ${identifier}${initializer};\n`,
      ];
    },

    visitNewStatement: (n, v) => {
      const parameters = n.constructorArguments ? render(n.constructorArguments, v) : '';
      return `new ${render(n.type, v)}(${parameters})`;
    },

    visitThrowStatement: (n, v) => {
      const thrownExpression = render(n.expression, v);
      return `throw ${thrownExpression}`;
    },

    visitIdentifier: n => n.value,
    visitGetterIdentifier: (n, v) => n.identifier.visit(v),
    visitSetterIdentifier: (n, v) => n.identifier.visit(v),

    visitParameter: (n, v) => {

      const annotations = n.annotations ? `${render(n.annotations, v)} ` : '';
      const type = render(n.type, v);
      const identifier = render(n.identifier, v);

      return `${annotations}${type} ${identifier}`;
    },

    visitParameterList: (n, v) => renderListWithWrapping(n.children, v),

    visitArgumentList: (n, v) => n.children.map(it => render(it, v)).join(', '),
    visitTypeList: (n, v) => n.children.map(it => render(it, v)).join(', '),

    visitEdgeType: n => {
      const localName = n.getLocalName();
      if (localName) {
        return localName;
      } else {
        const path = ctx.objectDecStack.map(it => it.name.value).join(' -> ');
        throw new Error(`Local name must be set. Package name transformer not ran for ${OmniUtil.describe(n.omniType)} inside ${path}`);
      }
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
        const genericArgumentsString = genericArgumentStrings.join(', ');
        return `${baseTypeString}<${genericArgumentsString}>`;
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

    visitSuperConstructorCall: (node, visitor) => `super(${render(node.arguments, visitor)})`,
    visitIfStatement: (node, visitor) => `if (${render(node.predicate, visitor)})${render(node.body, visitor)}`,

    visitPredicate(node, visitor) {

      if (node.right instanceof Code.Literal) {
        if (node.token.type == Code.TokenKind.EQUALS && node.right.value == true) {
          return render(node.left, visitor);
        } else if (node.token.type == Code.TokenKind.NOT_EQUALS && node.right.value == false) {
          return render(node.left, visitor);
        } else if (node.token.type == Code.TokenKind.EQUALS && node.right.value == false) {
          return `!${render(node.left, visitor)}`;
        } else if (node.token.type == Code.TokenKind.NOT_EQUALS && node.right.value == true) {
          return `!${render(node.left, visitor)}`;
        }
      }

      return visitor.visitBinaryExpression(node, visitor);
    },

    visitIfElseStatement: (node, visitor) => {

      const ifs = node.ifStatements.map(it => render(it, visitor));
      const el = node.elseBlock ? ` else ${render(node.elseBlock, visitor)}` : '';

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
    visitFreeTextParagraph: (node, visitor) => `\n<p>${join(node.child.visit(visitor))}</p>\n`,
    visitFreeTextRemark: (node, visitor) => `${join(node.content.visit(visitor))}`,

    visitFreeTextSection: (node, visitor) => {
      const indentation = getIndentation(1);
      const header = render(node.header, visitor);
      const content = join(node.content.visit(visitor));
      const blockContent = `${header}${content.trim()}`;

      const indentedBlock = blockContent.replace(patternLineStart, indentation);

      return `<section>${indentedBlock}\n</section>\n`;
    },

    visitFreeTextLine: (node, visitor) => `${join(node.child.visit(visitor))}\n`,
    visitFreeTextIndent: (node, visitor) => {
      const indentation = getIndentation(1);
      const blockContent = join(node.child.visit(visitor));
      return blockContent.replace(patternLineStart, indentation);
    },

    // TODO: Do we not need a way to say here that "we want the type without the generics"? Or do we need to specify on creation?
    // TODO: Simplify this -- remove the conditional; just render the member as is given. Up to creator to give valid form.
    visitFreeTextTypeLink: (node, visitor) => `{@link ${render(node.type, visitor)}}`,
    visitFreeTextMemberLink: (node, visitor) => {

      if ('identifier' in node.member && node.member.identifier instanceof Code.Identifier) {
        return `{@link ${render(node.type, visitor)}#${render(node.member.identifier, visitor)}}`;
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
    visitFreeTextCode: (n, v) => `{@code ${render(n.content, v)}}`,
    visitFreeTextExample: (n, v) => `{@code ${render(n.content, v)}}`,
    visitFreeTextSummary: (n, v) => `${render(n.content, v)}`,
    visitFreeTextSee: (n, v) => {
      const description = n.description ? ` ${render(n.description, v)}` : '';
      return `@see ${render(n.target, v)}${description}`;
    },

    visitNamespace: (n, v) => {
      return `package ${join(n.name.visit(v))};\n${join(n.block.visit(v))}`;
    },
    visitNamespaceBlock: (n, v) => n.block.children.map(it => it.visit(v)),

    visitDelegate: () => {
      throw new Error(`Should have been replaced with a generic type`);
    },
    visitDelegateCall: () => {
      throw new Error(`Should have been replaced with a method call`);
    },

    visitMemberAccess: (n, v) => `${n.owner.visit(v)}.${n.member.visit(v)}`,
  };
};
