import * as fs from 'fs/promises';
import * as path from 'path';
import {DEFAULT_PARSER_OPTIONS, OmniType} from '@omnigen/core';
import {OmniTypeKind} from '@omnigen/core';
import {OpenRpcParserBootstrapFactory} from './OpenRpcParser.ts';
import {Naming, OmniUtil, SchemaFile, Util} from '@omnigen/core-util';
import {DEFAULT_JSONRPC20_PARSER_OPTIONS} from '../options';
import {describe, test, expect} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';

describe('Test Generic Model Creation', () => {

  const parserBootstrapFactory = new OpenRpcParserBootstrapFactory();

  test('Test basic loading', async () => {
    const dirPath = Util.getPathFromRoot('./packages/parser-openrpc/examples/');
    const files = await fs.readdir(dirPath, {withFileTypes: true});
    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }

      const filePath = path.join(dirPath, file.name);
      const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
        new SchemaFile(filePath),
      );

      const parser = parserBootstrap.createParser({...DEFAULT_PARSER_OPTIONS, ...DEFAULT_JSONRPC20_PARSER_OPTIONS, jsonRpcVersion: '2.0'});
      try {
        const model = (await parser.parse()).model;
        expect(model).toBeDefined();
      } catch (ex) {
        throw LoggerFactory.formatError(ex);
      }
    }
  }, {timeout: 5_000});

  test('PetStore should create expected model', async () => {

    const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
      new SchemaFile(Util.getPathFromRoot('./packages/parser-openrpc/examples/petstore-expanded.json')),
    );

    const parser = parserBootstrap.createParser({...DEFAULT_PARSER_OPTIONS, ...DEFAULT_JSONRPC20_PARSER_OPTIONS, jsonRpcVersion: '2.0'});
    const model = (await parser.parse()).model;

    expect(model).toBeDefined();
    expect(model.name).toEqual('Petstore Expanded');
    expect(model.servers).toHaveLength(1);
    expect(model.endpoints).toHaveLength(4);

    const endpointNames = model.endpoints.map(endpoint => endpoint.name);
    expect(endpointNames).toContain('get_pets');
    expect(endpointNames).toContain('create_pet');
    expect(endpointNames).toContain('get_pet_by_id');
    expect(endpointNames).toContain('delete_pet_by_id');
    expect(endpointNames).not.toContain('made_up');

    const e = model.endpoints[0];
    expect(e.name).toEqual('get_pets');
    expect(e.responses).toHaveLength(2); // 1 result, 1 error
    expect(e.responses[0].name).toEqual('petsResult');
    expect(Naming.unwrap(OmniUtil.getTypeName(e.responses[0].type) ?? 'N/A')).toEqual('GetPetsResponse'); // Should be 'pet'?

    const response0 = model.endpoints[0].responses[0];
    expect(response0.type.kind).toEqual(OmniTypeKind.OBJECT);

    const response0properties = ((response0.type.kind == OmniTypeKind.OBJECT) ? response0.type.properties : []) || [];
    expect(response0properties).toBeDefined();

    // All the properties are there, since we have not yet ran any model transformers over the parsed schema
    expect(response0properties.map(it => OmniUtil.getPropertyName(it.name, true))).toEqual([
      'jsonrpc',
      'error',
      'id',
      'result',
    ]); // The others are in abstract supertype

    const allTypes: OmniType[] = [];
    OmniUtil.visitTypesDepthFirst(model, ctx => {
      allTypes.push(ctx.type);
    });

    expect(allTypes.map(it => {
      const typeName = OmniUtil.getTypeName(it);
      return typeName ? Naming.unwrap(typeName) : undefined;
    })).toContain('DeletePetByIdResponse');
    expect(allTypes.map(it => {
      const typeName = OmniUtil.getTypeName(it);
      return typeName ? Naming.unwrap(typeName) : undefined;
    })).toContain('ErrorUnknownError');
  });
});


