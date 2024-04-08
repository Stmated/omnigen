import {DEFAULT_TEST_JAVA_OPTIONS, DEFAULT_TEST_TARGET_OPTIONS, JavaTestUtils} from '../util';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, DEFAULT_PARSER_OPTIONS, Direction} from '@omnigen/core';
import {describe, expect, test, vi} from 'vitest';
import {SerializationLibrary, SerializationPropertyNameMode} from '@omnigen/target-java';

describe('InnerTypeCompression', () => {

  test('CompressNo', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false, elevateProperties: false},
      targetOptions: {
        ...DEFAULT_TEST_TARGET_OPTIONS,
        compressSoloReferencedTypes: false,
        compressUnreferencedSubTypes: false,
      },
      javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, serializationLibrary: SerializationLibrary.JACKSON, serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('CompressYes', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      parserOptions: {...DEFAULT_PARSER_OPTIONS, direction: Direction.OUT},
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false, elevateProperties: false},
      targetOptions: {
        ...DEFAULT_TEST_TARGET_OPTIONS,
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
      },
      javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, serializationLibrary: SerializationLibrary.JACKSON, serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }

    // TODO: This is actually INCORRECT! It is not properly serializable with the @JsonValue annotation!
    //        Need to create some other way of handling this, like splitting into many different classes with unique parents
  });

  test('CompressYes-error-structure', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false, elevateProperties: false},
      targetOptions: {
        ...DEFAULT_TEST_TARGET_OPTIONS,
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
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: true, elevateProperties: false},
      targetOptions: {
        ...DEFAULT_TEST_TARGET_OPTIONS,
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
      },
      javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, serializationLibrary: SerializationLibrary.JACKSON, serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });
});
