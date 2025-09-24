import * as JavaParser from 'java-parser';
import {JavaTestUtils, OpenRpcTestUtils, ParsedJavaTestVisitor} from '../util';
import {describe, test, vi} from 'vitest';
import {OmniTypeKind} from '@omnigen/api';
import {Util, ZodCompilationUnitsContext} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {SerializationLibrary} from '@omnigen/target-java';
import {SerializationPropertyNameMode} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

describe('Java Rendering', () => {

  test('renderAll', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const errors: Error[] = [];

    const mapOfMap = new Map<string, Map<string, string>>();

    for (const schemaName of OpenRpcTestUtils.getKnownSchemaNames()) {

      for (const fileName of await OpenRpcTestUtils.listExampleFileNames(schemaName)) {

        try {
          const result = await JavaTestUtils.getResultFromFilePath(
            Util.getPathFromRoot(`./packages/parser-openrpc/examples/${fileName}`), {}, ZodCompilationUnitsContext,
          );

          for (const cu of result.compilationUnits) {
            if (!mapOfMap.has(fileName)) {
              mapOfMap.set(fileName, new Map<string, string>());
            }
            const map = mapOfMap.get(fileName)!;
            map.set(cu.fileName, cu.content);
          }

        } catch (ex) {
          errors.push(LoggerFactory.formatError(ex, `File ${fileName}`));
        }
      }
    }

    const aggregated = new Map<string, string>();

    for (const sourceFileName of mapOfMap.keys()) {
      const targetFiles = mapOfMap.get(sourceFileName)!;
      for (const targetFileName of targetFiles.keys()) {
        const targetContent = targetFiles.get(targetFileName)!;

        aggregated.set(sourceFileName, `${(aggregated.get(sourceFileName) ?? '')}\n\n${targetContent}`);

        try {
          const cst = JavaParser.parse(targetContent);
          ctx.expect(cst).toBeDefined();

          const visitor = new ParsedJavaTestVisitor();
          visitor.visit(cst);
        } catch (ex) {
          errors.push(new Error(`Could not parse '${sourceFileName}' in '${targetFileName}': ${ex}\n\n${targetContent}\n\n`, {cause: ex}));
        }
      }
    }

    ctx.expect([...aggregated.keys()].sort()).toMatchSnapshot();

    for (const sourceFileName of aggregated.keys()) {
      const targetContent = aggregated.get(sourceFileName)!;
      const snapshotFileName = `./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${sourceFileName}.java`;
      await ctx.expect(targetContent).toMatchFileSnapshot(snapshotFileName);
    }

    if (errors.length > 0) {
      ctx.expect.fail(`Rendering errors:\n* ${errors.map(it => `${it.message}:\n${it.stack}`).join('\n\n* ')}`);
    }
  }, 90_000);

  test('Test multiple inheritance (interfaces)', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      javaOptions: {
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
      },
    });

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('Type compressions', async ctx => {

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

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('Enum', async ctx => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('enum.json', {
      javaOptions: {
        includeGenerated: false,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        singleFile: true,
        singleFileName: ctx.task.name,
        // debug: true,
      },
    });

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${fileName}`);
    }
  });

  test('AdditionalProperties', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('additional-properties.json', {
      javaOptions: {
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        singleFile: true,
        singleFileName: ctx.task.name,
        additionalPropertiesInterfaceAfterDuplicateCount: 1,
      },
    });

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${fileName}`);
    }
  });

  test('description-inheritance', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('description-inheritance.json', {
      javaOptions: {
        singleFile: true,
        singleFileName: 'description-inheritance',
        immutable: true,
      },
    });

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${fileName}`);
    }
  });

  test('PetStore-Expanded-ClassNames', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('petstore-expanded.json');
    const filenames = [...fileContents.keys()];

    ctx.expect(filenames).toContain('Pet.java');
    ctx.expect(filenames).toContain('DeletePetByIdResponse.java');
    ctx.expect(filenames).not.toContain('Pet1.java');
  });

  test('primitive-generics', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('primitive-generics.json', {
      javaOptions: {preferNumberType: OmniTypeKind.DOUBLE, serializationLibrary: SerializationLibrary.POJO},
    });

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    ctx.expect(fileContents.get('GiveNumberGetCharRequestParams.java')).toMatchSnapshot();

    // TODO: Add more exact checks for all generic types, making sure they have the correct amount of generics and whatever
  });

  test('generic_params', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const result = await JavaTestUtils.getResultFromFilePath(Util.getPathFromRoot(`./packages/test-openrpc-java/examples/generic_params.json`), {
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

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('method-in-response', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('method-in-response.json', {
      javaOptions: {
        singleFile: true,
        singleFileName: ctx.task.name,
      },
    });

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  // TODO: Create test case that actually needs the expandedGenericSourceIdentifier inside GenericsModelTransformer -- it is a good feature, just needs some fixes
});
