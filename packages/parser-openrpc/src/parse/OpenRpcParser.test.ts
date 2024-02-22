import * as fs from 'fs/promises';
import * as path from 'path';
import {DEFAULT_PARSER_OPTIONS} from '@omnigen/core';
import {OmniTypeKind} from '@omnigen/core';
import {JavaUtil} from '@omnigen/target-java';
import {OpenRpcParserBootstrapFactory} from './OpenRpcParser.js';
import {OmniUtil, SchemaFile} from '@omnigen/core-util';
import {DEFAULT_JSONRPC20_PARSER_OPTIONS} from '../options/index.ts';
import {describe, test, expect} from 'vitest';

describe('Test Generic Model Creation', () => {

  const parserBootstrapFactory = new OpenRpcParserBootstrapFactory();

  // const options: OpenRpcParserOptions = {
  //   ...DEFAULT_PARSER_OPTIONS,
  //   ...ZodJsonRpc20ParserOptions.parse({}),
  // };

  test('Test basic loading', async () => {
    const dirPath = '../parser-openrpc/examples/';
    const files = await fs.readdir(dirPath, {withFileTypes: true});
    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }

      const filePath = path.join(dirPath, file.name);
      const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
        new SchemaFile(filePath),
      );

      // const realOptions = OptionsUtil.resolve(options, undefined, OPENRPC_OPTIONS_RESOLVERS);

      const parser = parserBootstrap.createParser({...DEFAULT_PARSER_OPTIONS, ...DEFAULT_JSONRPC20_PARSER_OPTIONS});
      const model = (await parser.parse()).model;
      expect(model).toBeDefined();
    }
  });

  test('PetStore should create expected model', async () => {

    const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
      new SchemaFile('../parser-openrpc/examples/petstore-expanded.json'),
    );

    // const realOptions = OptionsUtil.resolve(options, undefined, OPENRPC_OPTIONS_RESOLVERS);
    const parser = parserBootstrap.createParser({...DEFAULT_PARSER_OPTIONS, ...DEFAULT_JSONRPC20_PARSER_OPTIONS});
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
    expect(e.responses[0].name).toEqual('pet'); // Or should it be something else?
    expect(JavaUtil.getClassName(e.responses[0].type)).toEqual('GetPetsResponse'); // Should be 'pet'?

    const response0 = model.endpoints[0].responses[0];
    expect(response0.type.kind).toEqual(OmniTypeKind.OBJECT);

    const response0properties = ((response0.type.kind == OmniTypeKind.OBJECT) ? response0.type.properties : []) || [];
    expect(response0properties).toBeDefined();

    // All the properties are there, since we have not yet ran any model transformers over the parsed schema
    expect(response0properties.map(it => it.name)).toEqual([
      'jsonrpc',
      'error',
      'id',
      'result',
    ]); // The others are in abstract supertype

    const allTypes = OmniUtil.getAllExportableTypes(model, model.types);
    expect(allTypes.all.map(it => JavaUtil.getClassName(it))).toContain('DeletePetByIdResponse');
    expect(allTypes.all.map(it => JavaUtil.getClassName(it))).toContain('ErrorUnknownError');
  });
});


