import {JavaTestUtils} from '../util';
import {Direction} from '@omnigen/api';
import {describe, expect, test, vi} from 'vitest';
import {SerializationLibrary} from '@omnigen/target-java';
import {SerializationPropertyNameMode} from '@omnigen/target-code';

describe('InnerTypeCompression', () => {

  test('CompressNo', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      modelTransformOptions: {generifyTypes: false, elevateProperties: false},
      // targetOptions: {
      //   ...DEFAULT_TEST_TARGET_OPTIONS,
      // },
      javaOptions: {
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        compressSoloReferencedTypes: false,
        compressUnreferencedSubTypes: false,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }
  });

  test('CompressYes', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      // parserOptions: {...DEFAULT_PARSER_OPTIONS, },
      modelTransformOptions: {generifyTypes: false, elevateProperties: false},
      // targetOptions: {
      //   ...DEFAULT_TEST_TARGET_OPTIONS,
      //
      // },
      javaOptions: {
        direction: Direction.OUT,
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }

    // TODO: This is actually INCORRECT! It is not properly serializable with the @JsonValue annotation!
    //        Need to create some other way of handling this, like splitting into many different classes with unique parents
  });

  test('CompressYes-error-structure', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json', {
      modelTransformOptions: {generifyTypes: false, elevateProperties: false},
      // targetOptions: {
      //   ...DEFAULT_TEST_TARGET_OPTIONS,
      // },
      javaOptions: {
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
      },
    });

    // NOTE: This *could* be more aggressive, but it starts to become confusing merging some of them.
    //        Could be a future option to, for example, put ListThingsRequest inside JsonRpcRequest (which it inherits from).
    expect([...fileContents.keys()].sort()).toMatchSnapshot();
  });

  test('CompressYes-error-structure+generics', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json', {
      modelTransformOptions: {generifyTypes: true, elevateProperties: false},
      // targetOptions: {
      //   ...DEFAULT_TEST_TARGET_OPTIONS,
      // },
      javaOptions: {
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
      },
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }
  });
});
