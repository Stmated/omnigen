import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/api';
import {Code, CodeUtil} from '@omnigen/target-code';
import {JavaOptions} from '../options';
import {JavaAstRootNode} from '../ast/JavaAstRootNode.ts';
import {OmniUtil} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Places all files that are of the same package into one file, wrapped inside a container class, usually effectively creating a single file output.
 */
export class SingleFileJavaAstTransformer implements AstTransformer<JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<JavaAstRootNode, PackageOptions & TargetOptions & JavaOptions>): void {

    if (!args.options.singleFile) {

      // Single file not enabled. Might be a bad name for the option, since we can get multiple files. Should be called a desire to compress number of files to less.
      return;
    }

    const packageToClass = new Map<string, [Code.CompilationUnit, Code.ClassDeclaration]>();

    let unitFileName = args.options.singleFileName || 'Models.java';
    logger.debug(`Given single file name: ${unitFileName}`);
    if (!unitFileName.toLowerCase().endsWith('.java')) {
      unitFileName = `${unitFileName}.java`;
    }

    const unitClassName = CodeUtil.getSafeIdentifierName(unitFileName.substring(0, unitFileName.length - '.java'.length));

    const defaultVisitor = args.root.createVisitor();
    args.root.visit({
      ...defaultVisitor,
      visitCompilationUnit: n => {

        const packageFqn = n.packageDeclaration.fqn;
        const target = packageToClass.get(packageFqn);
        if (!target) {

          logger.debug(`Creating ${unitClassName} unit for package ${packageFqn}`);
          const created = this.createClass(unitClassName, packageFqn, args.options);

          packageToClass.set(packageFqn, created);
        }
      },
    });

    // TODO: Bad. The root's children should be immutable. Could be done if 'reduceRoot' existed
    const toKeep: Code.CompilationUnit[] = [];
    for (const [unit, clazz] of packageToClass.values()) {
      args.root.children.push(unit);
      toKeep.push(unit);
    }

    const packageStack: string[] = [];
    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceClassDeclaration: n => {
        return this.reduceByMerging(n, packageStack, packageToClass);
      },
      reduceEnumDeclaration: n => {
        return this.reduceByMerging(n, packageStack, packageToClass);
      },
      reduceInterfaceDeclaration: n => {
        return this.reduceByMerging(n, packageStack, packageToClass);
      },
      reduceCompilationUnit: (n, r) => {

        if (toKeep.includes(n)) {
          // Do not dive into this unit, since it is our new compact one.
          return n;
        }

        try {
          // If the unit ends up being empty, that should result in the unit being removed based on other reductions.
          packageStack.push(n.packageDeclaration.fqn);
          return defaultReducer.reduceCompilationUnit(n, r);
        } finally {
          packageStack.pop();
        }
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private reduceByMerging(
    n: Code.AbstractObjectDeclaration,
    packageStack: string[],
    packageToClass: Map<string, [Code.CompilationUnit, Code.ClassDeclaration]>,
  ) {

    const currentPackage = packageStack[packageStack.length - 1];
    const target = packageToClass.get(currentPackage);
    if (target) {

      logger.trace(`Target class found for ${n.name.value}, we will move it to ${currentPackage}'s ${OmniUtil.describe(target[1].omniType)}`);

      if (n instanceof Code.ClassDeclaration && !n.modifiers.children.some(it => it.kind === Code.ModifierKind.STATIC)) {
        n.modifiers.children.push(new Code.Modifier(Code.ModifierKind.STATIC));
      }

      target[1].body.children.push(n);
      return undefined;
    } else {
      logger.debug(`No target found for ${n.name.value}`);
    }

    return n;
  }

  private createClass(unitClassName: string, packageFqn: string, options: JavaOptions): [Code.CompilationUnit, Code.ClassDeclaration] {

    const unit = new Code.CompilationUnit(
      new Code.PackageDeclaration(packageFqn),
      new Code.ImportList(),
    );

    const classDec = new Code.ClassDeclaration(
      new Code.EdgeType({kind: OmniTypeKind.OBJECT, name: unitClassName, properties: []}),
      // TODO: Should it even be needed to have the name on the declaration, should the name not be calculated from the type's name?
      new Code.Identifier(unitClassName),
      new Code.Block(),
      new Code.ModifierList(
        new Code.Modifier(Code.ModifierKind.PUBLIC),
      ),
    );

    if (options.relaxedInspection) {
      classDec.annotations = new Code.AnnotationList(
        new Code.Annotation(
          new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['java', 'lang'], edgeName: 'SuppressWarnings'}}),
          new Code.AnnotationKeyValuePairList(
            new Code.AnnotationKeyValuePair(
              undefined,
              new Code.Literal('unused'),
            ),
          ),
        ),
      );
    }

    unit.children.push(classDec);

    return [unit, classDec];
  }
}
