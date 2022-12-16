import * as fs from 'fs';
import * as path from 'path';
import * as JavaParser from 'java-parser';
import {JAVA_FEATURES, JavaInterpreter, JavaOptions, JavaRenderer} from '@omnigen/target-java';
import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils, OpenRpcTestUtils} from '@omnigen/duo-openrpc-java-test';
import {ParsedJavaTestVisitor} from '@omnigen/utils-test-target-java';
import {jest} from '@jest/globals';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, ModelTransformOptions} from '@omnigen/core';

describe('Java Rendering', () => {

  jest.setTimeout(20_000);

  test('renderAll', async () => {

    // TODO: Do this both with and without compressing types -- create different versions and output them in a structure!
    // TODO: Would it be crazy or cool to take ALL the types of all the models and create one HUGE output with common types?

    for (const schemaName of OpenRpcTestUtils.getKnownSchemaNames()) {

      let fileNames: string[];
      try {
        fileNames = await OpenRpcTestUtils.listExampleFileNames(schemaName);
      } catch (ex) {
        throw new Error(`Could not list filenames inside ${schemaName}: ${ex}`, {cause: ex instanceof Error ? ex : undefined});
      }

      for (const fileName of fileNames) {

        const result = await OpenRpcTestUtils.readExample(schemaName, fileName,
          DEFAULT_OPENRPC_OPTIONS,
          DEFAULT_MODEL_TRANSFORM_OPTIONS,
          DEFAULT_TEST_JAVA_OPTIONS,
        );

        const interpretation = await new JavaInterpreter(result.options).buildSyntaxTree(result.model, [], result.options, JAVA_FEATURES);

        let baseDir: string;

        try {
          baseDir = path.resolve(`./.target_test/${schemaName}/${path.basename(fileName, path.extname(fileName))}`);
        } catch (ex) {
          throw new Error(`Could not resolve path of ${fileName}`);
        }

        try {
          if (fs.existsSync(baseDir)) {
            fs.rmSync(baseDir, {recursive: true, force: true});
          }
        } catch (ex) {
          // Ignore any error here and just hope for the best
        }

        const renderer = new JavaRenderer(result.options, cu => {

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
              {cause: ex instanceof Error ? ex : undefined},
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

    const fileNames = [...fileContents.keys()].sort();
    expect(fileNames).toEqual([
      'A.java',
      'AXOrB.java',
      'Abs.java',
      'B.java',
      'C.java',
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'GiveInGetOut2Request.java',
      'GiveInGetOut2RequestParams.java',
      'GiveInGetOut2Response.java',
      'GiveInGetOutRequest.java',
      'GiveInGetOutRequestParams.java',
      'GiveInGetOutResponse.java',
      'IB.java',
      'IC.java',
      'In.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
      'Out.java',
      'Out2.java',
    ]);

    // TO FIX:
    // * Interfaces are not rendered (missing IB, IC)
    // * 'In' does not have any connection to AXOrB
    //    * Change so properties in "in" are moved to copies of A and B, and "in" become the runtime mapping type

    const a = JavaTestUtils.getParsedContent(fileContents, 'A.java');
    expect(a.foundFields).toEqual(['foo']);
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
    expect(eitherAorB.foundFields).toEqual(['_raw', '_a', '_b']);
    expect(eitherAorB.foundMethods).toEqual(['getRaw', 'getA', 'getB']);
    expect(eitherAorB.foundSuperClasses).toHaveLength(0);
    expect(eitherAorB.foundSuperInterfaces).toHaveLength(0);

    const out2 = JavaTestUtils.getParsedContent(fileContents, 'Out2.java');
    expect(out2.foundFields).toEqual(['bar', 'xyz']);
    expect(out2.foundSuperClasses).toHaveLength(1);
    expect(out2.foundSuperInterfaces).toHaveLength(2);
    expect(out2.foundSuperClasses[0]).toEqual('A');
    expect(out2.foundSuperInterfaces[0]).toEqual('IB');
    expect(out2.foundSuperInterfaces[1]).toEqual('IC');
  });

  test('Type compressions', async () => {

    // Check that the property 'common' from A and B are moved into Abs.
    const optionsWithoutGenerics: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generifyTypes: false,
    };

    // const optionsWithoutGenerics: JavaOptions = {
    //   ...DEFAULT_TEST_JAVA_OPTIONS,
    //   generifyTypes: false,
    // };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('compressable-types.json',
      DEFAULT_OPENRPC_OPTIONS,
      optionsWithoutGenerics,
      DEFAULT_TEST_JAVA_OPTIONS,
    );

    const fileNames = [...fileContents.keys()].sort();
    // TODO: Make sure that JsonRpcRequest does not go completely bonkers with its generics
    expect(fileNames).toEqual([
      'A.java',
      'Abs.java',
      'B.java',
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'GiveIn1GetOut1Request.java',
      'GiveIn1GetOut1RequestParams.java',
      'GiveIn1GetOut1Response.java',
      'GiveIn2GetOut2Request.java',
      'GiveIn2GetOut2RequestParams.java',
      'GiveIn2GetOut2Response.java',
      'In1.java',
      'In2.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
    ]);

    const a = JavaTestUtils.getParsedContent(fileContents, 'A.java');
    expect(a.foundSuperInterfaces).toHaveLength(0);
    expect(a.foundSuperClasses).toHaveLength(1);
    expect(a.foundSuperClasses[0]).toEqual('Abs');
    expect(a.foundFields).toEqual(['a', 'x']);

    const b = JavaTestUtils.getParsedContent(fileContents, 'B.java');
    expect(b.foundSuperInterfaces).toHaveLength(0);
    expect(b.foundSuperClasses).toHaveLength(1);
    expect(b.foundSuperClasses[0]).toEqual('Abs');
    expect(b.foundFields).toEqual(['b', 'x']);

    const abs = JavaTestUtils.getParsedContent(fileContents, 'Abs.java');
    expect(abs.foundSuperInterfaces).toHaveLength(0);
    expect(abs.foundSuperClasses).toHaveLength(0);
    expect(abs.foundFields).toEqual(['common', 'kind']);
  });

  test('Enum', async () => {

    const options: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      includeGeneratedAnnotation: false,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile(
      'enum.json',
      DEFAULT_OPENRPC_OPTIONS,
      DEFAULT_MODEL_TRANSFORM_OPTIONS,
      options,
    );

    const filenames = [...fileContents.keys()].sort();
    expect(filenames).toEqual([
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
      'ListThingsError100.java',
      'ListThingsError100Error.java',
      'ListThingsRequest.java',
      'ListThingsRequestParams.java',
      'ListThingsResponse.java',
      'Species.java',
      'Tag.java',
      'TagCopy.java',
      'TagOrSpeciesOrString.java',
      'Thing.java',
      'ThingType.java',
    ]);

    const tag = JavaTestUtils.getParsedContent(fileContents, 'Tag.java');
    expect(tag.foundMethods).toHaveLength(0);
    expect(tag.foundSuperClasses).toHaveLength(0);
    expect(tag.foundSuperInterfaces).toHaveLength(0);
    expect(tag.foundFields).toEqual(['value']);
    expect(tag.foundLiterals).toEqual([
      '"TagA"',
      '"TagB"',
      '"TagC"',
    ]);

    const tagOrString = JavaTestUtils.getParsedContent(fileContents, 'TagOrSpeciesOrString.java');
    expect(tagOrString.foundMethods).toEqual([
      'getAsSpecies',
      'getAsTag',
      'getValue',
      'isKnown',
      'isSpecies',
      'isTag',
      'get',
    ]);

    expect(tagOrString.foundSuperClasses).toHaveLength(0);
    expect(tagOrString.foundSuperInterfaces).toHaveLength(0);
    expect(tagOrString.foundFields).toHaveLength(9);

    expect(tagOrString.foundLiterals).toEqual([
      1337,
      '"foo"',
      '"SpeciesA"',
      '"SpeciesB"',
      '"TagA"',
      '"TagB"',
      '"TagC"',
      true,
    ]);
  });

  test('AdditionalProperties', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile(
      'additional-properties.json',
      DEFAULT_OPENRPC_OPTIONS,
      DEFAULT_MODEL_TRANSFORM_OPTIONS,
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        additionalPropertiesInterfaceAfterDuplicateCount: 1,
      },
    );

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(12);
    expect(filenames).toContain('Thing.java');
    expect(filenames).toContain('IAdditionalProperties.java');

    const thing = JavaTestUtils.getParsedContent(fileContents, 'Thing.java');
    expect(thing.foundMethods).toEqual([
      'addAdditionalProperty',
      'getAdditionalProperties',
      'getId',
    ]);

    expect(thing.foundSuperInterfaces).toHaveLength(1);
    expect(thing.foundSuperInterfaces[0]).toEqual('IAdditionalProperties');
    expect(thing.foundFields).toEqual(['id', '_additionalProperties']);

    const additional = JavaTestUtils.getParsedContent(fileContents, 'IAdditionalProperties.java');
    expect(additional.foundMethods).toHaveLength(1);
    expect(additional.foundMethods[0]).toEqual('getAdditionalProperties');
    expect(additional.foundSuperClasses).toHaveLength(0);
    expect(additional.foundSuperInterfaces).toHaveLength(0);
    expect(additional.foundFields).toHaveLength(0);
  });

  test('PetStore-Expanded-ClassNames', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('petstore-expanded.json');
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('Pet.java');
    expect(filenames).toContain('DeletePetByIdResponse.java');
    expect(filenames).not.toContain('Pet1.java');
  });

  test('primitive-generics', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('primitive-generics.json');
    const filenames = [...fileContents.keys()].sort();

    expect(filenames).toEqual([
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'GiveIntGetDoubleRequest.java',
      'GiveIntGetDoubleRequestParams.java',
      'GiveIntGetDoubleResponse.java',
      'GiveNumberGetCharRequest.java',
      'GiveNumberGetCharRequestParams.java',
      'GiveNumberGetCharResponse.java',
      'GiveStringGetStringRequest.java',
      'GiveStringGetStringRequestParams.java',
      'GiveStringGetStringResponse.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
    ]);

    const params = JavaTestUtils.getParsedContent(fileContents, 'GiveNumberGetCharRequestParams.java');

    expect(params.foundTypes).toEqual(['Double', 'double']);

    // TODO: Add more exact checks for all generic types, making sure they have the correct amount of generics and whatever
  });
});
