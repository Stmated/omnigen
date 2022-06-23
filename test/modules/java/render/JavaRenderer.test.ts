import {TestUtils} from '@test';
import {JavaInterpreter} from '@java/interpret/JavaInterpreter';
import {DEFAULT_JAVA_OPTIONS} from '@java';
import {JavaRenderer} from '@java/render/JavaRenderer';
import {CompilationUnit} from '@cst/CompilationUnitCallback';
import * as JavaParser from 'java-parser';
import {ParsedJavaTestVisitor} from '@test/ParsedJavaTestVisitor';
import * as fs from 'fs/promises';
import * as path from 'path';
import {GenericModelUtil} from '../../../../src/parse/GenericModelUtil';
import {GenericEndpoint, GenericModel, GenericOutput, GenericProperty, GenericTypeKind} from '../../../../src';

// const SegfaultHandler = require('segfault-handler');
// SegfaultHandler.registerHandler('crash.log');

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
    const model = await TestUtils.readExample('openrpc', 'petstore-expanded.json');
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    expect(interpretation).toBeDefined();

    const allTypes1 = GenericModelUtil.getAllExportableTypes(model, model.types);
    expect(interpretation.children).toHaveLength(allTypes1.length);

    const compilationUnits: CompilationUnit[] = [];
    const renderer = new JavaRenderer((cu) => {
      compilationUnits.push(cu);
    });

    renderer.render(interpretation);

    expect(compilationUnits).toBeDefined();

    const allTypes2 = GenericModelUtil.getAllExportableTypes(model, model.types);
    expect(compilationUnits).toHaveLength(allTypes2.length);

    // TODO: We should assert actual useful stuff here :)

  });

  test('Test specific rendering', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'description-inheritance.json');
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const renderer = new JavaRenderer((cu) => {
    });

    const content = renderer.render(interpretation);

    expect(content).toBeDefined();
  });

  test('Test inheritance of descriptions', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'description-inheritance.json');

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

    const renderer = new JavaRenderer((cu) => {
    });

    const content = renderer.render(interpretation);

    expect(content).toBeDefined();
  });
});

function getEndpoint(model: GenericModel, endpointName: string): GenericEndpoint {
  const endpoint = model.endpoints.find(it => it.name == endpointName);
  if (!endpoint) {
    throw new Error(`No endpoint called ${endpointName}`);
  }

  return endpoint;
}

function getEndpointResult(model: GenericModel, endpointName: string): GenericOutput {
  const endpoint = getEndpoint(model, endpointName);
  if (endpoint.responses.length == 0) {
    throw new Error(`There are no responses in ${endpointName}`);
  }

  return endpoint.responses[0];
}

function getEndpointResultProperty(model: GenericModel, endpointName: string, propertyName: string): GenericProperty {
  const result = getEndpointResult(model, endpointName);
  if (result.type.kind != GenericTypeKind.OBJECT) {
    throw new Error(`Cannot get property from ${endpointName} result since it's not an object`);
  }

  const property = result.type.properties?.find(it => it.name == propertyName);
  if (!property) {
    throw new Error(`There is no property called ${propertyName} in ${endpointName}`);
  }

  return property;
}

// TODO:
// result.name = Name of the content that is being described. If the content described is a method parameter assignable by-name, this field SHALL define the parameter’s key (ie name).
