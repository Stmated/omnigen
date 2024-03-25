import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PACKAGE_OPTIONS, OmniKindPrimitive,
  PackageOptions, TargetOptions,
} from '@omnigen/core';
import {DEFAULT_TEST_JAVA_OPTIONS, DEFAULT_TEST_TARGET_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, SerializationLibrary} from '@omnigen/target-java';
import {describe, expect, test, vi} from 'vitest';

describe('PackageResolver', () => {

  test('FromSchema', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('packages.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false},
      javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, preferNumberType: OmniKindPrimitive.DOUBLE},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('FromCode', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const javaOptions: JavaOptions = {
      ...DEFAULT_JAVA_OPTIONS,
      includeGenerated: false,
      serializationLibrary: SerializationLibrary.POJO,
    };

    const targetOptions: TargetOptions = {
      ...DEFAULT_TEST_TARGET_OPTIONS,
      additionalPropertiesInterfaceAfterDuplicateCount: 1,
      allowCompressInterfaceToInner: false,
    };

    const packageOptions: PackageOptions = {
      ...DEFAULT_PACKAGE_OPTIONS,
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
      targetOptions: targetOptions,
      packageOptions: packageOptions,
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });
});
