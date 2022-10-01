import * as JavaParser from 'java-parser';
import {DEFAULT_JAVA_OPTIONS, IJavaOptions} from '@java';
import {KnownSchemaNames, TestUtils} from '../../TestUtils';
import {CstRootNode} from '@cst/CstRootNode';
import {ParsedJavaTestVisitor} from '../../ParsedJavaTestVisitor';
import {JavaRenderer} from '@java/render/JavaRenderer';
import {JavaInterpreter} from '@java';
import {
  IOpenRpcParserOptions,
} from '../../../src';
import {RealOptions} from '../../../src/options';
import {DEFAULT_PARSER_OPTIONS} from '../../../src/parse/IParserOptions';
import {JSONRPC_20_PARSER_OPTIONS} from '../../../src/parse/openrpc/JsonRpcOptions';

export class JavaTestUtils {

  public static async getFileContentsFromFile(
    fileName: string,
    type: KnownSchemaNames = 'openrpc',
    javaOptions: IJavaOptions = DEFAULT_JAVA_OPTIONS,
    openRpcOptions: IOpenRpcParserOptions = {...DEFAULT_PARSER_OPTIONS, ...JSONRPC_20_PARSER_OPTIONS}
  ): Promise<Map<string, string>> {

    const parseResult = await TestUtils.readExample(type, fileName, openRpcOptions, javaOptions);

    const interpretation = await new JavaInterpreter().buildSyntaxTree(parseResult.model, parseResult.options);
    return JavaTestUtils.getFileContents(parseResult.options, interpretation);
  }

  public static getFileContents(javaOptions: RealOptions<IJavaOptions>, interpretation: CstRootNode): Map<string, string> {
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
