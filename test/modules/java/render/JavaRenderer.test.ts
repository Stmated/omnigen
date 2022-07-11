import {TestUtils} from '@test';
import {JavaInterpreter} from '@java/interpret/JavaInterpreter';
import {DEFAULT_JAVA_OPTIONS, JavaOptions} from '@java';
import {JavaRenderer} from '@java/render/JavaRenderer';
import {CompilationUnit} from '@cst/CompilationUnitCallback';
import * as JavaParser from 'java-parser';
import {ParsedJavaTestVisitor} from '@test/ParsedJavaTestVisitor';
import * as fs from 'fs/promises';
import * as path from 'path';
import {OmniEndpoint, OmniModel, OmniOutput} from '@parse';

// const SegfaultHandler = require('segfault-handler');
// SegfaultHandler.registerHandler('crash.log');

describe('Java Rendering', () => {

  const javaOptions: JavaOptions = DEFAULT_JAVA_OPTIONS;

  test('parseRenderOutputAll', async () => {

    for (const schemaName of TestUtils.getKnownSchemaNames()) {

      let fileNames: string[];
      try {
        fileNames = await TestUtils.listExampleFileNames(schemaName);
      } catch (ex) {
        throw new Error(`Could not list filenames inside ${schemaName}: ${ex}`, {cause: ex instanceof Error ? ex : undefined});
      }

      for (const fileName of fileNames) {

        const model = await TestUtils.readExample(schemaName, fileName, DEFAULT_JAVA_OPTIONS);

        const interpreter = new JavaInterpreter();
        const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

        let outDir: string;

        try {
          outDir = path.resolve(`./.target_test/${schemaName}/${path.basename(fileName, path.extname(fileName))}`);
        } catch (ex) {
          throw new Error(`Could not resolve path of ${fileName}`)
        }

        try {
          if ((await fs.stat(outDir)).isDirectory()) {
            await fs.rm(outDir, {recursive: true, force: true});
          }
        } catch (ex) {
          // Ignore any error here and just hope for the best
        }

        await fs.mkdir(outDir, {recursive: true});

        const renderer = new JavaRenderer(javaOptions, async (cu) => {

          if (cu.fileName.indexOf('#') !== -1) {
            throw new Error(`# not allowed in CU '${cu.fileName}'`);
          }

          const outPath = `${outDir}/${cu.fileName}`;

          try {
            await fs.writeFile(outPath, cu.content);
          } catch (ex) {
            throw new Error(`Could not write '${outPath}' of '${fileName}': ${ex}`, {cause: ex instanceof Error ? ex : undefined});
          }

          let cst: JavaParser.CstNode;
          try {
            cst = JavaParser.parse(cu.content);
            expect(cst).toBeDefined();
          } catch (ex) {
            throw new Error(`Could not parse '${schemaName}' '${fileName}' in '${outPath}': ${ex}`, {cause: ex instanceof Error ? ex : undefined});
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
    const model = await TestUtils.readExample('openrpc', 'petstore-expanded.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    expect(interpretation).toBeDefined();

    // const allTypes1 = OmniModelUtil.getAllExportableTypes(model, model.types);
    expect(interpretation.children).toHaveLength(21);

    const compilationUnits: CompilationUnit[] = [];
    const renderer = new JavaRenderer(javaOptions, (cu) => {
      compilationUnits.push(cu);
    });

    renderer.render(interpretation);

    expect(compilationUnits).toBeDefined();

    // const allTypes2 = OmniModelUtil.getAllExportableTypes(model, model.types);
    expect(compilationUnits).toHaveLength(21);

    // TODO: We should assert actual useful stuff here :)
  });

  test('Test specific rendering', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'bank.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const renderer = new JavaRenderer(javaOptions, (cu) => {
    });

    const content = renderer.render(interpretation);

    expect(content).toBeDefined();
  });

  test('Test inheritance of descriptions', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'description-inheritance.json', DEFAULT_JAVA_OPTIONS);

    // TODO: Assert every single description, make sure things are inherited just as we want them to be
    // TODO: There are *LOTS* of bugs here, we should make sure it is EXACTLY like we want it to be
    // TODO: Comments can end up with the wrong names of classes, since they are not fully set until LATE

    // const resultSchemaPropertyA = getEndpointResultProperty(model, 'method', 'ResultSchemaPropertyA');

    // expect(resultSchemaPropertyA.description)
    //   .toEqual('components_schemas_ResultSchema_allOf_inline_properties_ResultSchemaPropertyA_description');

    // AbstractOne.description: components_schemas_AbstractOne_description
    // ResultSchema.description: components_schemas_ResultSchema_description
    // endpoint.method.description: methods_method_description

    // endpoint.method.result.type.name = MethodResponse ---- but should be ResultDescriptor? Right??? Keep names as close to Spec IF POSSIBLE, yes?

    // ResultDescriptor.name: ResultDescriptor (taken from $ref of methods/method/result/ref
    //

    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const renderer = new JavaRenderer(javaOptions, (cu) => {
    });

    const content = renderer.render(interpretation);

    expect(content).toBeDefined();
  });
});

function getEndpoint(model: OmniModel, endpointName: string): OmniEndpoint {
  const endpoint = model.endpoints.find(it => it.name == endpointName);
  if (!endpoint) {
    throw new Error(`No endpoint called ${endpointName}`);
  }

  return endpoint;
}

function getEndpointResult(model: OmniModel, endpointName: string): OmniOutput {
  const endpoint = getEndpoint(model, endpointName);
  if (endpoint.responses.length == 0) {
    throw new Error(`There are no responses in ${endpointName}`);
  }

  return endpoint.responses[0];
}
