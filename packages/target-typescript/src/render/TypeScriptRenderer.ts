import {CompositionKind, OmniTypeKind, PackageOptions, Renderer, TargetOptions, UnknownKind} from '@omnigen/core';
import {TypeScriptOptions} from '../options';
import {createTypeScriptVisitor, TypeScriptVisitor} from '../visit';
import {createJavaRenderer, Java, JavaOptions, JavaRendererOptions, JavaUtil} from '@omnigen/target-java';
import {OmniUtil} from '@omnigen/core-util';

export type TypeScriptRenderer = TypeScriptVisitor<string> & Renderer;

export const DefaultTypeScriptRendererOptions: JavaRendererOptions = {
  fileExtension: 'ts',
};

// TODO:
//  * extend modifiers so there is 'export' to differentiate it from 'public'

export const createTypeScriptRenderer = (options: PackageOptions & TargetOptions & JavaOptions & TypeScriptOptions): TypeScriptRenderer => {

  let bodyDepth = 0;

  const parentRenderer = {
    ...createTypeScriptVisitor(),
    ...createJavaRenderer(options, DefaultTypeScriptRendererOptions),
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

    visitField: (node, visitor) => {

      const comments = node.comments ? `${node.comments.visit(visitor)}\n` : '';
      const annotations = node.annotations ? `${node.annotations.visit(visitor)}\n` : '';
      const modifiers = node.modifiers.visit(visitor);
      const typeName = node.type.visit(visitor);
      const initializer = node.initializer ? ` = ${node.initializer.visit(visitor)}` : '';
      const identifier = node.identifier.visit(visitor);

      return [
        comments,
        annotations,
        `${modifiers ? `${modifiers} ` : ''}${identifier}: ${typeName}${initializer};\n`,
      ];
    },

    visitParameter: (node, visitor) => {

      const annotations = node.annotations ? `${node.annotations.visit(visitor)} ` : '';
      const type = node.type.visit(visitor);
      const identifier = node.identifier.visit(visitor);

      return `${annotations}${identifier}: ${type}`;
    },

    visitMethodDeclarationSignature: (node, visitor) => {
      const comments = node.comments ? `${node.comments.visit(visitor)}\n` : '';
      const annotations = (node.annotations && node.annotations.children.length > 0) ? `${node.annotations.visit(visitor)}\n` : '';

      const actualModifiers = node.modifiers.children
        .map(it => it.type);

      const modifiers = node.modifiers.visit(visitor);
      const type = node.type.visit(visitor);
      const name = node.identifier.visit(visitor);
      const parameters = node.parameters ? node.parameters.visit(visitor) : '';

      // TODO: Add "throws" as comment? How do we make this more genralized?
      const throws = node.throws ? ` throws ${node.throws.visit(visitor)}` : '';

      // ${throws}

      return [
        comments,
        annotations,
        `${modifiers} ${name}(${parameters}): ${type}`,
      ];
    },

    visitPackage: () => undefined,
    visitImportStatement: (node, visitor) => {

      // TODO: This is all wrong, but just done this way as a starter
      const importName = node.type.getImportName();
      if (!importName) {
        throw new Error(`Import name is not set for '${OmniUtil.describe(node.type.omniType)}'`);
      }

      const parts = importName.split('.');
      const packageName = parts.slice(0, -1).join('/');

      return `import {${parts[parts.length - 1]}} from '${packageName}';`;
    },

    visitModifier: (node, visitor) => {

      if (bodyDepth == 0 && node.type == Java.ModifierType.PUBLIC) {

        // TODO: Wrong -- used one way for making object declarations public, and another for members inside the objects -- need to separate them or make it context sensitive
        return 'export';
      }

      if (node.type == Java.ModifierType.FINAL) {
        return 'readonly';
      }

      return parentRenderer.visitModifier(node, visitor);
    },

    visitRegularType: (node, visitor) => {

      if (node.omniType.kind == OmniTypeKind.UNKNOWN) {
        if (node.omniType.unknownKind == UnknownKind.WILDCARD) {
          return 'unknown';
        }
        if (node.omniType.unknownKind == UnknownKind.MUTABLE_OBJECT) {
          return `Record<string, any>`;
        }
        if (node.omniType.unknownKind == UnknownKind.OBJECT) {
          return 'object';
        }

        return 'any';
      }

      if (node.omniType.kind == OmniTypeKind.COMPOSITION) {
        if (node.omniType.compositionKind == CompositionKind.XOR) {

          // TODO: This is wrong. We do not know if these are the actual names for the types. Must find the AST nodes for the types and get the local name from there!
          //        To be able to get those names as local, maybe we must add a new AST node that are for these composition types, so they can be properly represented!
          //        But maybe we want some to be inlined and some to not be?
          //        An option for "max length" or "max entries" of a composition before an alias node is created for a type? Then the alias is used.
          //        But same thing here, we must find that node so we can use it here instead.

          return node.omniType.types.map(it => JavaUtil.getName({type: it, options: options})).join(' | ');
        }
      }

      return parentRenderer.visitRegularType(node, visitor);
    },

    visitCompositionType: (n, v) => {

      let separator: string;
      switch (n.omniType.compositionKind) {
        case CompositionKind.AND:
          separator = '&';
          break;
        case CompositionKind.XOR:
          separator = '|';
          break;
        default:
          throw new Error(`Unsupported composition kind '${n.omniType.compositionKind} for TS composition node`);
      }

      return n.typeNodes.map(it => it.visit(v)).join(` ${separator} `);
    },

    visitTypeAliasDeclaration: (n, v) => {
      return `const type ${n.name.visit(v)} = ${n.of.visit(v)};\n`;
    },
  };
};
