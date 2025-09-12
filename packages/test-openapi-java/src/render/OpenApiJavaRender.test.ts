import {describe, test, vi} from 'vitest';
import {OpenApiToJavaTestUtil} from './OpenApiToJavaTestUtil.ts';
import {SerializationLibrary} from '@omnigen/target-java';
import {Util} from '@omnigen/core';
import {TestUtils} from '@omnigen/utils-test';

describe('openapi-java-render', () => {

  test('petstore', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await OpenApiToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-openapi/examples/petstore.yaml'), {
      serializationLibrary: SerializationLibrary.POJO,
      // debug: true,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      ctx.expect(cu).toHaveLength(1);
      await ctx.expect(cu[0].content).toMatchFileSnapshot(TestUtils.getSnapshotFileName(ctx, fileName));
    }
  });
});
