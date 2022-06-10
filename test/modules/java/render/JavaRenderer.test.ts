import {JavaInterpreter} from '@java/interpret/JavaInterpreter';
import {TestUtils} from '@test';
import {DEFAULT_JAVA_OPTIONS} from '@java';
import {JavaRenderer} from '@java/render/JavaRenderer';
import {CompilationUnit} from '@cst/CompilationUnitCallback';
import * as JavaParser from 'java-parser';
import {ParsedJavaTestVisitor} from '@test/ParsedJavaTestVisitor';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Test the rendering of a CST tree to string', () => {

  test('Test that all examples can be rendered and parsed', async () => {

    for (const schemaName of TestUtils.getKnownSchemaNames()) {
      const fileNames = await TestUtils.listExampleFileNames(schemaName);
      for (const fileName of fileNames) {

        const model = await TestUtils.readExample(schemaName, fileName);

        const interpreter = new JavaInterpreter();
        const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

        const outDir = path.resolve(`./.target_test/${schemaName}/${path.basename(fileName, path.extname(fileName))}`);
        try {
          if ((await fs.stat(outDir)).isDirectory()) {
            await fs.rm(outDir, {recursive: true, force: true});
          }
        } catch (ex) {
          // Ignore any error here and just hope for the best
        }

        await fs.mkdir(outDir, {recursive: true});

        const renderer = new JavaRenderer(async (cu) => {

          const outPath = `${outDir}/${cu.fileName}`;
          await fs.writeFile(outPath, cu.content);

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


// TODO:
// result.name = Name of the content that is being described. If the content described is a method parameter assignable by-name, this field SHALL define the parameter’s key (ie name).
