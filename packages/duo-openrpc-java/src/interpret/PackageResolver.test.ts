import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PACKAGE_OPTIONS,
  PackageOptions, TargetOptions,
} from '@omnigen/core';
import {DEFAULT_TEST_TARGET_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';
import {DEFAULT_JAVA_OPTIONS, JavaOptions} from '@omnigen/target-java';
import {describe, expect, test, vi} from 'vitest';

describe('PackageResolver', () => {

  test('FromSchema', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('packages.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false},
    });

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  // TODO: There should be a way to give overriding options programmatically, more important than from schema
  //       Then add a test that checks that the one given from code actually takes precedence

  test('FromCode', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const javaOptions: JavaOptions = {
      ...DEFAULT_JAVA_OPTIONS,
      includeGeneratedAnnotation: false,
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
