import {describe, test} from 'vitest';
import {OpenRpcModelConverter} from './OpenRpcModelConverter';
import * as fs from 'fs';
import {OpenrpcDocument} from '@open-rpc/meta-schema';
import {DefaultOmnigenOpenRpcVisitor} from './OmnigenOpenRpcVisitor';
import {Util} from '@omnigen/core';

describe('OpenRpcModelConverter', () => {

  test('test-isomorphism', async ctx => {

    const converter = new OpenRpcModelConverter();

    const fileContent = fs.readFileSync(Util.getPathFromRoot('./packages/parser-openrpc/examples/enum.json'), {encoding: 'utf-8'}).toString();
    const openRpcDocument = JSON.parse(fileContent) as OpenrpcDocument;

    const converted = converter.transform(openRpcDocument);

    ctx.expect(converted).toBeDefined();

    converted.visit({
      ...DefaultOmnigenOpenRpcVisitor,

    });

    // TODO: Add more test cases, to make sure that we can properly read the OpenRpc schema
  });
});
