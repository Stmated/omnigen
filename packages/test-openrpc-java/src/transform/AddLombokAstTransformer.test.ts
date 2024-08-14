import {FieldAccessorMode, SerializationLibrary} from '@omnigen/target-java';
import {JavaTestUtils} from '../util';
import {expect, test, vi} from 'vitest';
import {SerializationPropertyNameMode} from '@omnigen/target-code';

test('lombok', async ({task}) => {

  vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

  const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
    modelTransformOptions: {generifyTypes: false, elevateProperties: false},
    javaOptions: {
      fieldAccessorMode: FieldAccessorMode.LOMBOK,
      serializationLibrary: SerializationLibrary.JACKSON,
      serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
      lombokBuilder: true,
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
    },
  });

  const fileContent = fileContents.get('In.java');

  expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.name}/In.Java`);
});
