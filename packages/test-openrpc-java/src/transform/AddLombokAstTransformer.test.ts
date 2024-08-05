import {FieldAccessorMode, SerializationLibrary} from '@omnigen/target-java';
import {DEFAULT_TEST_JAVA_OPTIONS, DEFAULT_TEST_TARGET_OPTIONS, JavaTestUtils} from '../util';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS} from '@omnigen/api';
import {expect, test, vi} from 'vitest';
import {SerializationPropertyNameMode} from '@omnigen/target-code';

test('lombok', async ({task}) => {

  vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

  const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
    modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false, elevateProperties: false},
    javaOptions: {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      fieldAccessorMode: FieldAccessorMode.LOMBOK,
      serializationLibrary: SerializationLibrary.JACKSON,
      serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
      lombokBuilder: true,
    },
    targetOptions: {
      ...DEFAULT_TEST_TARGET_OPTIONS,
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
    },
  });

  const fileContent = fileContents.get('In.java');

  expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/In.Java`);
});
