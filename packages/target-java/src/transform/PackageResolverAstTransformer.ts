import {
  ExternalSyntaxTree,
  OmniType,
  OmniUtil,
  RealOptions,
  VisitorFactoryManager,
} from '@omnigen/core';
import {JavaUtil, TypeNameInfo} from '../util/index.js';
import {JavaOptions} from '../options/index.js';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform/index.js';
import * as Java from '../ast/index.js';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

interface CompilationUnitInfo {
  cu: Java.CompilationUnit;
  packageName: string;
  addedTypeNodes: Java.RegularType[];
  importNameMap: Map<OmniType, string>;
}

interface ObjectInfo {
  object: Java.AbstractObjectDeclaration;
}

export class PackageResolverAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): Promise<void> {

    const typeNameMap = new Map<OmniType, TypeNameInfo>();
    const cuInfoStack: CompilationUnitInfo[] = [];
    const objectStack: ObjectInfo[] = [];

    // First we go through all the types and find their true Full-Qualified Name.
    const all: ExternalSyntaxTree<Java.JavaAstRootNode, JavaOptions>[] = [...args.externals, {node: args.root, options: args.options}];
    for (const external of all) {

      // Get and move all type infos to the global one.
      this.getTypeNameInfos(external, objectStack)
        .forEach((v, k) => {
          typeNameMap.set(k, v);
        });
    }

    if (objectStack.length > 0 || cuInfoStack.length > 0) {
      throw new Error(`There is a mismatch in the opening and closing of some syntax tree visiting`);
    }

    // Then we will go through the currently compiling root node and set all type nodes' local names.
    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitCompilationUnit: (node, visitor) => {

        const cuClassName = JavaUtil.getClassName(node.object.type.omniType, args.options);
        const cuPackage = JavaUtil.getPackageName(node.object.type.omniType, cuClassName, args.options);

        const cuInfo: CompilationUnitInfo = {
          cu: node,
          packageName: cuPackage,
          addedTypeNodes: [],
          importNameMap: new Map<OmniType, string>(),
        };

        cuInfoStack.push(cuInfo);
        AbstractJavaAstTransformer.JAVA_VISITOR.visitCompilationUnit(node, visitor);
        cuInfoStack.pop();

        // After the visitation is done, all imports should have been found
        node.imports.children.sort((a, b) => {
          const aPackage = cuInfo.importNameMap.get(a.type.omniType) || ''; // Should never be undefined
          const bPackage = cuInfo.importNameMap.get(b.type.omniType) || ''; // Should never be undefined
          return aPackage.localeCompare(bPackage);
        });
      },

      visitObjectDeclaration: (node, visitor) => {
        AbstractJavaAstTransformer.JAVA_VISITOR.visitObjectDeclaration(node, visitor);
      },

      // visitGenericTypeUse: node => {
      //   node.
      // },

      visitRegularType: node => {

        const cuInfo = cuInfoStack[cuInfoStack.length - 1];

        if (cuInfo.addedTypeNodes.includes(node)) {
          // This type node has already been handled.
          // It has probably been added to multiple locations in the tree.
          return;
        }

        if (cuInfoStack.length == 0) {
          throw new Error(`There should be at least one level of compilation units before encountering a type`);
        }

        const typeNameInfo = typeNameMap.get(OmniUtil.getUnwrappedType(node.omniType));

        if (typeNameInfo) {
          this.setLocalNameAndAddImportForKnownTypeName(typeNameInfo, node, cuInfo, args.options);
        } else {
          this.setLocalNameAndImportForUnknownTypeName(node, cuInfo, typeNameMap, args.options);
        }

        cuInfo.addedTypeNodes.push(node);
      },
    }));

    return Promise.resolve(undefined);
  }

  private setLocalNameAndImportForUnknownTypeName(
    node: Java.RegularType,
    cuInfo: CompilationUnitInfo,
    typeNameMap: Map<OmniType, TypeNameInfo>,
    options: RealOptions<JavaOptions>,
  ): void {

    const relativeLocalName = JavaUtil.getName({
      type: node.omniType,
      options: options,
      withPackage: false,
      implementation: node.implementation,
      localNames: typeNameMap,
    });
    const nodeImportName = JavaUtil.getClassNameForImport(node.omniType, options, node.implementation);

    node.setLocalName(relativeLocalName);

    if (nodeImportName && nodeImportName.indexOf('.') !== -1) {

      const nodePackage = JavaUtil.getPackageNameFromFqn(nodeImportName);

      if (nodePackage != cuInfo.packageName) {
        this.addImportIfUnique(cuInfo, options, nodeImportName, node);
      }
    }
  }

  private setLocalNameAndAddImportForKnownTypeName(
    typeNameInfo: TypeNameInfo,
    node: Java.RegularType,
    cuInfo: CompilationUnitInfo,
    options: RealOptions<JavaOptions>,
  ): void {

    // We already have this type's name resolved. Perhaps as a regular type, or as a nested type.
    if (typeNameInfo.packageName != cuInfo.packageName) {

      const nodeImportName = JavaUtil.buildFullyQualifiedName(
        typeNameInfo.packageName || '', // Should never be undefined
        typeNameInfo.outerTypeNames,
        typeNameInfo.className,
      );

      this.addImportIfUnique(cuInfo, options, nodeImportName, node);
      node.setLocalName(typeNameInfo.className);

    } else {

      if (typeNameInfo.outerTypeNames.length > 0) {

        // TODO: Make this prettier. Right now we always qualify the whole path.
        //        Not needed if is upper type, sibling or direct child.
        node.setLocalName(`${typeNameInfo.outerTypeNames.join('.')}.${typeNameInfo.className}`);
      } else {
        node.setLocalName(typeNameInfo.className);
      }
    }
  }

  private addImportIfUnique(
    cuInfo: CompilationUnitInfo,
    options: RealOptions<JavaOptions>,
    nodeImportName: string,
    node: Java.RegularType,
  ): void {

    const existing = cuInfo.cu.imports.children.find(it => {
      const otherImportName = it.type.getImportName() ?? JavaUtil.getClassNameForImport(it.type.omniType, options, it.type.implementation);
      return otherImportName == nodeImportName;
    });

    if (!existing) {

      // This is an import that has not already been added.
      node.setImportName(nodeImportName);
      cuInfo.importNameMap.set(node.omniType, nodeImportName);

      if (/java\.lang\.[a-zA-Z0-9]+/.test(nodeImportName)) {
        // Ignored, since java.lang.* is always automatically imported.
      } else {
        cuInfo.cu.imports.children.push(new Java.ImportStatement(node));
      }
    }
  }

  private getTypeNameInfos(
    external: ExternalSyntaxTree<Java.JavaAstRootNode, JavaOptions>,
    objectStack: ObjectInfo[],
  ): Map<OmniType, TypeNameInfo> {

    const typeNameMap = new Map<OmniType, TypeNameInfo>();

    external.node.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitObjectDeclaration: (node, visitor) => {

        objectStack.push({
          object: node,
        });
        AbstractJavaAstTransformer.JAVA_VISITOR.visitObjectDeclaration(node, visitor);
        objectStack.pop();

        const omniType = node.type.omniType;
        const className = JavaUtil.getClassName(omniType, external.options);
        const packageName = JavaUtil.getPackageName(omniType, className, external.options);

        // If the object stack is not empty, then the current object declaration is a nested one.
        // So we need to create the custom fqn to the type, and save it into the fqn map.
        typeNameMap.set(omniType, {
          packageName: packageName,
          className: className,
          outerTypeNames: objectStack.map(it => it.object.name.value),
        });
      },
    }));

    return typeNameMap;
  }
}
