import {OmniKindPrimitive, PackageOptions} from '@omnigen/api';
import {JavaTestUtils} from '../util';
import {JavaOptions, SerializationLibrary} from '@omnigen/target-java';
import {describe, test, vi} from 'vitest';

describe('PackageResolver', () => {

  test.concurrent('FromSchema', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await JavaTestUtils.getFileContentsFromFile('packages.json', {
      modelTransformOptions: {generifyTypes: false},
      javaOptions: {preferNumberType: OmniKindPrimitive.DOUBLE},
    });

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test.concurrent('FromCode', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const javaOptions: Partial<JavaOptions> = {
      includeGenerated: false,
      serializationLibrary: SerializationLibrary.POJO,
      additionalPropertiesInterfaceAfterDuplicateCount: 1,
      allowCompressInterfaceToInner: false,
    };

    const packageOptions: Partial<PackageOptions> = {
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

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, fileContent] of fileContents) {
      ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });
});
