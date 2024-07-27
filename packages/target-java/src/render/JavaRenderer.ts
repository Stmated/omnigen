import {Renderer, TargetOptions} from '@omnigen/core';
import * as Java from '../ast/JavaAst';
import {JavaOptions} from '../options';
import {LoggerFactory} from '@omnigen/core-log';
import {createJavaVisitor, JavaVisitor} from '../visit';
import {JavaUtil} from '../util';
import {CodeRenderContext, CodeRendererOptions, createCodeRenderer, DefaultCodeRendererOptions, render} from '@omnigen/target-code';
import {ToHardCodedTypeJavaAstTransformer} from '../transform';

const logger = LoggerFactory.create(import.meta.url);

export type JavaRenderer = JavaVisitor<string> & Renderer;

export const DefaultJavaRendererOptions: CodeRendererOptions = {
  ...DefaultCodeRendererOptions,
  fileExtension: 'java',
  blockPrefix: ' ',
  indent: '  ',
};

export const createJavaRenderer = (root: Java.JavaAstRootNode, options: TargetOptions & JavaOptions, renderOptions = DefaultJavaRendererOptions, ctxIn?: CodeRenderContext): JavaRenderer => {

  return {
    ...createJavaVisitor(),
    ...createCodeRenderer(root, options, renderOptions, ctxIn),

    visitWildcardType: (n, v) => {

      // Likely never called since it is replaced by `ToHardCodedTypeJavaAstTransformer`.
      const unknownKind = n.omniType.unknownKind ?? options.unknownType;
      const unknownTypeNode = ToHardCodedTypeJavaAstTransformer.getUnknownClassName(unknownKind, n.implementation, root.getAstUtils());

      return unknownTypeNode.visit(v);
    },

    visitGetterIdentifier: (n, v) => {

      const identifier = render(n.identifier, v);
      return options.debug
        ? `/*g!-${n.identifier.value}-${n.identifier.original}*/${JavaUtil.getGetterName(identifier, n.type)}`
        : JavaUtil.getGetterName(identifier, n.type);
    },
    visitSetterIdentifier: (n, v) => {

      const identifier = render(n.identifier, v);
      return options.debug
        ? `/*s!-${n.identifier.value}-${n.identifier.original}*/${JavaUtil.getSetterName(identifier)}`
        : JavaUtil.getSetterName(identifier);
    },

    visitFreeTextRemark: (node, visitor) => `\n<p>\n${render(node.content, visitor)}`,
  };
};
