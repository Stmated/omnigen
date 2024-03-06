import * as JavaParser from 'java-parser';
import {
  AstNode,
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_PARSER_OPTIONS,
  ExternalSyntaxTree,
  ModelTransformOptions,
  OmniModelParserResult,
  PackageOptions,
  ParserOptions,
  RenderedCompilationUnit,
  TargetOptions,
  ZodAstNodeContext,
  ZodTargetOptions,
} from '@omnigen/core';
import {
  JAVA_FEATURES,
  Java,
  JavaPlugins,
  JavaOptions,
  ZodJavaOptions, createJavaVisitor, createJavaRenderer,
} from '@omnigen/target-java';
import {ParsedJavaTestVisitor} from '@omnigen/utils-test-target-java';
import {TestUtils} from '@omnigen/utils-test';
import {ZodCompilationUnitsContext} from '@omnigen/core-util';
import {PluginManager} from '@omnigen/plugin';
import {BaseContext, FileContext, TargetContext} from '@omnigen/core-plugin';
import {z, ZodObject} from 'zod';
import {LoggerFactory} from '@omnigen/core-log';
import {OpenRpcPlugin} from '@omnigen/parser-openrpc';

const logger = LoggerFactory.create(import.meta.url);

export const DEFAULT_TEST_JAVA_OPTIONS: JavaOptions = {
  ...ZodJavaOptions.parse({}),
};

export const DEFAULT_TEST_TARGET_OPTIONS: TargetOptions = {
  ...ZodTargetOptions.parse({}),
  compressSoloReferencedTypes: false,
  compressUnreferencedSubTypes: false,
};

export interface JavaTestUtilsOptions {
  parserOptions?: ParserOptions,
  modelTransformOptions?: ModelTransformOptions,
  targetOptions?: TargetOptions,
  packageOptions?: PackageOptions,
  javaOptions?: JavaOptions,
  arguments?: Record<string, any>,
}

export class JavaTestUtils {

  constructor() {
    logger.debug(`Loaded OpenRPC: ${OpenRpcPlugin}`);
  }

  public static async getFileContentsFromFile(fileName: string, options?: JavaTestUtilsOptions, source = 'openrpc'): Promise<Map<string, string>> {

    const filePath = `../parser-${source}/examples/${fileName}`;
    const result = await JavaTestUtils.getResultFromFilePath(filePath, options || {}, ZodCompilationUnitsContext);

    return JavaTestUtils.cuToContentMap(result.compilationUnits);
  }

  public static async getResultFromFilePath<
    E extends ZodObject<any>,
    S extends ZodObject<any>
  >(
    filePath: string,
    options: JavaTestUtilsOptions,
    expected: E,
    stopAt?: S,
  ): Promise<z.output<E>> {

    const all: Required<typeof options> = {
      parserOptions: options.parserOptions ?? DEFAULT_PARSER_OPTIONS,
      modelTransformOptions: options.modelTransformOptions ?? DEFAULT_MODEL_TRANSFORM_OPTIONS,
      targetOptions: options.targetOptions ?? DEFAULT_TEST_TARGET_OPTIONS,
      packageOptions: options.packageOptions ?? DEFAULT_PACKAGE_OPTIONS,
      javaOptions: options.javaOptions ?? DEFAULT_TEST_JAVA_OPTIONS,
      arguments: options.arguments ?? {},
    };

    const ctx: BaseContext & FileContext & TargetContext = {
      file: filePath,
      // target: 'java', // <-- implicit, because we have no other target plugin in this package
      arguments: {
        ...all.modelTransformOptions,
        ...all.parserOptions,
        ...all.targetOptions,
        ...all.packageOptions,
        ...all.javaOptions,
        ...all.arguments,
      },
    };

    const pm = new PluginManager({includeAuto: true});
    const result = await pm.execute({ctx: ctx, debug: true, stopAt: stopAt});
    const last = result.results[result.results.length - 1];

    return expected.parse(last.ctx) as z.output<E>;
  }

  public static getParsedContent(fileContents: Map<string, string>, fileName: string): ParsedJavaTestVisitor {

    const content = fileContents.get(fileName) || '';
    let cst: JavaParser.CstNode;
    try {
      cst = JavaParser.parse(content);
      if (!cst) {
        throw new Error(`The JavaParser must return something`);
      }

    } catch (ex) {
      throw new Error(`Could not parse '${fileName}'': ${ex}:\n${content}`, {cause: ex instanceof Error ? ex : undefined});
    }

    const visitor = new ParsedJavaTestVisitor();
    visitor.visit(cst);

    return visitor;
  }

