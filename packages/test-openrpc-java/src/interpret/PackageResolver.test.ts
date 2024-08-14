import {OmniKindPrimitive, PackageOptions} from '@omnigen/api';
import {JavaTestUtils} from '../util';
import {JavaOptions, SerializationLibrary} from '@omnigen/target-java';
import {describe, expect, test, vi} from 'vitest';

describe('PackageResolver', () => {

  test('FromSchema', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('packages.json', {
      modelTransformOptions: {generifyTypes: false},
      javaOptions: {preferNumberType: OmniKindPrimitive.DOUBLE},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }
  });

  test('FromCode', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const javaOptions: Partial<JavaOptions> = {
      // ...DEFAULT_TEST_TARGET_OPTIONS,
      // ...DEFAULT_TEST_JAVA_OPTIONS,
      includeGenerated: false,
      serializationLibrary: SerializationLibrary.POJO,
      additionalPropertiesInterfaceAfterDuplicateCount: 1,
      allowCompressInterfaceToInner: false,
    };

    // const targetOptions: TargetOptions = {
    //   ...DEFAULT_TEST_TARGET_OPTIONS,
    //   additionalPropertiesInterfaceAfterDuplicateCount: 1,
    //   allowCompressInterfaceToInner: false,
    // };

    const packageOptions: Partial<PackageOptions> = {
      // ...DEFAULT_PACKAGE_OPTIONS,
      packageResolver: (_type, typeName) => {
        if (typeName.match(/.*Error.*/i)) {
          return 'some.base.pkg.errors';
        }
        if (typeName.match(/JsonRpc.*/i)) {
          return 'some.base.pkg';
        }
        return 'some.other.pkg';
      },
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('additional-properties.json', {
      javaOptions: javaOptions,
      packageOptions: packageOptions,
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}/${fileName}`);
    }
  });
});
