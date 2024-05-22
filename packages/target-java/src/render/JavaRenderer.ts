import {Renderer} from '@omnigen/core';
import * as Java from '../ast/JavaAst';
import {JavaOptions} from '../options';
import {LoggerFactory} from '@omnigen/core-log';
import {createJavaVisitor, JavaVisitor} from '../visit';
import {JavaUtil} from '../util';
import {CodeRenderContext, CodeRendererOptions, createCodeRenderer, render} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

export type JavaRenderer = JavaVisitor<string> & Renderer;

export const DefaultJavaRendererOptions: CodeRendererOptions = {
  fileExtension: 'java',
  blockPrefix: ' ',
};

export const createJavaRenderer = (root: Java.JavaAstRootNode, options: JavaOptions, renderOptions = DefaultJavaRendererOptions, ctxIn?: CodeRenderContext): JavaRenderer => {

  return {
    ...createJavaVisitor(),
    ...createCodeRenderer(root, options, renderOptions, ctxIn),

    visitWildcardType: n => {

      const unknownKind = n.omniType.unknownKind ?? options.unknownType;
      return JavaUtil.getUnknownTypeString(unknownKind, options);
    },

    visitGetterIdentifier: (n, v) => {

      const identifier = render(n.identifier, v);
      return `${JavaUtil.getGetterName(identifier, n.type.omniType)}`;
    },
    visitSetterIdentifier: (n, v) => {

      const identifier = render(n.identifier, v);
      return `${JavaUtil.getSetterName(identifier)}`;
    },
  };
};
