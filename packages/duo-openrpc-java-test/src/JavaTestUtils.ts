import * as JavaParser from 'java-parser';
import {
  RealOptions,
  AstRootNode,
  OmniModelParserResult,
  ExternalSyntaxTree,
  VisitorFactoryManager,
  AbstractStNode,
} from '@omnigen/core';
import {DEFAULT_OPENRPC_OPTIONS, OpenRpcParserOptions} from '@omnigen/parser-openrpc';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, JavaInterpreter, JavaRenderer, JavaVisitor} from '@omnigen/target-java';
import {OpenRpcTestUtils} from './OpenRpcTestUtils.js';
import {ParsedJavaTestVisitor} from '@omnigen/utils-test-target-java';
import {TestUtils} from '@omnigen/utils-test';
import {Java} from '@omnigen/target-java';

export const DEFAULT_TEST_JAVA_OPTIONS: JavaOptions = {
  ...DEFAULT_JAVA_OPTIONS,
  compressSoloReferencedTypes: false,
  compressUnreferencedSubTypes: false,
};

export class JavaTestUtils {

  public static async getFileContentsFromFile(
    fileName: string,
    javaOptions: JavaOptions = DEFAULT_TEST_JAVA_OPTIONS,
    openRpcOptions: OpenRpcParserOptions = DEFAULT_OPENRPC_OPTIONS,
  ): Promise<Map<string, string>> {

    const parseResult = await OpenRpcTestUtils.readExample('openrpc', fileName, openRpcOptions, javaOptions);
    return this.getFileContentsFromParseResult(parseResult, []);
  }

  public static async getRootNodeFromParseResult(
    parseResult: OmniModelParserResult<JavaOptions>,
    externals: ExternalSyntaxTree<AstRootNode, JavaOptions>[] = [],
  ): Promise<AstRootNode> {
    return new JavaInterpreter(parseResult.options).buildSyntaxTree(parseResult.model, externals, parseResult.options);
  }

  public static async getFileContentsFromParseResult(
    parseResult: OmniModelParserResult<JavaOptions>,
    externals: ExternalSyntaxTree<AstRootNode, JavaOptions>[] = [],
  ): Promise<Map<string, string>> {

    const interpretation = await this.getRootNodeFromParseResult(parseResult, externals);
    return JavaTestUtils.getFileContents(parseResult.options, interpretation);
  }

  public static async getFileContentsFromRootNode(rootNode: AstRootNode, options: RealOptions<JavaOptions>): Promise<Map<string, string>> {
    return JavaTestUtils.getFileContents(options, rootNode);
  }

  public static getFileContents(javaOptions: RealOptions<JavaOptions>, interpretation: AstRootNode): Map<string, string> {
    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(javaOptions, cu => {
      fileContents.set(cu.fileName, cu.content);
    });
    renderer.render(interpretation);
    return fileContents;
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

  public static getMethod(node: AbstractStNode, name: string): Java.MethodDeclaration {

    const visitor = VisitorFactoryManager.create(new JavaVisitor<Java.MethodDeclaration>(), {
      visitMethodDeclaration: node => {
        if (node.signature.identifier.value == name) {
          return node;
        } else {
          return undefined;
        }
      },
    });

    const result = TestUtils.flatten(node.visit(visitor));
    if (!result) {
      throw new Error(`Could not find '${name}'`);
    }

    return result;
  }

  public static getCompilationUnits(root: AstRootNode): Java.CompilationUnit[] {

    const array: Java.CompilationUnit[] = [];
    const visitor = VisitorFactoryManager.create(new JavaVisitor(), {
      visitCompilationUnit: node => {
        array.push(node);
      },
    });

    root.visit(visitor);

    return array;
  }

  public static getCompilationUnit(root: AstRootNode, name: string): Java.CompilationUnit {

    const visitor = VisitorFactoryManager.create(new JavaVisitor<Java.CompilationUnit>(), {
      visitCompilationUnit: node => {
        if (node.object.name.value == name) {
          return node;
        } else {
          return undefined;
        }
      },
    });

    const result = TestUtils.flatten(root.visit(visitor));
    if (!result) {
      throw new Error(`Could not find '${name}'`);
    }

    return result;
  }

}
