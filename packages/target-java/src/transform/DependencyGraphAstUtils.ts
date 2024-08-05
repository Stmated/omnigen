import * as Java from '../ast/JavaAst';
import {OmniType, TargetOptions} from '@omnigen/api';
import {Visitor} from '@omnigen/core';

export interface DependencyNode {
  unit: Java.CompilationUnit;
  type: OmniType;
  referencedBy: DependencyNode[];
  references: DependencyNode[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
}

export class DependencyGraphAstUtils {

  private build(root: Java.JavaAstRootNode, options: TargetOptions): DependencyGraph {

    const unitStack: Java.CompilationUnit[] = [];
    const objectDecStack: Java.AbstractObjectDeclaration[] = [];

    const typeToGraphNode = new Map<OmniType, DependencyNode>();

    const defaultVisitor = root.createVisitor();
    root.visit(Visitor.create(defaultVisitor, {

      visitCompilationUnit: (node, visitor) => {

        try {
          unitStack.push(node);
        } finally {
          defaultVisitor.visitCompilationUnit(node, visitor);
          unitStack.pop();
        }
      },
      visitObjectDeclaration: (n, visitor) => {

        try {
          objectDecStack.push(n);
          const dndec = this.getOrCreateDependencyNode(typeToGraphNode, n.omniType, unitStack);
          defaultVisitor.visitObjectDeclaration(n, visitor);
        } finally {
          objectDecStack.pop();
        }
      },

      // We do not want texts with links to count as "references"
      visitFreeTextLine: () => {
      },
      visitFreeTextTypeLink: () => {
      },
      visitFreeTextMemberLink: () => {
      },
      visitFreeTextPropertyLink: () => {
      },

      visitEdgeType: n => {

        const edgeNode = this.getOrCreateDependencyNode(typeToGraphNode, n.omniType, unitStack);

        const dec = objectDecStack[objectDecStack.length - 1];
        const decNode = this.getOrCreateDependencyNode(typeToGraphNode, dec.omniType, unitStack);

        // edgeNode.references.push(decNode.);

        // for (const usedType of InnerTypeCompressionAstTransformer.getResolvedVisibleTypes(gn.omniType)) {
        //
        //   // We will only compress certain kind of types.
        //   if (usedType.kind == OmniTypeKind.OBJECT
        //     || OmniUtil.isComposition(usedType)
        //     || usedType.kind == OmniTypeKind.ENUM
        //     || (usedType.kind == OmniTypeKind.INTERFACE && options.allowCompressInterfaceToInner)) {
        //
        //     const objectDec = objectDecStack[objectDecStack.length - 1];
        //     if (usedType != objectDec.type.omniType) {
        //       const mapping = objectDecUsedInType.get(objectDec);
        //       if (mapping) {
        //         if (!mapping.includes(usedType)) {
        //           mapping.push(usedType);
        //         }
        //       } else {
        //         objectDecUsedInType.set(objectDec, [usedType]);
        //       }
        //     }
        //   }
        // }
      },
    }));

    return {
      nodes: [...typeToGraphNode.values()],
    };
  }

  private getOrCreateDependencyNode(map: Map<OmniType, DependencyNode>, type: OmniType, unitStack: Java.CompilationUnit[]): DependencyNode {

    let gn = map.get(type);
    if (!gn) {
      gn = {
        type: type,
        unit: unitStack[unitStack.length - 1],
        referencedBy: [],
        references: [],
      };

      map.set(type, gn);
    }

    return gn;
  }
}
