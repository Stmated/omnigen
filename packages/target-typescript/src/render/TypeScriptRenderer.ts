import {OmniTypeKind, PackageOptions, Renderer, TargetOptions, UnknownKind} from '@omnigen/core';
import {TypeScriptOptions} from '../options';
import {createTypeScriptVisitor, TypeScriptVisitor} from '../visit';
import {OmniUtil} from '@omnigen/core-util';
import {Code, CodeRendererOptions, createCodeRenderer, DefaultCodeRendererOptions, render} from '@omnigen/target-code';
import {Ts} from '../ast';

export type TypeScriptRenderer = TypeScriptVisitor<string> & Renderer;

export const DefaultTypeScriptRendererOptions: CodeRendererOptions = {
  ...DefaultCodeRendererOptions,
  fileExtension: 'ts',
};

// TODO:
//  * extend modifiers so there is 'export' to differentiate it from 'public'

export const createTypeScriptRenderer = (root: Ts.TsRootNode, options: PackageOptions & TargetOptions & TypeScriptOptions): TypeScriptRenderer => {

  let bodyDepth = 0;

  const parentRenderer = {
    ...createTypeScriptVisitor(),
    ...createCodeRenderer(root, options, DefaultTypeScriptRendererOptions),
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

    visitField: (node, visitor) => {

      const comments = node.comments ? `${render(node.comments, visitor)}\n` : '';
      const annotations = node.annotations ? `${render(node.annotations, visitor)}\n` : '';
      const modifiers = render(node.modifiers, visitor);
      const typeName = render(node.type, visitor);
      const initializer = node.initializer ? ` = ${render(node.initializer, visitor)}` : '';
      const identifier = render(node.identifier, visitor);

      const isOptional = (node.property && !node.property.required);
      const isPatternName = (node.property && OmniUtil.isPatternPropertyName(node.property.name));

      const optional = (isOptional && !isPatternName) ? '?' : '';
      let key: string;
      if (node.property && isPatternName) {

        const pattern = OmniUtil.getPropertyNamePattern(node.property.name);

        let keyComment = '';
        if (pattern) {
          keyComment = ` /* Pattern: "${pattern}" */`;
        }

        key = `[key: string${keyComment}]`;
      } else {
        key = identifier;
      }

      return [
        comments,
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
      const field = root.resolveNodeRef(n.fieldRef);
      return `get ${field.identifier.value}() { return this.${field.identifier.value}; }\n`;
    },

    /**
     * Should perhaps be replaced by a TS-specific node
     */
    visitFieldBackedSetter: (n, v) => {
      const field = root.resolveNodeRef(n.fieldRef);
      const type = render(field.type, v);
      return `set ${field.identifier.value}(value: ${type}) { this.${field.identifier.value} = value; }\n`;
    },

    visitGetter: (n, v) => {
      return `${render(n.modifiers, v)} get ${n.identifier.visit(v)}() { return ${n.target.visit(v)}; }\n`.trimStart();
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

      if (bodyDepth == 0 && node.type == Code.ModifierType.PUBLIC) {

        // TODO: Wrong -- used one way for making object declarations public, and another for members inside the objects -- need to separate them or make it context sensitive
        return 'export';
      }

      if (node.type == Code.ModifierType.FINAL) {
        return 'readonly';
      }

      return parentRenderer.visitModifier(node, visitor);
    },

    visitConstructor: (n, v) => {
      const annotations = n.annotations ? `${render(n.annotations, v)}\n` : '';
      const body = n.body ? `${render(n.body, v)}` : '';
      const modifiers = n.modifiers.children.length > 0 ? `${render(n.modifiers, v)} ` : '';

      return `\n${annotations}${modifiers}constructor(${render(n.parameters, v)})${body}\n`;
    },

    visitEdgeType: (n, v) => {

      if (OmniUtil.isPrimitive(n.omniType)) {
        if (n.omniType.literal) {

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

      const arrayTypeName = options.immutableModels ? 'ReadonlyArray' : 'Array';
      const itemText = render(n.of, v);
      const minLength = n.omniType.minLength ?? 0;
      const maxLength = n.omniType.maxLength ?? -1;
      if (minLength > 0) {

        const readonlyPrefix = options.immutableModels ? 'readonly ' : '';
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

    visitWildcardType: (n, v) => {

      if (n.omniType.kind == OmniTypeKind.UNKNOWN) {
        if (n.omniType.unknownKind == UnknownKind.WILDCARD) {
          return 'unknown';
        }
        if (n.omniType.unknownKind == UnknownKind.MUTABLE_OBJECT) {
          return `Record<string, any>`;
        }
        if (n.omniType.unknownKind == UnknownKind.OBJECT) {
          return 'object';
        }

        return 'any';
      }

      return parentRenderer.visitWildcardType(n, v);
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

      return n.typeNodes.map(it => render(it, v)).join(` ${separator} `);
    },

    visitTypeAliasDeclaration: (n, v) => {

      const modifiers = n.modifiers ? n.modifiers.visit(v) : `let`;

      return `${modifiers} type ${n.name.visit(v)} = ${n.of.visit(v)};\n`;
    },

    visitLiteral: (n, v) => {

      if (n.primitiveKind == OmniTypeKind.STRING && options.preferSingleQuoteStrings) {
        return `'${n.value}'`;
      } else {
        return parentRenderer.visitLiteral(n, v);
      }
    },
  };
};
