import {AbstractJavaCstTransformer} from '@java/transform/AbstractJavaCstTransformer';
import {OmniModel} from '@parse';
import {JavaCstRootNode, IJavaOptions, JavaUtil} from '@java';
import * as Java from '@java/cst';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {RealOptions} from '@options';

type CompilationUnitInfo = {cu: Java.CompilationUnit, packageName: string, addedTypeNodes: Java.Type[] };

export class PackageImportJavaCstTransformer extends AbstractJavaCstTransformer {

  transformCst(model: OmniModel, root: JavaCstRootNode, options: RealOptions<IJavaOptions>): Promise<void> {

    // const usedTypeNodes: Java.Type[] = [];
    // const usedSimpleNamesStack: string[][] = [];
    const cuInfoStack: CompilationUnitInfo[] = [];
    root.visit(VisitorFactoryManager.create(this._javaVisitor, {

      visitCompilationUnit: (node, visitor) => {

        const cuFqn = JavaUtil.getName({
          type: node.object.type.omniType,
          options: options,
          withPackage: true
        });
        const cuPackage = JavaUtil.getPackageNameFromFqn(cuFqn);

        cuInfoStack.push({
          cu: node,
          packageName: cuPackage,
          addedTypeNodes: []
        });
        this._javaVisitor.visitCompilationUnit(node, visitor);
        cuInfoStack.pop();

        node.imports.children.sort((a, b) => {
          const aPackage = JavaUtil.getClassNameForImport(a.type.omniType, options, a.type.implementation) || '';
          const bPackage = JavaUtil.getClassNameForImport(b.type.omniType, options, b.type.implementation) || '';
          return aPackage.localeCompare(bPackage);
        });
      },

      visitType: (node) => {

        const cuInfo = cuInfoStack[cuInfoStack.length - 1];

        if (cuInfo.addedTypeNodes.includes(node)) {
          // This type node has already been handled.
          // It has probably been added to multiple locations in the tree.
          return;
        }

        if (cuInfoStack.length == 0) {
          throw new Error(`There should be at least one level of compilation units before encountering a type`);
        }

        const relativeLocalName = JavaUtil.getName({
          type: node.omniType,
          options: options,
          withPackage: false,
          implementation: node.implementation
        });

        node.setLocalName(relativeLocalName);

        const nodeImportName = JavaUtil.getClassNameForImport(node.omniType, options, node.implementation);
        if (nodeImportName && nodeImportName.indexOf('.') !== -1) {

          const nodePackage = JavaUtil.getPackageNameFromFqn(nodeImportName);

          if (nodePackage != cuInfo.packageName) {
            const existing = cuInfo.cu.imports.children.find(it => {
              // TODO: Cache this inside the import node? Set it in stone?
              const otherImportName = JavaUtil.getClassNameForImport(it.type.omniType, options, it.type.implementation);
              return otherImportName == nodeImportName;
            });

            if (!existing) {

              // This is an import that has not already been added.
              cuInfo.cu.imports.children.push(new Java.ImportStatement(node));
            }
          }
        }

        cuInfo.addedTypeNodes.push(node);
      }
    }));

    return Promise.resolve(undefined);
  }
}
