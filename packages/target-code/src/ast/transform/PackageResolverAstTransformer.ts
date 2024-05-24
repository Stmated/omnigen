import {AstTransformer, AstTransformerArguments, ExternalSyntaxTree, NameParts, Namespace, OmniType, PackageOptions, TargetFeatures, TargetOptions, TypeUseKind} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {CodeRootAstNode} from '../CodeRootAstNode';

import * as Code from '../../ast/CodeAst';
import {CodeOptions} from '../../options/CodeOptions';
import {CodeAstUtils} from '../CodeAstUtils';

const logger = LoggerFactory.create(import.meta.url);

interface CompilationUnitInfo {
  unit: Code.CompilationUnit;
  packageName: Namespace;
  handledTypeNodes: Code.EdgeType[];
  importNameMap: Map<OmniType, string>;
}

export interface TypeInfo {
  packageName: Namespace | undefined;
  className: string;
  outerTypes: Code.AbstractObjectDeclaration[];
  unit: Code.CompilationUnit;
}

/**
 * Resolves local names for types; is especially useful for nested types.
 */
export class PackageResolverAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & PackageOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & PackageOptions & CodeOptions>): void {

    const typeNameMap = new Map<OmniType, TypeInfo>();

    // First we go through all the types and find their true Fully-Qualified Name.
    const all: ExternalSyntaxTree<CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>[] = [...args.externals, {
      node: args.root,
      options: args.options,
    }];

    for (const external of all) {
      this.getTypeNameInfos(args.root, external, args.options).forEach((v, k) => typeNameMap.set(k, v));
    }

    const nameResolver = args.root.getNameResolver();
    const unitStack: CompilationUnitInfo[] = [];
    const objectStack: Code.AbstractObjectDeclaration[] = [];

    // TODO: Add to the array! Figure out some smart way of handling it!
    const namespaceStack: Namespace[] = [];

    // Then we will go through the currently compiling root node and set all type nodes' local names.
    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitNamespace: (n, v) => {

        try {

          const parsed = nameResolver.parseNamespace(n.name.value);
          namespaceStack.push(parsed);
          return defaultVisitor.visitNamespace(n, v);
        } finally {
          namespaceStack.pop();
        }
      },

