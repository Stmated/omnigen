import {JavaInterpreter} from '@java/interpret/JavaInterpreter';
import {TestUtils} from '@test';
import {DEFAULT_JAVA_OPTIONS} from '@java';
import {JavaRenderer} from '@java/render/JavaRenderer';
import {CompilationUnit} from '@cst/CompilationUnitCallback';
import * as JavaParser from 'java-parser';
import {ParsedJavaTestVisitor} from '@test/ParsedJavaTestVisitor';

describe('Test the rendering of a CST tree to string', () => {

  test('Test that all examples can be rendered and parsed', async () => {

    for (const schemaName of TestUtils.getKnownSchemaNames()) {
      const fileNames = await TestUtils.listExampleFileNames(schemaName);
      for (const fileName of fileNames) {

        const model = await TestUtils.readExample(schemaName, fileName);

        const interpreter = new JavaInterpreter();
        const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

        const renderer = new JavaRenderer((cu) => {

          let cst: JavaParser.CstNode;
          try {
            cst = JavaParser.parse(cu.content);
            expect(cst).toBeDefined();
          } catch (ex) {
            throw new Error(`Could not parse ${schemaName} ${fileName}: ${ex}`, {cause: ex instanceof Error ? ex : undefined});
          }

          const visitor = new ParsedJavaTestVisitor();
          visitor.visit(cst);
        });

        renderer.render(interpretation);
      }
    }
  });

  test('Test basic rendering', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'petstore-expanded.json');
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    expect(interpretation).toBeDefined();

    expect(interpretation.children).toHaveLength(model.types.length);

    const compilationUnits: CompilationUnit[] = [];
    const renderer = new JavaRenderer((cu) => {
      compilationUnits.push(cu);
    });

    renderer.render(interpretation);

    expect(compilationUnits).toBeDefined();
    expect(compilationUnits).toHaveLength(model.types.length);

    // const cst = JavaParser.parse(str);
    // expect(cst).toBeDefined();
    //
    // const visitor = new ParsedJavaTestVisitor();
    // visitor.visit(cst);
    //
    // expect(visitor.foundFields).toHaveLength(1);
    // expect(visitor.foundLiterals).toHaveLength(2);
    // expect(visitor.foundLiterals[0]).toEqual('"A Value"');
    // expect(visitor.foundLiterals[1]).toEqual(1.11);

    // TODO: We should assert actual useful stuff here :)

  });
});
