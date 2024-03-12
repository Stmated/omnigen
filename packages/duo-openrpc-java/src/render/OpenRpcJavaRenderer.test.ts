import * as fs from 'fs';
import * as path from 'path';
import * as JavaParser from 'java-parser';
import {DEFAULT_TEST_JAVA_OPTIONS, DEFAULT_TEST_TARGET_OPTIONS, JavaTestUtils, OpenRpcTestUtils} from '@omnigen/duo-openrpc-java-test';
import {ParsedJavaTestVisitor} from '@omnigen/utils-test-target-java';
import {describe, expect, test, vi} from 'vitest';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, DEFAULT_PARSER_OPTIONS, ModelTransformOptions, OmniPrimitiveKind} from '@omnigen/core';
import {ZodCompilationUnitsContext} from '@omnigen/core-util';
import {LoggerFactory} from '@omnigen/core-log';
import {SerializationConstructorAnnotationMode, SerializationLibrary, SerializationPropertyNameMode} from '@omnigen/target-java';

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
            `../parser-openrpc/examples/${fileName}`, {}, ZodCompilationUnitsContext,
          );

          let baseDir: string;

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
              throw new Error(`Could not parse '${schemaName}' '${fileName}' in '${outPath}': ${ex}`, {cause: ex});
            }

            // Visit the syntax tree, but do nothing with the result.
            // It is only to see if any crashes can be found or not.
            const visitor = new ParsedJavaTestVisitor();
            visitor.visit(cst);
          }
        } catch (ex) {
          throw LoggerFactory.formatError(ex, `File ${fileName}`);
        }
      }
    }
  }, {
    timeout: 20_000,
  });

  test('Test multiple inheritance (interfaces)', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, serializationLibrary: SerializationLibrary.JACKSON},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('Type compressions', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // Check that the property 'common' from A and B are moved into Abs.

    const fileContents = await JavaTestUtils.getFileContentsFromFile('compressable-types.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false},
      javaOptions: {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        preferNumberType: OmniPrimitiveKind.DOUBLE,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('Enum', async ({task}) => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('enum.json', {
      javaOptions: {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        includeGeneratedAnnotation: false,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
      }
    });
    // TODO: Get this to work again -- something is very off with the way things are created -- maybe a miss-mash with the ids and simplification of oneOf -> allOf -> inlined
    //       Might be that we should not inline early, and let it be up to the target language how a type that is only one allOf should be rendered. If it is anonymous it could be inlined always;

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('AdditionalProperties', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('additional-properties.json', {
      targetOptions: {...DEFAULT_TEST_TARGET_OPTIONS, additionalPropertiesInterfaceAfterDuplicateCount: 1},
      javaOptions: {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
      }
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
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
      javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, preferNumberType: OmniPrimitiveKind.DOUBLE, serializationLibrary: 'POJO'},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    expect(fileContents.get('GiveNumberGetCharRequestParams.java')).toMatchSnapshot();

    // TODO: Add more exact checks for all generic types, making sure they have the correct amount of generics and whatever
  });

  test('generic_params', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const result = await JavaTestUtils.getResultFromFilePath(`./examples/generic_params.json`, {
      parserOptions: {...DEFAULT_PARSER_OPTIONS, defaultAdditionalProperties: false},
      targetOptions: {
        ...DEFAULT_TEST_TARGET_OPTIONS,
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
        additionalPropertiesInterfaceAfterDuplicateCount: 100,
      },
      javaOptions: {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.ALWAYS,
      },
    }, ZodCompilationUnitsContext);

    const fileContents = await JavaTestUtils.cuToContentMap(result.compilationUnits);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  // TODO: Create test case that actually needs the expandedGenericSourceIdentifier inside GenericsModelTransformer -- it is a good feature, just needs some fixes
});