      visitCompilationUnit: (node, visitor) => {

        const cuNamespace = this.getUnitPackageName(args, namespaceStack, node);
        const cuInfo: CompilationUnitInfo = {
          unit: node,
          packageName: cuNamespace,
          handledTypeNodes: [],
          importNameMap: new Map<OmniType, string>(),
        };

        try {
          namespaceStack.push(cuNamespace);
          unitStack.push(cuInfo);
          defaultVisitor.visitCompilationUnit(node, visitor);
        } finally {
          unitStack.pop();
          namespaceStack.pop();
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

        const namespace = namespaceStack[namespaceStack.length - 1];
        this.setLocalNameAndAddImport(args.root, node, objectStack, unitStack, typeNameMap, namespace, args.options, args.features);
      },
    }));
  }

  private getUnitPackageName(
    args: AstTransformerArguments<CodeRootAstNode, TargetOptions & PackageOptions & CodeOptions>,
    namespaceStack: Namespace[],
    node: Code.CompilationUnit,
  ): Namespace {

    const cuNamespace = namespaceStack.length > 0 ? namespaceStack[namespaceStack.length - 1] : undefined;
    if (cuNamespace) {
      return cuNamespace;
      // nameResolver.build({name: cuNamespace, with: NameParts.NAMESPACE});
    }

    const nameResolver = args.root.getNameResolver();
    let firstTypedChild: OmniType | undefined = undefined;
    if (!cuNamespace) {
      for (const child of node.children) {
        if (child instanceof Code.Namespace) {

          // NOTE: Maybe restructure somehow, so that we do not end up inside the compilation unit content until *after* we've entered a namespace.
          //        Do not know yet how that would be done though. As things are right now it would break if there are multiple namespaces inside the same unit.
          return nameResolver.parseNamespace(child.name.value);

        } else {
          firstTypedChild = CodeAstUtils.getOmniType(child);
          if (firstTypedChild) {
            break;
          }
        }
      }
    }

    if (!cuNamespace && firstTypedChild) {

      return nameResolver.investigate({type: firstTypedChild, options: args.options}).namespace;
      // return nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE});
    } else {
      const name = node.name || `Owner of ${node.children.map(it => it.name.value).join(', ')}`;
      throw new Error(`No named object declaration found inside ${name}`);
    }
  }

  private setLocalNameAndAddImport(
    root: CodeRootAstNode,
    node: Code.EdgeType,
    objectStack: Code.AbstractObjectDeclaration[],
    unitStack: CompilationUnitInfo[],
    typeNameMap: Map<OmniType, TypeInfo>,
    namespaceParts: Namespace,
    options: PackageOptions & TargetOptions & CodeOptions,
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
      this.setLocalNameAndAddImportForKnownTypeName(root, typeNameInfo, unwrapped, node, objectStack, namespaceParts, insideUnit, options, features);
    } else {
      this.setLocalNameAndAddImportForUnknownTypeName(root, node, objectStack, insideUnit, typeNameMap, namespaceParts, options);
    }

    insideUnit.handledTypeNodes.push(node);
  }

  private setLocalNameAndAddImportForUnknownTypeName(
    root: CodeRootAstNode,
    node: Code.EdgeType,
    objectStack: Code.AbstractObjectDeclaration[],
    insideUnit: CompilationUnitInfo,
    typeNameMap: Map<OmniType, TypeInfo>,
    namespaceParts: Namespace,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): void {

    const nameResolver = root.getNameResolver();
    const investigatedName = nameResolver.investigate({type: node.omniType, options: options});
    const relativeLocalName = nameResolver.build({name: investigatedName, with: NameParts.NAME, use: node.implementation ? TypeUseKind.CONCRETE : TypeUseKind.DECLARED});
    const nodeImportName = nameResolver.build({name: investigatedName, with: NameParts.FULL, use: TypeUseKind.IMPORT, relativeTo: namespaceParts});

    node.setLocalName(relativeLocalName);

    if (nodeImportName && nodeImportName.indexOf('.') !== -1) {

      if (!nameResolver.isEqualNamespace(investigatedName.namespace, insideUnit.packageName)) {
        this.addImportIfUnique(root, objectStack, insideUnit, namespaceParts, options, nodeImportName, node);
      }
    }
  }

  private setLocalNameAndAddImportForKnownTypeName(
    root: CodeRootAstNode,
    typeNameToResolve: TypeInfo,
    omniType: OmniType,
    typeNodeToResolve: Code.EdgeType,
    objectStack: Code.AbstractObjectDeclaration[],
    namespaceParts: Namespace | undefined,
    insideUnit: CompilationUnitInfo,
    options: PackageOptions & TargetOptions & CodeOptions,
    features: TargetFeatures,
  ): void {

    // We already have this type's name resolved. Perhaps as a regular type, or as a nested type.
    const nameResolver = root.getNameResolver();
    const inDifferentPackage = !nameResolver.isEqualNamespace(typeNameToResolve.packageName, insideUnit.packageName);
    const inDifferentUnit = insideUnit.unit != typeNameToResolve.unit;

    if (inDifferentPackage || features.forcedImports) {

      const name = nameResolver.investigate({type: omniType, options: options});
      const nodeImportName = nameResolver.build({name: name, with: NameParts.FULL, use: TypeUseKind.IMPORT, relativeTo: namespaceParts});

      if (inDifferentUnit) {
        this.addImportIfUnique(root, objectStack, insideUnit, namespaceParts, options, nodeImportName, typeNodeToResolve);
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

  private addImportIfUnique(
    root: CodeRootAstNode,
    objectStack: Code.AbstractObjectDeclaration[],
    insideUnit: CompilationUnitInfo,
    namespace: Namespace | undefined,
    options: PackageOptions & TargetOptions & CodeOptions,
    nodeImportName: string,
    node: Code.EdgeType,
  ): void {

    if (objectStack.length > 0 && objectStack[objectStack.length - 1].omniType == node.omniType) {

      // We are referring to ourselves in our own unit. No need to add an import.
      return;
    }

    const nameResolver = root.getNameResolver();
    const existing = insideUnit.unit.imports.children.find(it => {
      if (it.type instanceof Code.EdgeType) {
        let otherImportName = it.type.getImportName();
        if (!otherImportName) {

          const nameInfo = nameResolver.investigate({type: it.type.omniType, options: options});

          // TODO: This might be incorrect, and we need some other, more specific function
          otherImportName = nameResolver.build({name: nameInfo, with: NameParts.FULL, relativeTo: namespace, use: (it.type.implementation ? TypeUseKind.CONCRETE : TypeUseKind.DECLARED)});
          // JavaUtil.getClassNameForImport(it.type.omniType, options, it.type.implementation);
          it.type.setImportName(otherImportName);
        }

        return (otherImportName == nodeImportName);
      } else {
        return false;
      }
    });

    if (!existing) {

      // This is an import that has not already been added.
      node.setImportName(nodeImportName);
      insideUnit.importNameMap.set(node.omniType, nodeImportName);
      insideUnit.unit.imports.children.push(new Code.ImportStatement(node));
    }
  }

  private getTypeNameInfos(
    root: CodeRootAstNode,
    external: ExternalSyntaxTree<CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>,
    targetOptions: TargetOptions,
  ): Map<OmniType, TypeInfo> {

    const unitStack: Code.CompilationUnit[] = [];
    const objectStack: Code.AbstractObjectDeclaration[] = [];
    const typeNameMap = new Map<OmniType, TypeInfo>();

    const nameResolver = root.getNameResolver();

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
        const resolvedName = nameResolver.investigate({type: omniType, options: external.options});

        let className = nameResolver.build({name: resolvedName, with: NameParts.NAME, use: TypeUseKind.DECLARED});
        // const packageName = nameResolver.build({name: resolvedName, with: NameParts.NAMESPACE});
        // let className = JavaUtil.getClassName(omniType, external.options);
        // const packageName = JavaUtil.getPackageName(omniType, className, external.options);

        const outerTypes = [...objectStack];

        // If the object stack is not empty, then the current object declaration is a nested one.
        // So we need to create the custom fqn to the type, and save it into the fqn map.
        if (typeNameMap.has(omniType)) {
          const existing = typeNameMap.get(omniType)!;
          const newPath = outerTypes.map(it => it.name.value).join('.');
          const existingPath = existing.outerTypes.map(it => it.name.value).join('.');
          throw new Error(`Has encountered duplicate declaration\nof: ${OmniUtil.describe(omniType)}'\nnew at: '${newPath}'\nexisting at: ${existingPath}`);
        }

        // TODO: This is likely wrong -- it should be added as option to AstNameResolver
        if (targetOptions.shortenNestedTypeNames && objectStack.length > 0) {

          for (let i = objectStack.length - 1; i >= 0; i--) {
            const closestOtherTypeName = objectStack[i].name.value;
            if (className.length > closestOtherTypeName.length) {
              const subClassName = className.substring(0, closestOtherTypeName.length);
              if (subClassName == closestOtherTypeName) {
                const newClassName = className.substring(closestOtherTypeName.length);
                if (nameResolver.isReservedWord(newClassName)) {
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
          packageName: resolvedName.namespace,
          className: className,
          outerTypes: outerTypes,
          unit: unitStack[unitStack.length - 1],
        });
      },
    }));

    return typeNameMap;
  }
}
