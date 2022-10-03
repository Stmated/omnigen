import * as fs from 'fs';
import * as path from 'path';
import * as JavaParser from 'java-parser';
import {TestUtils} from '@test';
import {JavaInterpreter, JavaRenderer} from '@java';
import {ParsedJavaTestVisitor} from '@test/ParsedJavaTestVisitor';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '../JavaTestUtils';
import {DEFAULT_OPENRPC_OPTIONS} from '@parse/openrpc';

describe('Java Rendering', () => {

  test('renderAll', async () => {

    // TODO: Do this both with and without compressing types -- create different versions and output them in a structure!
    // TODO: Would it be crazy or cool to take ALL the types of all the models and create one HUGE output with common types?

    jest.setTimeout(10_000);
    for (const schemaName of TestUtils.getKnownSchemaNames()) {

      let fileNames: string[];
      try {
        fileNames = await TestUtils.listExampleFileNames(schemaName);
      } catch (ex) {
        throw new Error(`Could not list filenames inside ${schemaName}: ${ex}`, {cause: ex instanceof Error ? ex : undefined});
      }

      for (const fileName of fileNames) {

        const result = await TestUtils.readExample(schemaName, fileName, DEFAULT_OPENRPC_OPTIONS, DEFAULT_TEST_JAVA_OPTIONS);
        const interpretation = await new JavaInterpreter().buildSyntaxTree(result.model, [], result.options);

        let baseDir: string;

        try {
          baseDir = path.resolve(`./.target_test/${schemaName}/${path.basename(fileName, path.extname(fileName))}`);
        } catch (ex) {
          throw new Error(`Could not resolve path of ${fileName}`)
        }

        try {
          if (fs.existsSync(baseDir)) {
            fs.rmSync(baseDir, {recursive: true, force: true});
          }
        } catch (ex) {
          // Ignore any error here and just hope for the best
        }

        const renderer = new JavaRenderer(DEFAULT_TEST_JAVA_OPTIONS, (cu) => {

          if (cu.fileName.indexOf('#') !== -1) {
            throw new Error(`# not allowed in CU '${cu.fileName}'`);
          }

          const outDir = `${baseDir}/${cu.directories.join('/')}`;
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, {recursive: true});
          }

          const outPath = `${outDir}/${cu.fileName}`;

          try {
            fs.writeFileSync(outPath, cu.content);
          } catch (ex) {
            throw new Error(`Could not write '${outPath}' of '${fileName}': ${ex}`, {cause: ex instanceof Error ? ex : undefined});
          }

          let cst: JavaParser.CstNode;
          try {
            cst = JavaParser.parse(cu.content);
            expect(cst).toBeDefined();
          } catch (ex) {
            throw new Error(
              `Could not parse '${schemaName}' '${fileName}' in '${outPath}': ${ex}`,
              {cause: ex instanceof Error ? ex : undefined}
            );
          }

          // Visit the syntax tree, but do nothing with the result.
          // It is only to see if any crashes can be found or not.
          const visitor = new ParsedJavaTestVisitor();
          visitor.visit(cst);
        });

        renderer.render(interpretation);
      }
    }
  });

  test('Test multiple inheritance (interfaces)', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json');

    const fileNames = [...fileContents.keys()];
    expect(fileNames).toContain('A.java');
    expect(fileNames).toContain('Abs.java');
    expect(fileNames).toContain('AXOrB.java'); // TODO: Bad naming, it looks weird. Fix?
    expect(fileNames).toContain('B.java');
    expect(fileNames).toContain('C.java');
    expect(fileNames).not.toContain('IA.java');
    expect(fileNames).toContain('IB.java');
    expect(fileNames).toContain('IC.java');
    expect(fileNames).toContain('Out_2.java');

    const a = JavaTestUtils.getParsedContent(fileContents, 'A.java');
    expect(a.foundFields).toHaveLength(1);
    expect(a.foundFields[0].names).toHaveLength(1);
    expect(a.foundFields[0].names[0]).toEqual('foo');
    expect(a.foundMethods).toHaveLength(1);
    expect(a.foundMethods[0]).toEqual('getFoo');
    expect(a.foundSuperClasses).toHaveLength(1);
    expect(a.foundSuperInterfaces).toHaveLength(0);

    const b = JavaTestUtils.getParsedContent(fileContents, 'B.java');
    expect(b.foundSuperClasses).toHaveLength(1);
    expect(b.foundSuperInterfaces).toHaveLength(1);
    expect(b.foundMethods).toHaveLength(1);
    expect(b.foundSuperClasses).toContain('Abs');
    expect(b.foundSuperInterfaces).toContain('IB');

    const c = JavaTestUtils.getParsedContent(fileContents, 'C.java');
    expect(c.foundSuperClasses).toHaveLength(1);
    expect(c.foundSuperInterfaces).toHaveLength(1);
    expect(c.foundMethods).toHaveLength(1);
    expect(c.foundSuperClasses).toContain('Abs');
    expect(c.foundSuperInterfaces).toContain('IC');

    const eitherAorB = JavaTestUtils.getParsedContent(fileContents, 'AXOrB.java');
    expect(eitherAorB.foundFields).toHaveLength(3);
    expect(eitherAorB.foundFields[0].names[0]).toEqual('_raw');
    expect(eitherAorB.foundFields[1].names[0]).toEqual('_a');
    expect(eitherAorB.foundFields[2].names[0]).toEqual('_b');
    expect(eitherAorB.foundSuperClasses).toHaveLength(0);
    expect(eitherAorB.foundSuperInterfaces).toHaveLength(0);

    const out2 = JavaTestUtils.getParsedContent(fileContents, 'Out_2.java');
    expect(out2.foundFields).toHaveLength(2);
    expect(out2.foundFields[0].names[0]).toEqual('bar');
    expect(out2.foundFields[1].names[0]).toEqual('xyz');
    expect(out2.foundSuperClasses).toHaveLength(1);
    expect(out2.foundSuperInterfaces).toHaveLength(2);
    expect(out2.foundSuperClasses[0]).toEqual('A');
    expect(out2.foundSuperInterfaces[0]).toEqual('IB');
    expect(out2.foundSuperInterfaces[1]).toEqual('IC');
  });

  test('Type compressions', async () => {

    // Check that the property 'common' from A and B are moved into Abs.
    const fileContents = await JavaTestUtils.getFileContentsFromFile('compressable-types.json');

    const fileNames = [...fileContents.keys()].sort();
    // TODO: Make sure that JsonRpcRequest does not go completely bonkers with its generics
    expect(fileNames).toEqual([
      "A.java",
      "Abs.java",
      "B.java",
      "ErrorUnknown.java",
      "ErrorUnknownError.java",
      "GiveIn1GetOut1Request.java",
      "GiveIn1GetOut1RequestParams.java",
      "GiveIn1GetOut1Response.java",
      "GiveIn2GetOut2Request.java",
      "GiveIn2GetOut2RequestParams.java",
      "GiveIn2GetOut2Response.java",
      "In1.java",
      "In2.java",
      "JsonRpcError.java",
      "JsonRpcErrorResponse.java",
      "JsonRpcRequest.java",
      "JsonRpcRequestParams.java",
      "JsonRpcResponse.java",
    ]);

    const a = JavaTestUtils.getParsedContent(fileContents, 'A.java');
    expect(a.foundSuperInterfaces).toHaveLength(0);
    expect(a.foundSuperClasses).toHaveLength(1);
    expect(a.foundSuperClasses[0]).toEqual('Abs');
    expect(a.foundFields).toHaveLength(2);
    expect(a.foundFields[0].names[0]).toEqual('a');
    expect(a.foundFields[1].names[0]).toEqual('x');

    const b = JavaTestUtils.getParsedContent(fileContents, 'B.java');
    expect(b.foundSuperInterfaces).toHaveLength(0);
    expect(b.foundSuperClasses).toHaveLength(1);
    expect(b.foundSuperClasses[0]).toEqual('Abs');
    expect(b.foundFields).toHaveLength(2);
    expect(b.foundFields[0].names[0]).toEqual('b');
    expect(b.foundFields[1].names[0]).toEqual('x');

    const abs = JavaTestUtils.getParsedContent(fileContents, 'Abs.java');
    expect(abs.foundSuperInterfaces).toHaveLength(0);
    expect(abs.foundSuperClasses).toHaveLength(0);
    expect(abs.foundFields).toHaveLength(2);
    expect(abs.foundFields[0].names[0]).toEqual('kind');
    expect(abs.foundFields[1].names[0]).toEqual('common');
  });

  test('Enum', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('enum.json');

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(18);
    expect(filenames).toContain('Tag.java');
    expect(filenames).toContain('TagCopy.java');
    expect(filenames).toContain('TagOrSpeciesOrString.java');
    // If it contains the below one, then the composite class has been incorrectly named
    expect(filenames).not.toContain('TagXOrTagOrString.java');

    const tag = JavaTestUtils.getParsedContent(fileContents, 'Tag.java');
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

    const tagOrString = JavaTestUtils.getParsedContent(fileContents, 'TagOrSpeciesOrString.java');
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

    const fileContents = await JavaTestUtils.getFileContentsFromFile('additional-properties.json');

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(12);
    expect(filenames).toContain('Thing.java');
    expect(filenames).toContain('IAdditionalProperties.java');

    const thing = JavaTestUtils.getParsedContent(fileContents, 'Thing.java');
    expect(thing.foundMethods).toHaveLength(3);
    expect(thing.foundMethods[0]).toEqual('getId');
    expect(thing.foundMethods[1]).toEqual('addAdditionalProperty');
    expect(thing.foundMethods[2]).toEqual('getAdditionalProperties');
    expect(thing.foundSuperInterfaces).toHaveLength(1);
    expect(thing.foundSuperInterfaces[0]).toEqual('IAdditionalProperties');
    expect(thing.foundFields).toHaveLength(2);
    expect(thing.foundFields[0].names[0]).toEqual('id');
    expect(thing.foundFields[1].names[0]).toEqual('_additionalProperties');

    const additional = JavaTestUtils.getParsedContent(fileContents, 'IAdditionalProperties.java');
    expect(additional.foundMethods).toHaveLength(1);
    expect(additional.foundMethods[0]).toEqual('getAdditionalProperties');
    expect(additional.foundSuperClasses).toHaveLength(0);
    expect(additional.foundSuperInterfaces).toHaveLength(0);
    expect(additional.foundFields).toHaveLength(0);
  });

  test('ErrorStructure', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json');

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(13);
    expect(filenames).toContain('ErrorUnknown.java');
    expect(filenames).toContain('ErrorUnknownError.java');
    expect(filenames).toContain('JsonRpcError.java');
    expect(filenames).toContain('JsonRpcErrorResponse.java');
    expect(filenames).toContain('ListThingsError100.java');
    expect(filenames).toContain('ListThingsError100Error.java');

    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');
    expect(errorResponse.foundFields[0].names[0]).toEqual("jsonrpc");

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(3);
    expect(error100.foundFields[0].names[0]).toEqual("code");
    expect(error100.foundFields[1].names[0]).toEqual("message");
    expect(error100.foundFields[2].names[0]).toEqual("data");
  });

  test('ErrorStructure-1.1', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-1.1.json');
    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');

    expect(errorResponse.foundFields[0].names[0]).toEqual("version");

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(4);
  });

  test('ErrorStructure-Custom', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-custom.json');
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('ListThingsError100Error.java');
    expect(filenames).toContain('JsonRpcCustomErrorPayload.java');
    expect(filenames).not.toContain('Data.java'); // Class for property 'Data' should be better named
    expect(filenames).toContain('JsonRpcCustomErrorPayload.java');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(4);
    expect(error100.foundFields[0].names[0]).toEqual("code");
    expect(error100.foundFields[1].names[0]).toEqual("message");
    expect(error100.foundFields[2].names[0]).toEqual("error");
    expect(error100.foundFields[3].names[0]).toEqual("name");
    expect(error100.foundLiterals[7]).toEqual("\"JSONRPCError\"");

    const customError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcCustomErrorPayload.java');
    expect(customError.foundFields).toHaveLength(5);
    expect(customError.foundFields[0].names[0]).toEqual('signature');
    expect(customError.foundFields[1].names[0]).toEqual('uuid');
    expect(customError.foundFields[2].names[0]).toEqual('method');
    expect(customError.foundFields[3].names[0]).toEqual('data');
    expect(customError.foundFields[4].names[0]).toEqual('_additionalProperties');
  });

  test('PetStore-Expanded-ClassNames', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('petstore-expanded.json');
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('Pet.java');
    expect(filenames).toContain('DeletePetByIdResponse.java');
    expect(filenames).not.toContain('Pet1.java');
  });

  test('Bank', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('bank.json');
    const filenames = [...fileContents.keys()];

  });

  test('Test inheritance of descriptions', async () => {

    // TODO: Implement test case for 'openrpc', 'description-inheritance.json'
  });
});
