import {OmniTypeKind, PackageOptions, Renderer, TargetOptions, UnknownKind, VisitResult} from '@omnigen/core';
import {CSharpOptions, ReadonlyPropertyMode} from '../options';
import {createCSharpVisitor, CSharpVisitor} from '../visit';
import {Code, CodeRenderContext, CodeRendererOptions, createCodeRenderer, join, render} from '@omnigen/target-code';
import {CSharpRootNode} from '../ast';
import {Case, OmniUtil} from '@omnigen/core-util';
import {CSharpUtil} from '../util/CSharpUtil.ts';

export type CSharpRenderer = CSharpVisitor<string> & Renderer;

export const DefaultCSharpRendererOptions: CodeRendererOptions = {
  fileExtension: 'cs',
  blockPrefix: '\n',
};

// TODO:
//  * Need a way to more easily differentiate a field modifier from a class and/or method modifier -- there should be more specific visitors for those, which call the more generic function

export interface CSharpRenderContext extends CodeRenderContext {
  fieldDepth: number;
}

export const createCSharpRenderer = (root: CSharpRootNode, options: PackageOptions & TargetOptions & CSharpOptions): CSharpRenderer => {

  let fieldDepth = 0;
  const ctx: CSharpRenderContext = {
    fieldDepth: 0,
    objectDecStack: [],
    units: [],
  };

  const parent = {
    ...createCSharpVisitor(),
    ...createCodeRenderer(root, options, DefaultCSharpRendererOptions, ctx),
  } satisfies CSharpVisitor<string>;

  return {
    ...parent,

    visitField: (n, v) => {
      try {
        fieldDepth++;
        return parent.visitField(n, v);
      } finally {
        fieldDepth--;
      }
    },

    /**
     * Perhaps remove "package" as a node, and instead only use "namespace" and then it is up to languages like Java not to indent the "namespace" body
     */
    visitPackage: (n, v) => {
      return '';
    },

    visitModifier: (n, v) => {

      switch (n.type) {
        case Code.ModifierType.FINAL: {
          if (fieldDepth > 0) {
            return 'readonly';
          } else {
            return 'sealed';
          }
        }
        case Code.ModifierType.CONST: {
          return 'const';
        }
      }

      return parent.visitModifier(n, v);
    },

    /**
     * TODO: Do this some other way once we have TypePath in place -- TypePath should have "fully qualified" and a "locally qualified" properties, which we can render differently.
     */
    visitImportStatement: (n, v) => {

      // if (n.type instanceof Java.TypePath)
      if (n.type instanceof Code.EdgeType) {

        const importName = n.type.getImportName();
        if (!importName) {
          throw new Error(`Import name is not set for '${OmniUtil.describe(n.type.omniType)}'`);
        }

        const lastDotIndex = importName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
          return `using ${importName.substring(0, lastDotIndex)};`;
        } else {
          return `using ${importName};`;
        }
      }

      return undefined;
    },

    visitProperty: (n, v) => {
      const type = n.type.visit(v);
      const modifiers = n.modifiers ? `${n.modifiers.visit(v)} ` : '';
      const getModifiers = n.getModifiers ? `${n.getModifiers.visit(v) || ''} ` : '';
      const setModifiers = n.setModifiers ? `${n.setModifiers.visit(v) || ''} ` : '';
      const comments = n.comments ? `${n.comments.visit(v)}\n` : '';

      let setter: string;
      if (n.immutable && options.csharpReadonlyPropertySetterMode === ReadonlyPropertyMode.INIT) {
        setter = 'init; ';
      } else if (n.immutable) {
        setter = '';
      } else {
        setter = `${setModifiers}set; `;
      }

      const initializer = n.initializer ? ` = ${n.initializer.visit(v)};` : '';

      return `${comments}${modifiers}${type} ${n.identifier.visit(v)} { ${getModifiers}get; ${setter}}${initializer}\n`;
    },
    // NOTE: Is the "Case.pascal" really needed here?
    visitPropertyIdentifier: (n, v) => Case.pascal(`${n.identifier.visit(v)}`),
    visitPropertyReference: (n, v) => {

      const property = n.resolve(root);
      return `this.${property.identifier.visit(v)}`;
    },

    visitNamespace: (n, v) => `namespace ${n.name.visit(v)}${n.block.visit(v)}`,
    visitNamespaceBlock: (n, v) => n.block.visit(v),

    visitClassDeclaration: (n, v) => {
      try {
        ctx.objectDecStack.push(n);
        const modifiers = render(n.modifiers, v);
        const name = render(n.name, v);
        const genericsString = n.genericParameterList?.types.length ? render(n.genericParameterList, v) : '';
        const classExtension = n.extends ? `${render(n.extends, v)}` : '';
        const classImplementations = n.implements ? `${render(n.implements, v)}` : '';

        let superTypes = '';
        if (classExtension) {
          superTypes += classExtension;
        }
        if (classImplementations) {
          if (superTypes) {
            superTypes += ', ';
          }
          superTypes += classImplementations;
        }
        if (superTypes) {
          superTypes = ` : ${superTypes}`;
        }

        const genericPredicates: string[] = [];
        if (n.genericParameterList) {

          for (const gen of n.genericParameterList.types) {
            if (gen.upperBounds) {
              genericPredicates.push(`where ${gen.name.visit(v)} : ${render(gen.upperBounds, v)}`);
            }
          }
        }

        const genericPredicatesString = (genericPredicates.length > 0)
          ? `\n  ${genericPredicates.join('\n  ')}`
          : '';

        const typeDeclarationContent: VisitResult<string>[] = [];

        if (n.comments) {
          typeDeclarationContent.push(n.comments.visit(v));
          typeDeclarationContent.push('\n');
        }
        if (n.annotations) {
          typeDeclarationContent.push(n.annotations.visit(v));
          typeDeclarationContent.push('\n');
        }

        typeDeclarationContent.push(`${modifiers} class ${name}${genericsString}${superTypes}${genericPredicatesString}`);
        typeDeclarationContent.push(v.visitObjectDeclarationBody(n, v));

        return typeDeclarationContent;
      } finally {
        ctx.objectDecStack.pop();
      }
    },

    visitGenericTypeDeclaration(n, v) {
      return render(n.name, v);
    },

    visitGenericType(n, v) {

      if (options.debug) {
        return parent.visitGenericType(n, v) + ` /* ${OmniUtil.describe(n.omniType)} */`;
      } else {
        return parent.visitGenericType(n, v);
      }
    },

    /**
     * TODO: Should be replaced by something else which can re-use almost all parts of visitMethodDeclaration -- should not need to repeat things here!
     *        Perhaps have a ref to the owner class for the constructor node, and otherwise it has all the same parts as the method declaration?
     */
    visitConstructor: (n, v) => {
      const annotations = n.annotations ? `${render(n.annotations, v)}\n` : '';
      const body = n.body ? `${render(n.body, v)}` : ' {}';
      const superCall = n.superCall ? `${render(n.superCall, v)}` : '';
      const modifiers = n.modifiers.children.length > 0 ? `${render(n.modifiers, v)} ` : '';

      const owner = ctx.objectDecStack[ctx.objectDecStack.length - 1];
      const parameters = render(n.parameters, v);

      return `\n${annotations}${modifiers}${render(owner.name, v)}(${parameters})${superCall}${body}\n`;
    },

    visitSuperConstructorCall: (n, v) => ` : base(${render(n.arguments, v)})`,

    visitEnumItemList: (n, v) => `${n.children.map(it => render(it, v)).join(',\n')},\n`,
    visitEnumItem: (n, v) => {
      return `${n.identifier.visit(v)} = ${n.value.visit(v)}`;
    },

    visitEdgeType: (n, v) => {

      const t = n.omniType;
      if (t.kind === OmniTypeKind.STRING) {
        // TODO: This should not be needed; the renderer should be able to more easily replace primitive types; should not be calculated by something else.
        return `string`;
      } else if (OmniUtil.isPrimitive(t)) {
        return CSharpUtil.toPrimitiveTypeName(t);
      } else if (OmniUtil.isEmptyType(t) && t.kind === OmniTypeKind.OBJECT && t.properties.length == 0 && !t.name && !t.extendedBy) {
        return 'object';
      }

      return parent.visitEdgeType(n, v);
    },

    visitHardCoded: (n, v) => {

      return parent.visitHardCoded(n, v);
    },

    visitWildcardType: (n, v) => {

      const kind = n.omniType.unknownKind ?? options.unknownType;
      if (kind === UnknownKind.OBJECT) {
        return 'object';
      } else if (kind == UnknownKind.ANY) {
        return 'dynamic';
      }

      return parent.visitWildcardType(n, v);
    },

    visitComment: (n, v) => {

      if (n.kind === Code.CommentKind.DOC) {

        const text = join(n.text.visit(v))
          .trim()
          .replaceAll('\r', '')
          .replaceAll('\n', '\n/// ');

        // TODO: Remove "<summary>" since that should be part of the freetext
        return `/// ${text}`;
      }

      return parent.visitComment(n, v);
    },

    visitFreeTextTypeLink: (n, v) => `\n<see cref="${render(n.type, v)}" />\n`,
    visitFreeTextCode: (n, v) => `<code>${render(n.content, v)}</code>`,
    visitFreeTextExample: (n, v) => `\n<example>${render(n.content, v)}</example>`,
    visitFreeTextSummary: (n, v) => `<summary>\n${render(n.content, v).trim()}\n</summary>`,
    visitFreeTextRemark: (n, v) => `\n<remarks>${render(n.content, v).trim()}</remarks>`,
    visitFreeTextList: (node, visitor) => {

      const tag = node.ordered ? 'number' : 'bullet';
      const indent = '  ';
      const lines = node.children.map(it => join(it.visit(visitor))).join(`</item>\n${indent}<item>`);

      return `<list type="${tag}">\n${indent}<item>${lines}</item>\n</list>`;
    },
  };
};
