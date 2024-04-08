import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {AstNode, OmniType, OmniTypeKind, TypeNode} from '@omnigen/core';
import * as Java from '../ast';
import {Identifiable, ModifierType} from '../ast';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
// import {topologicalSort} from 'graphology-dag/topological-sort';
// import {DirectedGraph} from 'graphology';
// import {willCreateCycle} from 'graphology-dag';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class ReorderMembersAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitObjectDeclaration: (node, visitor) => {

        if (!(node instanceof Java.EnumDeclaration)) {

          // Do not re-order an enum, it is sensitive to order.
          node.body.children.sort((a, b) => {

            const aWeight = this.getWeight(a);
            const bWeight = this.getWeight(b);

            let result = bWeight[0] - aWeight[0];
            if (result == 0) {
              result = aWeight[1].localeCompare(bWeight[1]);
            }

            return result;
          });
        }

        // Go deeper, in case there are nested types
        defaultVisitor.visitObjectDeclaration(node, visitor);
      },

      visitAnnotationList: n => {

        // NOTE: Is this the expected order? Sorting by the full import name?
        n.children.sort((a, b) => {
          const aName = a.type.getImportName() || a.type.getLocalName() || OmniUtil.describe(a.type.omniType);
          const bName = b.type.getImportName() || b.type.getLocalName() || OmniUtil.describe(b.type.omniType);

          return aName.localeCompare(bName);
        });
      },

      visitCompilationUnit: (node, visitor) => {

        // const otherIds: string[] = [];
        // const typeToIdMap = new Map<OmniType, string>();
        // const nodeToIdMap = new Map<Identifiable, string>();
        //
        // const v = VisitorFactoryManager.create(defaultVisitor, {
        //   visitEdgeType: n => {
        //     const targetPair = this.getNodeId(n, typeToIdMap);
        //     if (targetPair[0] !== undefined) {
        //       otherIds.push(targetPair[0]);
        //     }
        //   },
        // });

        // const sortedOrders = new Map<Identifiable, OmniType[]>();
        // for (const child of node.children) {
        //
        //   const graph = new DirectedGraph();
        //
        //   otherIds.length = 0;
        //   child.visit(v);
        //
        //   for (const sourceId of otherIds) {
        //     for (const targetId of otherIds) {
        //       if (!willCreateCycle(graph, sourceId, targetId)) {
        //         graph.mergeEdge(sourceId, targetId);
        //       }
        //     }
        //   }
        //
        //   const order = topologicalSort(graph);
        //   for (const other of otherIds) {
        //     if (!order.includes(other)) {
        //       order.push(other);
        //     }
        //   }
        //
        //   const entries = [...typeToIdMap.entries()];
        //   const types: OmniType[] = [];
        //   for (const o of order) {
        //     const matched = entries.filter(it => it[1] === o).map(it => it[0]);
        //     if (matched.length === 1) {
        //       types.push(matched[0]);
        //     } else {
        //       throw new Error(`It should not be able to be a non-single result when mapping from reordering type to id`);
        //     }
        //   }
        //
        //   sortedOrders.set(child, types);
        // }

        node.children.sort((a, b) => {

          // TODO: Reimplement searching based on dependency order
          // const aId: number = nodeToIdMap.get(a) ?? -1;
          // const bId: number = nodeToIdMap.get(b) ?? -1;
          //
          // if (aId !== -1 && bId !== -1) {
          //
          //   // const aIndex = order.indexOf(`${aId}`);
          //   // const bIndex = order.indexOf(`${bId}`);
          //
          //   const result = bIndex - aIndex;
          //   if (result !== 0) {
          //     return result;
          //   }
          // }

          const aWeight = this.getWeight(a);
          const bWeight = this.getWeight(b);

          let result = bWeight[0] - aWeight[0];
          if (result == 0) {
            result = aWeight[1].localeCompare(bWeight[1]);
          }

          return result;
        });

        // Go deeper, in case there nested types
        defaultVisitor.visitCompilationUnit(node, visitor);
      },

      visitField: () => {
      },
      visitMethodDeclaration: () => {
      },
      visitConstructor: () => {
      },
    }));
  }

  private getNodeId(n: TypeNode, typeToIdMap: Map<OmniType, string>) {

    let typeNode = n;
    while (typeNode instanceof Java.GenericType) {
      typeNode = typeNode.baseType;
    }

    let type: OmniType | undefined = OmniUtil.getUnwrappedType((typeNode instanceof Java.EdgeType) ? typeNode.omniType : undefined);
    while (type && type.kind === OmniTypeKind.GENERIC_TARGET) {
      type = type.source;
    }
    while (type && type.kind === OmniTypeKind.GENERIC_SOURCE) {
      type = type.of;
    }

    let id = type ? typeToIdMap.get(type) : undefined;
    if (type && id === undefined) {
      id = `${typeToIdMap.size}`;
      typeToIdMap.set(type, id);
    }

    return [id, type] as const;
  }

  private getWeight(node: AstNode): [number, string] {

    let weight = 0;
    if (node instanceof Java.Field) {
      weight += 300;
      weight += this.getModifierWeight(node.modifiers);
      return [weight, node.identifier.value];
    } else if (node instanceof Java.ConstructorDeclaration) {
      weight += 200;
      return [weight, 'constructor'];
    } else if (node instanceof Java.MethodDeclaration) {
      weight += 100;
      weight -= this.getModifierWeight(node.signature.modifiers);
      return [weight, node.signature.identifier.value];
    } else if (node instanceof Java.AbstractObjectDeclaration) {
      weight += 0;
      weight += this.getModifierWeight(node.modifiers);
      return [weight, node.name.value];
    }

    if ('name' in node && node.name instanceof Java.Identifier) {

      weight += 0;
      // weight += this.getModifierWeight(node.modifiers);
      return [weight, node.name.value];
    }

    return [0, ''];
  }

  private getModifierWeight(modifiers: Java.ModifierList) {

    let weight = 0;
    if (modifiers.children.find(it => it.type == ModifierType.STATIC)) {
      weight += 10;
    }

    if (modifiers.children.find(it => it.type == ModifierType.FINAL)) {
      weight += 5;
    }

    if (modifiers.children.find(it => it.type == ModifierType.PRIVATE)) {
      weight += 3;
    }

    if (modifiers.children.find(it => it.type == ModifierType.PROTECTED)) {
      weight += 1;
    }

    return weight;
  }
}
