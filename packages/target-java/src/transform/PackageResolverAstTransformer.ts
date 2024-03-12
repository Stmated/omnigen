import {ExternalSyntaxTree, OmniType, TargetOptions} from '@omnigen/core';
import {JavaUtil, TypeNameInfo} from '../util/index.ts';
import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs} from '../transform/index.ts';
import * as Java from '../ast/index.ts';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

interface CompilationUnitInfo {
  cu: Java.CompilationUnit;
  packageName: string;
  addedTypeNodes: (Java.RegularType | Java.WildcardType)[];
  importNameMap: Map<OmniType, string>;
}

/**
 * Resolves local names for types; is especially useful for nested types.
 */
export class PackageResolverAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const typeNameMap = new Map<OmniType, TypeNameInfo>();
    const cuInfoStack: CompilationUnitInfo[] = [];
    const objectStack: Java.AbstractObjectDeclaration[] = [];

    // First we go through all the types and find their true Fully-Qualified Name.
    const all: ExternalSyntaxTree<Java.JavaAstRootNode, JavaAndTargetOptions>[] = [...args.externals, {
      node: args.root,
      options: args.options,
    }];

    for (const external of all) {
      this.getTypeNameInfos(external, objectStack, args.options).forEach((v, k) => typeNameMap.set(k, v));
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

      visitObjectDeclarationBody: (node, visitor) => {
        try {
          objectStack.push(node);
          AbstractJavaAstTransformer.JAVA_VISITOR.visitObjectDeclarationBody(node, visitor);
        } finally {
          objectStack.pop();
        }
      },

      visitWildcardType: (node, visitor) => {

        AbstractJavaAstTransformer.JAVA_VISITOR.visitWildcardType(node, visitor);
        this.setLocalNameAndImport(node, node.implementation, objectStack, cuInfoStack, typeNameMap, args.options);
      },

      visitRegularType: node => {
        this.setLocalNameAndImport(node, node.implementation, objectStack, cuInfoStack, typeNameMap, args.options);
      },
    }));
  }

  private setLocalNameAndImport(
    node: Java.RegularType | Java.WildcardType,
    implementation: boolean | undefined,
    objectStack: Java.AbstractObjectDeclaration[],
    cuInfoStack: CompilationUnitInfo[],
    typeNameMap: Map<OmniType, TypeNameInfo>,
    options: JavaAndTargetOptions,
  ): void {

    const cuInfo = cuInfoStack[cuInfoStack.length - 1];
    if (cuInfo.addedTypeNodes.includes(node)) {
      // This type node has already been handled.
      // It has probably been added to multiple locations in the tree.
      return;
    }

    const unwrapped = OmniUtil.getUnwrappedType(node.omniType);
    const typeNameInfo = typeNameMap.get(unwrapped);

    if (typeNameInfo) {
      this.setLocalNameAndAddImportForKnownTypeName(typeNameInfo, node, objectStack, cuInfo, options);
    } else {
      this.setLocalNameAndImportForUnknownTypeName(node, implementation, cuInfo, typeNameMap, options);
    }

    cuInfo.addedTypeNodes.push(node);
  }

  private setLocalNameAndImportForUnknownTypeName(
    node: Java.RegularType | Java.WildcardType,
    implementation: boolean | undefined,
    cuInfo: CompilationUnitInfo,
    typeNameMap: Map<OmniType, TypeNameInfo>,
    options: JavaAndTargetOptions,
  ): void {

    const relativeLocalName = JavaUtil.getName({
      type: node.omniType,
      options: options,
      withPackage: false,
      implementation: implementation,
      localNames: typeNameMap,
    });
    const nodeImportName = JavaUtil.getClassNameForImport(node.omniType, options, implementation);

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
    node: Java.RegularType | Java.WildcardType,
    objectStack: Java.AbstractObjectDeclaration[],
    cuInfo: CompilationUnitInfo,
    options: JavaAndTargetOptions,
  ): void {

    // We already have this type's name resolved. Perhaps as a regular type, or as a nested type.
    if (typeNameInfo.packageName != cuInfo.packageName) {

      const nodeImportName = JavaUtil.buildFullyQualifiedName(
        typeNameInfo.packageName || '', // Should never be undefined
        typeNameInfo.outerTypes.map(it => it.name.value),
        typeNameInfo.className,
      );

      this.addImportIfUnique(cuInfo, options, nodeImportName, node);
      node.setLocalName(typeNameInfo.className);

    } else {

      let typePathDivergesAt = 0;
      for (; typePathDivergesAt < objectStack.length && typePathDivergesAt < typeNameInfo.outerTypes.length; typePathDivergesAt++) {
        if (objectStack[typePathDivergesAt] != typeNameInfo.outerTypes[typePathDivergesAt]) {
          break;
        }
      }

      if (typeNameInfo.outerTypes.length > 0) {
        const localOuterTypes = typeNameInfo.outerTypes.slice(typePathDivergesAt);
        if (localOuterTypes.length > 0) {
          const parentPath = localOuterTypes.map(it => it.name.value).join('.');
          node.setLocalName(`${parentPath}.${typeNameInfo.className}`);
        } else {
          node.setLocalName(typeNameInfo.className);
        }
      } else {
        node.setLocalName(typeNameInfo.className);
      }
    }
  }

  private addImportIfUnique(
    cuInfo: CompilationUnitInfo,
    options: JavaAndTargetOptions,
    nodeImportName: string,
    node: Java.RegularType | Java.WildcardType,
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
    external: ExternalSyntaxTree<Java.JavaAstRootNode, JavaAndTargetOptions>,
    objectStack: Java.AbstractObjectDeclaration[],
    targetOptions: TargetOptions,
  ): Map<OmniType, TypeNameInfo> {

    const typeNameMap = new Map<OmniType, TypeNameInfo>();

    external.node.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitObjectDeclaration: (node, visitor) => {

        objectStack.push(node);
        AbstractJavaAstTransformer.JAVA_VISITOR.visitObjectDeclaration(node, visitor);
        objectStack.pop();

        const omniType = node.type.omniType;
        let className = JavaUtil.getClassName(omniType, external.options);
        const packageName = JavaUtil.getPackageName(omniType, className, external.options);
        const outerTypes = [...objectStack];

        // If the object stack is not empty, then the current object declaration is a nested one.
        // So we need to create the custom fqn to the type, and save it into the fqn map.
        if (typeNameMap.has(omniType)) {
          const existing = typeNameMap.get(omniType)!;
          const newPath = outerTypes.map(it => it.name.value).join('.');
          const existingPath = existing.outerTypes.map(it => it.name.value).join('.');
          throw new Error(`Has encountered duplicate declaration of '${OmniUtil.describe(omniType)}', new at ${newPath}, existing at ${existingPath}`);
        }

        if (targetOptions.shortenNestedTypeNames && objectStack.length > 0) {

          for (let i = objectStack.length - 1; i >= 0; i--) {
            const closestOtherTypeName = objectStack[i].name.value;
            if (className.length > closestOtherTypeName.length) {
              const subClassName = className.substring(0, closestOtherTypeName.length);
              if (subClassName == closestOtherTypeName) {
                const newClassName = className.substring(closestOtherTypeName.length);
                if (JavaUtil.isReservedWord(newClassName)) {
                  continue;
                }

                className = newClassName;
                node.name.original = node.name.original || node.name.value;
                node.name.value = className;
                break;
              }
            }
          }
        }

        typeNameMap.set(omniType, {
          packageName: packageName,
          className: className,
          outerTypes: outerTypes,
        });
      },
    }));

    return typeNameMap;
  }
}
