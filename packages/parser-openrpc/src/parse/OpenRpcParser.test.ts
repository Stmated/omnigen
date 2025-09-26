import * as fs from 'fs/promises';
import * as path from 'path';
import {DEFAULT_PARSER_OPTIONS, OmniType, OmniTypeKind} from '@omnigen/api';
import {OpenRpcParserBootstrapFactory} from './OpenRpcParser';
import {ANY_KIND, Naming, OmniUtil, ProxyReducerOmni2, SchemaFile, Util} from '@omnigen/core';
import {DEFAULT_JSONRPC20_PARSER_OPTIONS} from '../options';
import {describe, test} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';

describe('Test Generic Model Creation', () => {

  const parserBootstrapFactory = new OpenRpcParserBootstrapFactory();

  test('Test basic loading', async ctx => {
    const dirPath = Util.getPathFromRoot('./packages/parser-openrpc/examples/');
    const files = await fs.readdir(dirPath, {withFileTypes: true});
    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }

      const filePath = path.join(dirPath, file.name);
      const schemaFile = new SchemaFile(filePath);
      await schemaFile.prepare();
      const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
        schemaFile,
      );

      const parser = parserBootstrap.createParser({...DEFAULT_PARSER_OPTIONS, ...DEFAULT_JSONRPC20_PARSER_OPTIONS, jsonRpcVersion: '2.0'});
      try {
        const model = parser.parse().model;
        ctx.expect(model).toBeDefined();
      } catch (ex) {
        throw LoggerFactory.formatError(ex);
      }
    }
  }, 5_000);

  test('PetStore should create expected model', async ctx => {

    const schemaFile = new SchemaFile(Util.getPathFromRoot('./packages/parser-openrpc/examples/petstore-expanded.json'));
    await schemaFile.prepare();

    const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
      schemaFile,
    );

    const parser = parserBootstrap.createParser({...DEFAULT_PARSER_OPTIONS, ...DEFAULT_JSONRPC20_PARSER_OPTIONS, jsonRpcVersion: '2.0'});
    const model = parser.parse().model;

    ctx.expect(model).toBeDefined();
    ctx.expect(model.name).toEqual('Petstore Expanded');
    ctx.expect(model.servers).toHaveLength(1);
    ctx.expect(model.endpoints).toHaveLength(4);

    const endpointNames = model.endpoints.map(endpoint => endpoint.name);
    ctx.expect(endpointNames).toContain('get_pets');
    ctx.expect(endpointNames).toContain('create_pet');
    ctx.expect(endpointNames).toContain('get_pet_by_id');
    ctx.expect(endpointNames).toContain('delete_pet_by_id');
    ctx.expect(endpointNames).not.toContain('made_up');

    const e = model.endpoints[0];
    ctx.expect(e.name).toEqual('get_pets');
    ctx.expect(e.responses).toHaveLength(2); // 1 result, 1 error
    ctx.expect(e.responses[0].name).toEqual('petsResult');
    ctx.expect(Naming.getNameString(e.responses[0].type) ?? 'N/A').toEqual('GetPetsResponse'); // Should be 'pet'?

    const response0 = model.endpoints[0].responses[0];
    ctx.expect(response0.type.kind).toEqual(OmniTypeKind.OBJECT);

    const response0properties = ((response0.type.kind == OmniTypeKind.OBJECT) ? response0.type.properties : []) || [];
    ctx.expect(response0properties).toBeDefined();

    // All the properties are there, since we have not yet ran any model transformers over the parsed schema
    ctx.expect(response0properties.map(it => OmniUtil.getPropertyName(it.name, true))).toEqual([
      'jsonrpc',
      'error',
      'id',
      'result',
    ]); // The others are in abstract supertype

    const allTypes: Array<OmniType> = [];
    ProxyReducerOmni2.builder().reduce(model, {immutable: true}, {
      [ANY_KIND]: (n, r) => {
        if (OmniUtil.isType(n)) {
          allTypes.push(n);
        }
        r.callBase();
      },
    });

    ctx.expect(allTypes.map(it => OmniUtil.getVirtualTypeName(it))).toContain('DeletePetByIdResponse');
    ctx.expect(allTypes.map(it => OmniUtil.getVirtualTypeName(it))).toContain('ErrorUnknownError');
  });
});
