import * as JavaParser from 'java-parser';
import {
  AstNode,
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_PARSER_OPTIONS,
  ModelTransformOptions,
  PackageOptions,
  ParserOptions,
  RenderedCompilationUnit,
  TargetOptions,
  ZodTargetOptions,
} from '@omnigen/core';
import {createJavaVisitor, Java, JavaOptions, SerializationLibrary, ZodJavaOptions} from '@omnigen/target-java';
import {ParsedJavaTestVisitor} from '@omnigen/utils-test-target-java';
import {TestUtils} from '@omnigen/utils-test';
import {Util, ZodCompilationUnitsContext} from '@omnigen/core-util';
import {PluginManager} from '@omnigen/plugin';
import {BaseContext, FileContext, TargetContext} from '@omnigen/core-plugin';
import {z, ZodObject} from 'zod';
import {LoggerFactory} from '@omnigen/core-log';
import {OpenRpcPlugin} from '@omnigen/parser-openrpc';

const logger = LoggerFactory.create(import.meta.url);

export const DEFAULT_TEST_JAVA_OPTIONS: JavaOptions = {
  ...ZodJavaOptions.parse({}),
  serializationLibrary: SerializationLibrary.POJO,
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

    const filePath = Util.getPathFromRoot(`./packages/parser-${source}/examples/${fileName}`);
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

  public static getCompilationUnits(root: AstNode): Java.CompilationUnit[] {

    const array: Java.CompilationUnit[] = [];
    const visitor = createJavaVisitor({
      visitCompilationUnit: node => array.push(node),
    });

    root.visit(visitor);

    return array;
  }

  public static getCompilationUnit(root: AstNode, name: string): Java.CompilationUnit {

    const visitor = createJavaVisitor({
      visitCompilationUnit: node => {
        if (node.children[0].name.value == name) {
          return node;
        } else {
          return undefined;
        }
      },
    });

    const result = TestUtils.flatten(visitor.visit(root, visitor));
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
