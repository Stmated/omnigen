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

describe('Java Rendering', () => {

  const javaOptions: JavaOptions = DEFAULT_JAVA_OPTIONS;

  test('renderAll', async () => {

    jest.setTimeout(10_000);
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
    const model = await TestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const renderer = new JavaRenderer(javaOptions, (cu) => {
    });

    const content = renderer.render(interpretation);

    expect(content).toBeDefined();
  });

  test('Test multiple inheritance (interfaces)', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'multiple-inheritance.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(javaOptions, (cu) => {
      fileContents.set(cu.fileName, cu.content);
    });
    renderer.render(interpretation);

    const fileNames = [...fileContents.keys()];
    expect(fileNames).toContain('A.java');
    expect(fileNames).toContain('Abs.java');
    expect(fileNames).toContain('AxOrB.java'); // TODO: Bad naming, it looks weird. Fix?
    expect(fileNames).toContain('B.java');
    expect(fileNames).toContain('C.java');
    expect(fileNames).not.toContain('InterfaceOfA.java');
    expect(fileNames).toContain('InterfaceOfB.java');
    expect(fileNames).toContain('InterfaceOfC.java');
    expect(fileNames).toContain('Out_2.java');

    const a = getParsedContent(fileContents, 'A.java');
    expect(a.foundFields).toHaveLength(1);
    expect(a.foundFields[0].names).toHaveLength(1);
    expect(a.foundFields[0].names[0]).toEqual('foo');
    expect(a.foundMethods).toHaveLength(1);
    expect(a.foundMethods[0]).toEqual('getFoo');
    expect(a.foundSuperClasses).toHaveLength(1);
    expect(a.foundSuperInterfaces).toHaveLength(0);

    const b = getParsedContent(fileContents, 'B.java');
    expect(b.foundSuperClasses).toHaveLength(1);
    expect(b.foundSuperInterfaces).toHaveLength(1);
    expect(b.foundMethods).toHaveLength(1);
    expect(b.foundSuperClasses).toContain('Abs');
    expect(b.foundSuperInterfaces).toContain('InterfaceOfB');

    const c = getParsedContent(fileContents, 'C.java');
    expect(c.foundSuperClasses).toHaveLength(1);
    expect(c.foundSuperInterfaces).toHaveLength(1);
    expect(c.foundMethods).toHaveLength(1);
    expect(c.foundSuperClasses).toContain('Abs');
    expect(c.foundSuperInterfaces).toContain('InterfaceOfC');

    const eitherAorB = getParsedContent(fileContents, 'AxOrB.java');
    expect(eitherAorB.foundFields).toHaveLength(3);
    expect(eitherAorB.foundFields[0].names[0]).toEqual('_raw');
    expect(eitherAorB.foundFields[1].names[0]).toEqual('_a');
    expect(eitherAorB.foundFields[2].names[0]).toEqual('_b');
    expect(eitherAorB.foundSuperClasses).toHaveLength(0);
    expect(eitherAorB.foundSuperInterfaces).toHaveLength(0);

    const out2 = getParsedContent(fileContents, 'Out_2.java');
    expect(out2.foundFields).toHaveLength(2);
    expect(out2.foundFields[0].names[0]).toEqual('bar');
    expect(out2.foundFields[1].names[0]).toEqual('xyz');
    expect(out2.foundSuperClasses).toHaveLength(1);
    expect(out2.foundSuperInterfaces).toHaveLength(2);
    expect(out2.foundSuperClasses[0]).toEqual('A');
    expect(out2.foundSuperInterfaces[0]).toEqual('InterfaceOfB');
    expect(out2.foundSuperInterfaces[1]).toEqual('InterfaceOfC');
  });

  test('Enum', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'enum.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(javaOptions, (cu) => {
      fileContents.set(cu.fileName, cu.content);
    });

    renderer.render(interpretation);

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(15);
    expect(filenames).toContain('Tag.java');
    expect(filenames).toContain('TagCopy.java');
    expect(filenames).toContain('TagOrSpeciesOrString.java');
    // If it contains the below one, then the composite class has been incorrectly named
    expect(filenames).not.toContain('TagXOrTagOrString.java');

    const tag = getParsedContent(fileContents, 'Tag.java');
    expect(tag.foundMethods).toHaveLength(0);
    expect(tag.foundSuperClasses).toHaveLength(0);
    expect(tag.foundSuperInterfaces).toHaveLength(0);
    expect(tag.foundFields).toHaveLength(1);
    expect(tag.foundFields[0].names).toHaveLength(1);
    expect(tag.foundFields[0].names[0]).toEqual('value');
    expect(tag.foundLiterals).toHaveLength(5);
    expect(tag.foundLiterals[2]).toEqual("\"TagA\"");
    expect(tag.foundLiterals[3]).toEqual("\"TagB\"");
    expect(tag.foundLiterals[4]).toEqual("\"TagC\"");

    const tagOrString = getParsedContent(fileContents, 'TagOrSpeciesOrString.java');
    expect(tagOrString.foundMethods).toHaveLength(7);
    expect(tagOrString.foundMethods[0]).toEqual("get");
    expect(tagOrString.foundMethods[1]).toEqual("getValue");
    expect(tagOrString.foundMethods[2]).toEqual("isKnown");
    expect(tagOrString.foundMethods[3]).toEqual("isTag");
    expect(tagOrString.foundMethods[4]).toEqual("getAsTag");
    expect(tagOrString.foundMethods[5]).toEqual("isSpecies");
    expect(tagOrString.foundMethods[6]).toEqual("getAsSpecies");
    expect(tagOrString.foundSuperClasses).toHaveLength(0);
    expect(tagOrString.foundSuperInterfaces).toHaveLength(0);
    expect(tagOrString.foundFields).toHaveLength(9);
    expect(tagOrString.foundLiterals).toHaveLength(10);
    expect(tagOrString.foundLiterals[2]).toEqual("\"TagA\"");
    expect(tagOrString.foundLiterals[3]).toEqual("\"TagB\"");
    expect(tagOrString.foundLiterals[4]).toEqual("\"TagC\"");
    expect(tagOrString.foundLiterals[5]).toEqual("\"SpeciesA\"");
    expect(tagOrString.foundLiterals[6]).toEqual("\"SpeciesB\"");
    expect(tagOrString.foundLiterals[7]).toEqual("\"foo\"");
    expect(tagOrString.foundLiterals[8]).toEqual(1337);
  });

  test('AdditionalProperties', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'additional-properties.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(javaOptions, (cu) => {
      fileContents.set(cu.fileName, cu.content);
    });

    renderer.render(interpretation);

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(11);
    expect(filenames).toContain('Thing.java');
    expect(filenames).toContain('IAdditionalProperties.java');

    const thing = getParsedContent(fileContents, 'Thing.java');
    expect(thing.foundMethods).toHaveLength(3);
    expect(thing.foundMethods[0]).toEqual('getId');
    expect(thing.foundMethods[1]).toEqual('addAdditionalProperty');
    expect(thing.foundMethods[2]).toEqual('getAdditionalProperties');
    expect(thing.foundSuperInterfaces).toHaveLength(1);
    expect(thing.foundSuperInterfaces[0]).toEqual('IAdditionalProperties');
    expect(thing.foundFields).toHaveLength(2);
    expect(thing.foundFields[0].names[0]).toEqual('id');
    expect(thing.foundFields[1].names[0]).toEqual('_additionalProperties');

    const additional = getParsedContent(fileContents, 'IAdditionalProperties.java');
    expect(additional.foundMethods).toHaveLength(1);
    expect(additional.foundMethods[0]).toEqual('getAdditionalProperties');
    expect(additional.foundSuperClasses).toHaveLength(0);
    expect(additional.foundSuperInterfaces).toHaveLength(0);
    expect(additional.foundFields).toHaveLength(0);
  });

  test('ErrorStructure', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'error-structure.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(javaOptions, (cu) => {
      fileContents.set(cu.fileName, cu.content);
    });

    renderer.render(interpretation);

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(11);
    expect(filenames).toContain('Thing.java');

    // Error according to spec 2.0:
    // {"jsonrpc": "2.0", "result": 19, "id": 3}
    // {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null},

    // Error according to spec 1.1:
    // {"version": "1.1", "result": "done", "error": null, "id": "194521489"}

    // Error according to spec 1.0:
    // {"result": "Hello JSON-RPC", "error": null, "id": 1}

    const thing = getParsedContent(fileContents, 'Thing.java');

    // Reserved: -32768 to -32000
    // -32700	Parse error	Invalid JSON was received by the server.  An error occurred on the server while parsing the JSON text.
    // -32600	Invalid Request	The JSON sent is not a valid Request object.
    // -32601	Method not found	The method does not exist / is not available.
    // -32602	Invalid params	Invalid method parameter(s).
    // -32603	Internal error	Internal JSON-RPC error.
    // -32000 to -32099	Server error	Reserved for implementation-defined server-errors.
  });

  test('ErrorStructure-Custom', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'error-structure-custom.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(javaOptions, (cu) => {
      fileContents.set(cu.fileName, cu.content);
    });

    renderer.render(interpretation);

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(11);
    expect(filenames).toContain('Thing.java');

    // Error according to corporate:
    // {
    //   "version": "1.1",
    //   "error": {
    //   "name": "JSONRPCError",
    //     "code": 616,
    //     "message": "ERROR_INVALID_CREDENTIALS",
    //     "error": {
    //     "signature": "R9+hjuMqbsH0Ku ... S16VbzRsw==",
    //       "uuid": "258a2184-2842-b485-25ca-293525152425",
    //       "method": "Deposit",
    //       "data": {
    //       "code" : 616,
    //         "message" : "ERROR_INVALID_CREDENTIALS"
    //     }
    //   }
    // }
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

function getParsedContent(fileContents: Map<string, string>, fileName: string): ParsedJavaTestVisitor {

  let cst: JavaParser.CstNode;
  try {
    cst = JavaParser.parse(fileContents.get(fileName) || '');
    expect(cst).toBeDefined();
  } catch (ex) {
    throw new Error(`Could not parse '${fileName}'': ${ex}`, {cause: ex instanceof Error ? ex : undefined});
  }

  const visitor = new ParsedJavaTestVisitor();
  visitor.visit(cst);

  return visitor;
}
