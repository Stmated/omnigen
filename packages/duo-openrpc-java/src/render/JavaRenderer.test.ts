import * as fs from 'fs';
import * as path from 'path';
import * as JavaParser from 'java-parser';
import {
  DEFAULT_TEST_JAVA_OPTIONS,
  DEFAULT_TEST_TARGET_OPTIONS,
  JavaTestUtils,
  OpenRpcTestUtils,
} from '@omnigen/duo-openrpc-java-test';
import {ParsedJavaTestVisitor} from '@omnigen/utils-test-target-java';
import {expect, test, describe, vi} from 'vitest';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, ModelTransformOptions} from '@omnigen/core';
import {ZodCompilationUnitsContext} from '@omnigen/core-util';

describe('Java Rendering', () => {

  test('renderAll', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

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

        const result = await JavaTestUtils.getResultFromFilePath(
          `../parser-openrpc/examples/${fileName}`, {}, ZodCompilationUnitsContext,
        );

        // const interpretation = new JavaInterpreter(result.options, JAVA_FEATURES).buildSyntaxTree(result.model, []);
        //
        let baseDir: string;

        try {
          baseDir = path.resolve(`./.target_test/${schemaName}/${path.basename(fileName, path.extname(fileName))}`);
        } catch (ex) {
          throw new Error(`Could not resolve path of ${fileName}`);
        }
        //
        // try {
        //   if (fs.existsSync(baseDir)) {
        //     fs.rmSync(baseDir, {recursive: true, force: true});
        //   }
        // } catch (ex) {
        //   // Ignore any error here and just hope for the best
        // }

        // const renderer = new JavaRenderer(result.options);
        // const renders = renderer.executeRender(interpretation);

        for (const cu of result.compilationUnits) {

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
        }
      }
    }
  }, {
    timeout: 20_000,
  });

  test('Test multiple inheritance (interfaces)', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json');

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('Type compressions', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // Check that the property 'common' from A and B are moved into Abs.
    const optionsWithoutGenerics: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generifyTypes: false,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('compressable-types.json', {
      modelTransformOptions: optionsWithoutGenerics,
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('Enum', async ({task}) => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile(
      'enum.json', {javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, includeGeneratedAnnotation: false}},
    );

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('AdditionalProperties', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});


    const fileContents = await JavaTestUtils.getFileContentsFromFile(
      'additional-properties.json',
      {targetOptions: {...DEFAULT_TEST_TARGET_OPTIONS, additionalPropertiesInterfaceAfterDuplicateCount: 1}},
    );

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('PetStore-Expanded-ClassNames', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('petstore-expanded.json');
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('Pet.java');
    expect(filenames).toContain('DeletePetByIdResponse.java');
    expect(filenames).not.toContain('Pet1.java');
  });

  test('primitive-generics', async () => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('primitive-generics.json');

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    expect(fileContents.get('GiveNumberGetCharRequestParams.java')).toMatchSnapshot();

    // TODO: Add more exact checks for all generic types, making sure they have the correct amount of generics and whatever
  });
});
