import {ExternalSyntaxTree, OmniType, TargetFeatures, TargetOptions} from '@omnigen/core';
import {JavaUtil} from '../util';
import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs, JavaAstUtils} from '../transform';
import * as Java from '../ast';
import {AbstractObjectDeclaration, EdgeType} from '../ast';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

interface CompilationUnitInfo {
  unit: Java.CompilationUnit;
  packageName: string;
  handledTypeNodes: Java.EdgeType[];
  importNameMap: Map<OmniType, string>;
}

export interface TypeInfo {
  packageName: string | undefined;
  className: string;
  outerTypes: Java.AbstractObjectDeclaration[];
  unit: Java.CompilationUnit;
}

/**
 * Resolves local names for types; is especially useful for nested types.
 */
export class PackageResolverAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const typeNameMap = new Map<OmniType, TypeInfo>();

    // First we go through all the types and find their true Fully-Qualified Name.
    const all: ExternalSyntaxTree<Java.JavaAstRootNode, JavaAndTargetOptions>[] = [...args.externals, {
      node: args.root,
      options: args.options,
    }];

    for (const external of all) {
      this.getTypeNameInfos(external, args.options).forEach((v, k) => typeNameMap.set(k, v));
    }

    const unitStack: CompilationUnitInfo[] = [];
    const objectStack: Java.AbstractObjectDeclaration[] = [];
    const namespaceStack: string[] = [];

    // Then we will go through the currently compiling root node and set all type nodes' local names.
    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitNamespace: (n, v) => {

        try {
          namespaceStack.push(n.name.value);
          return defaultVisitor.visitNamespace(n, v);
        } finally {
          namespaceStack.pop();
        }
      },

      visitCompilationUnit: (node, visitor) => {

        let cuPackage: string | undefined = namespaceStack.length > 0 ? namespaceStack[namespaceStack.length - 1] : undefined;

        if (!cuPackage) {
          let firstTypedChild: OmniType | undefined = undefined;
          for (const child of node.children) {
            if (child instanceof Java.Namespace) {

              // NOTE: Maybe restructure somehow, so that we do not end up inside the compilation unit content until *after* we've entered a namespace.
              //        Do not know yet how that would be done though. As things are right now it would break if there are multiple namespaces inside the same unit.
              cuPackage = child.name.value;
              break;

            } else {
              firstTypedChild = JavaAstUtils.getOmniType(child);
              if (firstTypedChild) {
                break;
              }
            }
          }

          if (!cuPackage) {
            if (firstTypedChild) {
              const cuClassName = JavaUtil.getClassName(firstTypedChild, args.options);
              cuPackage = JavaUtil.getPackageName(firstTypedChild, cuClassName, args.options);
            } else {
              const name = node.name || `Owner of ${node.children.map(it => it.name.value).join(', ')}`;
              throw new Error(`No named object declaration found inside ${name}`);
            }
          }
        }

        const cuInfo: CompilationUnitInfo = {
          unit: node,
          packageName: cuPackage,
          handledTypeNodes: [],
          importNameMap: new Map<OmniType, string>(),
        };

        try {
          unitStack.push(cuInfo);
          defaultVisitor.visitCompilationUnit(node, visitor);
        } finally {
          unitStack.pop();
        }

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
          defaultVisitor.visitObjectDeclarationBody(node, visitor);
        } finally {
          objectStack.pop();
        }
      },

      visitBoundedType: (n, v) => {
        return defaultVisitor.visitBoundedType(n, v);
      },

      visitEdgeType: node => {
        this.setLocalNameAndAddImport(node, node.implementation, objectStack, unitStack, typeNameMap, args.options, args.features);
      },
    }));
  }

  private setLocalNameAndAddImport(
    node: Java.EdgeType,
    implementation: boolean | undefined,
    objectStack: Java.AbstractObjectDeclaration[],
    unitStack: CompilationUnitInfo[],
    typeNameMap: Map<OmniType, TypeInfo>,
    options: JavaAndTargetOptions,
    features: TargetFeatures,
  ): void {

    const insideUnit = unitStack[unitStack.length - 1];
    if (insideUnit.handledTypeNodes.includes(node)) {
      // This type node has already been handled.
      // It has probably been added to multiple locations in the tree.
      return;
    }

    const unwrapped = OmniUtil.getUnwrappedType(node.omniType);
    const typeNameInfo = typeNameMap.get(unwrapped);

    if (typeNameInfo) {
      this.setLocalNameAndAddImportForKnownTypeName(typeNameInfo, node, objectStack, insideUnit, options, features);
    } else {
      this.setLocalNameAndAddImportForUnknownTypeName(node, implementation, objectStack, insideUnit, typeNameMap, options);
    }

    insideUnit.handledTypeNodes.push(node);
  }

  private setLocalNameAndAddImportForUnknownTypeName(
    node: Java.EdgeType,
    implementation: boolean | undefined,
    objectStack: Java.AbstractObjectDeclaration[],
    insideUnit: CompilationUnitInfo,
    typeNameMap: Map<OmniType, TypeInfo>,
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

      if (nodePackage != insideUnit.packageName) {
        this.addImportIfUnique(objectStack, insideUnit, options, nodeImportName, node);
      }
    }
  }

  private setLocalNameAndAddImportForKnownTypeName(
    typeNameToResolve: TypeInfo,
    typeNodeToResolve: Java.EdgeType,
    objectStack: Java.AbstractObjectDeclaration[],
    insideUnit: CompilationUnitInfo,
    options: JavaAndTargetOptions,
    features: TargetFeatures,
  ): void {

    // We already have this type's name resolved. Perhaps as a regular type, or as a nested type.
    const inDifferentPackage = (typeNameToResolve.packageName != insideUnit.packageName);
    const inDifferentUnit = insideUnit.unit != typeNameToResolve.unit;

    if (inDifferentPackage || features.forcedImports) {

      const typePackageName = PackageResolverAstTransformer.getMaybeRelativePackageName(typeNameToResolve, insideUnit, features);

      const nodeImportName = JavaUtil.buildFullyQualifiedName(
        typePackageName,
        typeNameToResolve.outerTypes.map(it => it.name.value),
        typeNameToResolve.className,
      );

      if (inDifferentUnit) {
        this.addImportIfUnique(objectStack, insideUnit, options, nodeImportName, typeNodeToResolve);
      }

      typeNodeToResolve.setLocalName(typeNameToResolve.className);

    } else {

      let typePathDivergesAt = 0;
      for (; typePathDivergesAt < objectStack.length && typePathDivergesAt < typeNameToResolve.outerTypes.length; typePathDivergesAt++) {
        if (objectStack[typePathDivergesAt] != typeNameToResolve.outerTypes[typePathDivergesAt]) {
          break;
        }
      }

      if (typeNameToResolve.outerTypes.length > 0) {
        const localOuterTypes = typeNameToResolve.outerTypes.slice(typePathDivergesAt);
        if (localOuterTypes.length > 0) {
          const parentPath = localOuterTypes.map(it => it.name.value).join('.');
          typeNodeToResolve.setLocalName(`${parentPath}.${typeNameToResolve.className}`);
        } else {
          typeNodeToResolve.setLocalName(typeNameToResolve.className);
        }
      } else {
        typeNodeToResolve.setLocalName(typeNameToResolve.className);
      }
    }
  }

  private static getMaybeRelativePackageName(typeNameToResolve: TypeInfo, targetUnit: CompilationUnitInfo, features: TargetFeatures) {

    let typePackageName = typeNameToResolve.packageName ?? ''; // Should never be undefined
    if (features.relativeImports && typePackageName.length >= targetUnit.packageName.length) {

      const prefix = typePackageName.substring(0, targetUnit.packageName.length);
      if (targetUnit.packageName.startsWith(prefix)) {
        typePackageName = typePackageName.substring(targetUnit.packageName.length + 1);
      }
    }
    return typePackageName;
  }

  private addImportIfUnique(
    objectStack: AbstractObjectDeclaration[],
    insideUnit: CompilationUnitInfo,
    options: JavaAndTargetOptions,
    nodeImportName: string,
    node: EdgeType,
  ): void {

    if (objectStack.length > 0 && objectStack[objectStack.length - 1].omniType == node.omniType) {

      // We are referring to ourselves in our own unit. No need to add an import.
      return;
    }

    const existing = insideUnit.unit.imports.children.find(it => {
      if (it.type instanceof Java.EdgeType) {
        let otherImportName = it.type.getImportName();
        if (!otherImportName) {
          otherImportName = JavaUtil.getClassNameForImport(it.type.omniType, options, it.type.implementation);
          it.type.setImportName(otherImportName);
        }

        return otherImportName == nodeImportName;
      } else {
        return false;
      }
    });

    if (!existing) {

      // This is an import that has not already been added.
      node.setImportName(nodeImportName);
      insideUnit.importNameMap.set(node.omniType, nodeImportName);

      if (/java\.lang\.[a-zA-Z0-9]+/.test(nodeImportName)) {
        // Ignored, since java.lang.* is always automatically imported.
      } else {
        insideUnit.unit.imports.children.push(new Java.ImportStatement(node));
      }
    }
  }

  private getTypeNameInfos(
    external: ExternalSyntaxTree<Java.JavaAstRootNode, JavaAndTargetOptions>,
    targetOptions: TargetOptions,
  ): Map<OmniType, TypeInfo> {

    const unitStack: Java.CompilationUnit[] = [];
    const objectStack: Java.AbstractObjectDeclaration[] = [];
    const typeNameMap = new Map<OmniType, TypeInfo>();

    const originalVisitor = external.node.createVisitor();
    external.node.visit(VisitorFactoryManager.create(originalVisitor, {

      visitCompilationUnit: (node, visitor) => {

        try {
          unitStack.push(node);
          originalVisitor.visitCompilationUnit(node, visitor);
        } finally {
          unitStack.pop();
        }
      },

      visitObjectDeclaration: (node, visitor) => {

        try {
          objectStack.push(node);
          originalVisitor.visitObjectDeclaration(node, visitor);
        } finally {
          objectStack.pop();
        }

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
          throw new Error(`Has encountered duplicate declaration of '${OmniUtil.describe(omniType)}', new at '${newPath}', existing at ${existingPath}`);
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
          unit: unitStack[unitStack.length - 1],
        });
      },
    }));

    return typeNameMap;
  }
}
