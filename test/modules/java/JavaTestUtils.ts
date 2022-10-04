import * as JavaParser from 'java-parser';
import {DEFAULT_JAVA_OPTIONS, IJavaOptions, JavaInterpreter, JavaRenderer} from '@java';
import {ParsedJavaTestVisitor, TestUtils} from '@test';
import {AstRootNode} from '../../../src/ast/AstRootNode';
import {OmniModelParserResult} from '@parse';
import {DEFAULT_OPENRPC_OPTIONS, IOpenRpcParserOptions,} from '@parse/openrpc';
import {RealOptions} from '@options';
import {ExternalSyntaxTree} from '@transform';

export const DEFAULT_TEST_JAVA_OPTIONS: RealOptions<IJavaOptions> = {
  ...DEFAULT_JAVA_OPTIONS,
  compressSoloReferencedTypes: false,
  compressUnreferencedSubTypes: false,
};

export class JavaTestUtils {

  public static async getFileContentsFromFile(
    fileName: string,
    javaOptions: IJavaOptions = DEFAULT_TEST_JAVA_OPTIONS,
    openRpcOptions: IOpenRpcParserOptions = DEFAULT_OPENRPC_OPTIONS
  ): Promise<Map<string, string>> {

    const parseResult = await TestUtils.readExample('openrpc', fileName, openRpcOptions, javaOptions);
    return await this.getFileContentsFromParseResult(parseResult, []);
  }

  public static async getRootNodeFromParseResult(
    parseResult: OmniModelParserResult<IJavaOptions>,
    externals: ExternalSyntaxTree<AstRootNode, IJavaOptions>[] = []
  ): Promise<AstRootNode> {
    return await new JavaInterpreter().buildSyntaxTree(parseResult.model, externals, parseResult.options);
  }

  public static async getFileContentsFromParseResult(
    parseResult: OmniModelParserResult<IJavaOptions>,
    externals: ExternalSyntaxTree<AstRootNode, IJavaOptions>[] = []
  ): Promise<Map<string, string>> {

    const interpretation = await this.getRootNodeFromParseResult(parseResult, externals);
    return JavaTestUtils.getFileContents(parseResult.options, interpretation);
  }

  public static async getFileContentsFromRootNode(rootNode: AstRootNode, options: RealOptions<IJavaOptions>): Promise<Map<string, string>> {
    return JavaTestUtils.getFileContents(options, rootNode);
  }

  public static getFileContents(javaOptions: RealOptions<IJavaOptions>, interpretation: AstRootNode): Map<string, string> {
    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(javaOptions, (cu) => {
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
      expect(cst).toBeDefined();
    } catch (ex) {
      throw new Error(`Could not parse '${fileName}'': ${ex}:\n${content}`, {cause: ex instanceof Error ? ex : undefined});
    }

    const visitor = new ParsedJavaTestVisitor();
    visitor.visit(cst);

    return visitor;
  }
}