  public static async getRootNodeFromParseResult(
    parseResult: OmniModelParserResult<JavaOptions & PackageOptions & TargetOptions>,
    externals: ExternalSyntaxTree<AstNode, JavaOptions>[] = [],
  ): Promise<AstNode> {

    const typed = await JavaTestUtils.getResultFromParseResult(parseResult, externals, ZodAstNodeContext);
    return typed.astNode;
  }

  public static async getFileContentsFromParseResult(
    parseResult: OmniModelParserResult<JavaOptions & PackageOptions & TargetOptions>,
    externals: ExternalSyntaxTree<AstNode, JavaOptions>[] = [],
  ): Promise<Map<string, string>> {

    const typed = await JavaTestUtils.getResultFromParseResult(parseResult, externals, ZodCompilationUnitsContext);
    return JavaTestUtils.cuToContentMap(typed.compilationUnits);
  }

  public static async getResultFromParseResult<Z extends ZodObject<any>>(
    parseResult: OmniModelParserResult<JavaOptions & PackageOptions & TargetOptions>,
    externals: ExternalSyntaxTree<AstNode, JavaOptions>[] = [],
    stopAt: Z,
  ): Promise<z.output<Z>> {

    const ctx: z.output<typeof JavaPlugins.ZodJavaContextIn> = {
      target: 'java',
      model: parseResult.model,
      modelTransformOptions: DEFAULT_MODEL_TRANSFORM_OPTIONS,
      parserOptions: DEFAULT_PARSER_OPTIONS,
      packageOptions: parseResult.options,
      targetOptions: parseResult.options,
      javaOptions: parseResult.options,
      targetFeatures: JAVA_FEATURES,
      arguments: {},
    };

    // TODO: Need to be able to send along the externals!
    //  Then later remake the system so can register types between different schemas!
    // TODO: Need to be able to send along a "startAt" to skip any early plugins! So we can send our model without going through any of the earlier stuff!!!

    const pm = new PluginManager({includeAuto: true});
    const result = await pm.execute({
      ctx: ctx,
      debug: true,
      stopAt: stopAt,
    });
    const last = result.results[result.results.length - 1];

    const typed = stopAt.safeParse(last.ctx);
    if (!typed.success) {
      throw new Error(typed.error.message);
    }

    return typed.data;
  }

  public static async getFileContentsFromRootNode(rootNode: AstNode, options: JavaOptions): Promise<Map<string, string>> {

    const renderer = createJavaRenderer(options);
    const cus = renderer.executeRender(rootNode, renderer);
    return JavaTestUtils.cuToContentMap(cus);
  }

  public static getMethod(node: AstNode, name: string): Java.MethodDeclaration {

    const visitor = createJavaVisitor({
      visitMethodDeclaration: node => {
        if (node.signature.identifier.value == name) {
          return node;
        } else {
          return undefined;
        }
      },
    });

    // const visitor = VisitorFactoryManager.create(new JavaVisitor<Java.MethodDeclaration>(), {
    //   visitMethodDeclaration: node => {
    //     if (node.signature.identifier.value == name) {
    //       return node;
    //     } else {
    //       return undefined;
    //     }
    //   },
    // });

    const result = TestUtils.flatten(node.visit(visitor));
    if (!result) {
      throw new Error(`Could not find '${name}'`);
    }

    return result;
  }

  public static getCompilationUnits(root: AstNode): Java.CompilationUnit[] {

    const array: Java.CompilationUnit[] = [];
    const visitor = createJavaVisitor({
      visitCompilationUnit: node => array.push(node),
    });

    // const visitor = VisitorFactoryManager.create(new JavaVisitor(), {
    //   visitCompilationUnit: node => {
    //     array.push(node);
    //   },
    // });

    root.visit(visitor);

    return array;
  }

  public static getCompilationUnit(root: AstNode, name: string): Java.CompilationUnit {

    const visitor = createJavaVisitor({
      visitCompilationUnit: node => {
        if (node.object.name.value == name) {
          return node;
        } else {
          return undefined;
        }
      },
    });

    // const visitor = VisitorFactoryManager.create(new JavaVisitor<Java.CompilationUnit>(), {
    //   visitCompilationUnit: node => {
    //
    //   },
    // });

    const result = TestUtils.flatten(root.visit(visitor));
    if (!result) {
      throw new Error(`Could not find '${name}'`);
    }

    return result;
  }

  public static cuToContentMap(compilationUnits: RenderedCompilationUnit[]) {
    const fileContents = new Map<string, string>();

    for (const render of compilationUnits) {
      fileContents.set(render.fileName, render.content);
    }

    return fileContents;
  }
}
