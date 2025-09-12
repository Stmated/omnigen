import {OmniTypeKind, PackageOptions, Renderer, TargetOptions} from '@omnigen/api';
import {TypeScriptOptions} from '../options';
import {createTypeScriptVisitor, TypeScriptVisitor} from '../visit';
import {OmniUtil} from '@omnigen/core';
import {Code, CodeRenderContext, CodeRendererOptions, CodeUtil, createCodeRenderer, DefaultCodeRendererOptions, FreeTextUtils, render} from '@omnigen/target-code';
import {Ts} from '../ast';
import {CommentKind} from '@omnigen/target-code/ast';

export type TypeScriptRenderer = TypeScriptVisitor<string> & Renderer;

export const DefaultTypeScriptRendererOptions: CodeRendererOptions = {
  ...DefaultCodeRendererOptions,
  fileExtension: 'ts',
};

export const createTypeScriptRenderer = (root: Ts.TsRootNode, options: PackageOptions & TargetOptions & TypeScriptOptions): TypeScriptRenderer => {

  let bodyDepth = 0;

  const ctx: CodeRenderContext = {
    objectDecStack: [],
    units: [],
  };

  const parentRenderer = {
    ...createTypeScriptVisitor(),
    ...createCodeRenderer(root, options, DefaultTypeScriptRendererOptions, ctx),
  } satisfies TypeScriptVisitor<string>;

  return {
    ...parentRenderer,

    visitObjectDeclarationBody: (node, visitor) => {

      try {
        bodyDepth++;
        return parentRenderer.visitObjectDeclarationBody(node, visitor);
      } finally {
        bodyDepth--;
      }
    },

    visitEnumItemList: (n, v) => `${n.children.map(it => render(it, v)).join(',\n')},\n`,
    visitEnumItem: (n, v) => {

      const comment = n.comment ? `${render(n.comment, v)}\n` : '';
      const key = render(n.identifier, v);
      const value = render(n.value, v);
      return [
        comment,
        `${key} = ${value}`,
      ];
    },

    visitInterfaceDeclaration: (n, v) => {

      if (n.inline) {

        const bodyString = `${n.body.visit(v)}`.trim();
        return `{ ${bodyString} }`;

      } else {
        return parentRenderer.visitInterfaceDeclaration(n, v);
      }
    },

    visitField: (n, v) => {

      const renderedComments = n.comments ? `${render(n.comments, v)}\n` : '';
      const annotations = n.annotations ? `${render(n.annotations, v)}\n` : '';
      const modifiers = render(n.modifiers, v);
      const typeName = render(n.type, v);
      const initializer = n.initializer ? ` = ${render(n.initializer, v)}` : '';
      const identifier = render(n.identifier, v);

      const isOptional = (n.property && !n.property.required);
      const isPatternName = (n.property && OmniUtil.isPatternPropertyName(n.property.name));

      const optional = (isOptional && !isPatternName) ? '?' : '';
      let key: string;
      if (n.property && isPatternName) {

        const pattern = OmniUtil.getPropertyNamePattern(n.property.name);

        let keyComment = '';
        if (pattern && pattern !== '.*') {
          keyComment = ` /* Pattern: "${pattern}" */`;
        }

        key = `[key: string${keyComment}]`;
      } else {
        key = identifier;
      }

      return [
        renderedComments,
        annotations,
        `${modifiers ? `${modifiers} ` : ''}${key}${optional}: ${typeName}${initializer};\n`,
      ];
    },

    visitParameter: (node, visitor) => {

      const annotations = node.annotations ? `${node.annotations.visit(visitor)} ` : '';
      const type = node.type.visit(visitor);
      const identifier = node.identifier.visit(visitor);

      return `${annotations}${identifier}: ${type}`;
    },

    visitMethodDeclarationSignature: (n, v) => {
      const comments = n.comments ? `${n.comments.visit(v)}\n` : '';
      const annotations = (n.annotations && n.annotations.children.length > 0) ? `${n.annotations.visit(v)}\n` : '';

      const modifiers = n.modifiers.visit(v);
      const type = (options.explicitReturns || options.preferInterfaces) ? `: ${render(n.type, v)}` : '';
      const name = n.identifier.visit(v);
      const parameters = n.parameters ? n.parameters.visit(v) : '';

      return [
        comments,
        annotations,
        `${modifiers} ${name}(${parameters})${type}`,
      ];
    },

    /**
     * Should perhaps be replaced by a TS-specific node
     */
    visitFieldBackedGetter: (n, v) => {
      const fieldId = root.resolveNodeRef(n.fieldRef).identifier;
      const identifier = n.getterName ?? fieldId;
      return `get ${identifier.value}() { return this.${fieldId.value}; }\n`;
    },

    /**
     * Should perhaps be replaced by a TS-specific node
     */
    visitFieldBackedSetter: (n, v) => {
      try {
        const field = root.resolveNodeRef(n.fieldRef);
        const type = render(field.type, v);
        return `set ${field.identifier.value}(value: ${type}) { this.${field.identifier.value} = value; }\n`;
      } catch (ex) {
        return `// FieldBackedSetter: ${ex} - ${n.identifier?.visit(v)} - ${n.comments?.visit(v)}\n`;
      }
    },

    visitGetter: (n, v) => {
      const comments = n.comments ? render(n.comments, v) : '';
      const signature = `${comments}${render(n.modifiers, v)} get ${n.identifier.visit(v)}()`;
      if (n.target) {
        return `${signature} { return ${n.target.visit(v)}; }\n`.trimStart();
      } else {
        return `${signature};\n`.trimStart();
      }
    },

    visitSetter: (n, v) => {
      return `${render(n.modifiers, v)} set ${render(n.identifier, v)}(value: ${render(n.targetType, v)}) { ${render(n.target, v)} = value; }\n`.trimStart();
    },

    visitPackage: () => undefined,
    visitImportStatement: n => {

      if (n.type instanceof Code.EdgeType) {
        const importName = n.type.getImportName();
        if (!importName) {
          throw new Error(`Import name is not set for '${OmniUtil.describe(n.type.omniType)}'`);
        }

        const parts = importName.split('/');
        const packageName = parts.slice(0, -1).join('/');
        const objectName = parts[parts.length - 1];
        const fileExt = options.importWithExtension ? `.${options.importWithExtension}` : '';
        const fileName = packageName ? `/${objectName}` : `${objectName}`;

        return `import { ${objectName} } from './${packageName}${fileName}${fileExt}';`;
      }

      return `// ERROR: How should ${OmniUtil.describe(n.type.omniType)} be imported?`;
    },

    visitModifier: (node, visitor) => {

      if (node.kind === Code.ModifierKind.PUBLIC) {

        if (bodyDepth === 0) {
          // TODO: Wrong -- used one way for making object declarations public, and another for members inside the objects -- need to separate them or make it context sensitive
          return 'export';
        }
      }

      if (node.kind === Code.ModifierKind.FINAL) {
        return 'readonly';
      }

      return parentRenderer.visitModifier(node, visitor);
    },

    visitConstructor: (n, v) => {
      const annotations = n.annotations ? `${render(n.annotations, v)}\n` : '';
      const body = n.body ? `${render(n.body, v)}` : '';
      const modifiers = n.modifiers.children.length > 0 ? `${render(n.modifiers, v)} ` : '';

      return `${annotations}${modifiers}constructor(${render(n.parameters, v)})${body}`;
    },

    visitEdgeType: (n, v) => {

      // TODO: These special cases should not be here, it should be in some other transformer (if really needed at all), or handled by TypeScriptObjectNameResolver.
      if (OmniUtil.isPrimitive(n.omniType)) {
        if (n.omniType.kind === OmniTypeKind.NULL) {
          return 'null';
        } else if (n.omniType.literal) {

          if (n.omniType.value === undefined) {
            if ('value' in n.omniType) {
              return 'undefined';
            } else {
              return 'void';
            }
          } else {
            return new Code.Literal(n.omniType.value, n.omniType.kind).visit(v);
          }
        }

        if (n.omniType.kind == OmniTypeKind.STRING) {
          return 'string';
        } else if (OmniUtil.isNumericType(n.omniType)) {
          return `number`;
        } else if (n.omniType.kind == OmniTypeKind.UNDEFINED) {
          return 'undefined';
        }
      }

      return parentRenderer.visitEdgeType(n, v);
    },

    visitArrayType: (n, v) => {

      const arrayTypeName = options.immutable ? 'ReadonlyArray' : 'Array';
      const itemText = render(n.itemTypeNode, v);
      const minLength = n.omniType.minLength ?? 0;
      const maxLength = n.omniType.maxLength ?? -1;
      if (minLength > 0) {

        const readonlyPrefix = options.immutable ? 'readonly ' : '';
        const prefixItemTexts: string[] = Array(minLength).fill(itemText);
        if (maxLength !== -1) {
          const suffixItemTexts: string[] = Array(maxLength - minLength).fill(`${itemText}?`);
          return `${readonlyPrefix}[${prefixItemTexts.join(', ')}, ${suffixItemTexts.join(', ')}]`;
        } else {
          return `${readonlyPrefix}[${prefixItemTexts.join(', ')}, ...${arrayTypeName}<${itemText}>]`;
        }
      }

      return `${arrayTypeName}<${itemText}>`;
    },

    visitCompositionType: (n, v) => {

      let separator: string;
      switch (n.omniType.kind) {
        case OmniTypeKind.INTERSECTION:
          separator = '&';
          break;
        case OmniTypeKind.EXCLUSIVE_UNION:
        case OmniTypeKind.UNION:
          // TODO: Maybe one day we can do magical exclusive or, as in: https://stackoverflow.com/questions/52836812/how-do-json-schemas-anyof-type-translate-to-typescript
          separator = '|';
          break;
        default:
          throw new Error(`Unsupported composition kind '${n.omniType.kind}' for TS composition node`);
      }

      return n.typeNodes
        .map(it => {

          const content = render(it, v);
          if (it instanceof Ts.CompositionType) {

            // If we have nested compositions, then we wrap with parenthesis to differentiate.
            return `(${content})`;
          } else {
            return content;
          }

        })
        .join(` ${separator} `);
    },

    visitTypeAliasDeclaration: (n, v) => {

      const modifiers = n.modifiers ? n.modifiers.visit(v) : `let`;
      let comments = n.comments ? `${n.comments.visit(v)}\n` : '';
      if (options.debug && n.omniType.debug) {

        const paragraph = new Code.FreeTexts(...OmniUtil.debugToStrings(n.omniType.debug, v => new Code.FreeTextLine(v)));
        const tempCommentNode = new Code.Comment(paragraph, CommentKind.MULTI);

        //const tempCommentNode = new Code.Comment(FreeTextUtils.fromFriendlyFreeText(n.omniType.debug), CommentKind.MULTI);
        comments += `${tempCommentNode.visit(v)}\n`;
      }
      return `${comments}${modifiers} type ${n.name.visit(v)} = ${n.of.visit(v)};\n`;
    },

    visitLiteral: (n, v) => {

      if (n.primitiveKind == OmniTypeKind.STRING && options.preferSingleQuoteStrings) {
        return `'${n.value}'`;
      } else if (OmniUtil.isNumericKind(n.primitiveKind)) {

        // Typescript does not have any notation-difference for integers or decimals, so we just output the number as-is.
        return (`${n.value}`);
      } else {
        return parentRenderer.visitLiteral(n, v);
      }
    },

    visitFreeTextCode: (n, v) => `\n@description <pre><code>${render(n.content, v)}</code></pre>`,
    visitFreeTextExample: (n, v) => `\n@example ${render(n.content, v)}`,

  };
};
