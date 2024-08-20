import * as fs from 'fs';
import * as path from 'path';
import * as JavaParser from 'java-parser';
import {JavaTestUtils, OpenRpcTestUtils, ParsedJavaTestVisitor} from '../util';
import {describe, expect, test, vi} from 'vitest';
import {OmniTypeKind} from '@omnigen/api';
import {Util, ZodCompilationUnitsContext} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {SerializationLibrary} from '@omnigen/target-java';
import {SerializationPropertyNameMode} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

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

        try {

          logger.info(`Will render ${fileName}`);
          const result = await JavaTestUtils.getResultFromFilePath(
            Util.getPathFromRoot(`./packages/parser-openrpc/examples/${fileName}`), {}, ZodCompilationUnitsContext,
          );

          let baseDir: string;

          const targetTestDir = path.resolve('./.target_test');

          try {
            baseDir = path.resolve(`./.target_test/${schemaName}/${path.basename(fileName, path.extname(fileName))}`);
          } catch (ex) {
            throw new Error(`Could not resolve path of ${fileName}`, {cause: ex});
          }

          for (const cu of result.compilationUnits) {

            if (cu.fileName.indexOf('#') !== -1) {
              throw new Error(`'#' not allowed in CU '${cu.fileName}'`);
            }

            const outDir = `${baseDir}/${cu.directories.join('/')}`;
            if (!fs.existsSync(outDir)) {
              fs.mkdirSync(outDir, {recursive: true});
            }

            const outPath = `${outDir}/${cu.fileName}`;

            try {
              fs.writeFileSync(outPath, cu.content);
            } catch (ex) {
              throw new Error(`Could not write '${outPath}' of '${fileName}': ${ex}`, {cause: ex});
            }

            let cst: JavaParser.CstNode;
            try {
              cst = JavaParser.parse(cu.content);
              expect(cst).toBeDefined();
            } catch (ex) {
              throw new Error(`Could not parse '${schemaName}' '${fileName}' in '${outPath}': ${ex}\n\n${cu.content}\n\n`, {cause: ex});
            }

            // Visit the syntax tree, but do nothing with the result.
            // It is only to see if any crashes can be found or not.
            const visitor = new ParsedJavaTestVisitor();
            visitor.visit(cst);
          }

          // Everything went fine. So we delete the test output directory. If things went badly it will stay around.
          fs.rmSync(targetTestDir, {recursive: true, force: true});

        } catch (ex) {
          throw LoggerFactory.formatError(ex, `File ${fileName}`);
        }
      }
    }
  }, {
    timeout: 30_000,
  });

  test('Test multiple inheritance (interfaces)', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      javaOptions: {
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }
  });

  test('Type compressions', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // Check that the property 'common' from A and B are moved into Abs.

    const fileContents = await JavaTestUtils.getFileContentsFromFile('compressable-types.json', {
      modelTransformOptions: {generifyTypes: false},
      javaOptions: {
        preferNumberType: OmniTypeKind.DOUBLE,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        beanValidation: false,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }
  });

  test('Enum', async ({task}) => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('enum.json', {
      javaOptions: {
        includeGenerated: false,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        singleFile: true,
        singleFileName: task.name,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${fileName}`);
    }
  });

  test('AdditionalProperties', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('additional-properties.json', {
      javaOptions: {
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        singleFile: true,
        singleFileName: task.name,
        additionalPropertiesInterfaceAfterDuplicateCount: 1,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${fileName}`);
    }
  });

  test('description-inheritance', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('description-inheritance.json', {
      javaOptions: {
        singleFile: true,
        singleFileName: 'description-inheritance',
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${fileName}`);
    }
  });

  test('PetStore-Expanded-ClassNames', async () => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('petstore-expanded.json');
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('Pet.java');
    expect(filenames).toContain('DeletePetByIdResponse.java');
    expect(filenames).not.toContain('Pet1.java');
  });

  test('primitive-generics', async () => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('primitive-generics.json', {
      javaOptions: {preferNumberType: OmniTypeKind.DOUBLE, serializationLibrary: SerializationLibrary.POJO},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    expect(fileContents.get('GiveNumberGetCharRequestParams.java')).toMatchSnapshot();

    // TODO: Add more exact checks for all generic types, making sure they have the correct amount of generics and whatever
  });

  test('generic_params', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const result = await JavaTestUtils.getResultFromFilePath(Util.getPathFromRoot(`./packages/test-openrpc-java/examples/generic_params.json`), {
      // parserOptions: {...DEFAULT_PARSER_OPTIONS, },
      javaOptions: {
        defaultAdditionalProperties: false,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.ALWAYS,
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
        additionalPropertiesInterfaceAfterDuplicateCount: 100,
      },
    }, ZodCompilationUnitsContext);

    const fileContents = await JavaTestUtils.cuToContentMap(result.compilationUnits);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }
  });

  // TODO: Create test case that actually needs the expandedGenericSourceIdentifier inside GenericsModelTransformer -- it is a good feature, just needs some fixes
});
