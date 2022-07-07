import {AbstractJavaTransformer} from '@java/transform/AbstractJavaTransformer';
import {OmniModel} from '@parse';
import {JavaCstRootNode, JavaOptions, JavaUtil} from '@java';
import * as Java from '@java/cst';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';

export class PackageImportTransformer extends AbstractJavaTransformer {

  transform(model: OmniModel, root: JavaCstRootNode, options: JavaOptions): Promise<void> {

    const usedTypes: Java.Type[] = [];
    const compilationUnitStack: Java.CompilationUnit[] = [];
    root.visit(VisitorFactoryManager.create(this._javaVisitor, {

      visitCompilationUnit: (node, visitor) => {
        compilationUnitStack.push(node);
        this._javaVisitor.visitCompilationUnit(node, visitor);
        compilationUnitStack.pop();

        node.imports.children.sort((a, b) => {
          const aPackage = JavaUtil.getImportName(a.type.omniType, options);
          const bPackage = JavaUtil.getImportName(b.type.omniType, options);
          return aPackage.localeCompare(bPackage);
        });
      },

      visitType: (node, visitor) => {

        if (compilationUnitStack.length == 0) {
          throw new Error(`There should be at least one level of compilation units before encountering a type`);
        }

        const cu = compilationUnitStack[compilationUnitStack.length - 1];
        const cuFqn = cu.object.type.getFQN(options);
        const cuPackage = JavaUtil.getPackageName(cuFqn);

        const nodeImportName = JavaUtil.getImportName(node.omniType, options);

        if (nodeImportName.indexOf('.') !== -1) {

          // If it contains a dot, then it is a class path and not a primitive.
          // We should also make the type local based on the current compilation unit's package.
          if (!node.getLocalName()) {
            node.setLocalName(JavaUtil.getRelativeName(node.omniType, options));
          }

          const nodePackage = JavaUtil.getPackageName(nodeImportName);

          if (nodePackage != cuPackage) {
            const existing = cu.imports.children.find(it => {
              // TODO: Cache this inside the import node? Set it in stone?
              const otherImportName = JavaUtil.getImportName(it.type.omniType, options);
              return otherImportName == nodeImportName;
            });

            if (!existing) {

              // This is an import that has not already been added.
              cu.imports.children.push(
                new Java.ImportStatement(
                  node
                )
              );
            }
          }
        }

        usedTypes.push(node);
      }
    }));

    return Promise.resolve(undefined);
  }
}
