import * as fs from 'fs/promises';
import * as path from 'path';
import {RealOptions} from '@omnigen/core';
import {IOpenRpcParserOptions, JSONRPC_20_PARSER_OPTIONS, OpenRpcParserBootstrapFactory} from '../index';
import {DEFAULT_PARSER_OPTIONS} from '@omnigen/core';
import {OmniTypeKind, OmniUtil, SchemaFile} from '@omnigen/core';
import {JavaUtil} from '@omnigen/target-java';

describe('Test Generic Model Creation', () => {

  const parserBootstrapFactory = new OpenRpcParserBootstrapFactory();

  // TODO: This is a bit stupid, no?
  const options: RealOptions<IOpenRpcParserOptions> = {
    ...DEFAULT_PARSER_OPTIONS,
    ...JSONRPC_20_PARSER_OPTIONS
  };

  test('Test basic loading', async () => {
    const dirPath = '../parser-openrpc/examples/';
    const files = await fs.readdir(dirPath, {withFileTypes: true});
    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }
      
      const filePath = path.join(dirPath, file.name);
      const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
        new SchemaFile(filePath)
      );
      const parser = parserBootstrap.createParser(options);
      const model = parser.parse().model;
      expect(model).toBeDefined();
    }
  });

  test('PetStore should create expected model', async () => {

    const parserBootstrap = await parserBootstrapFactory.createParserBootstrap(
      new SchemaFile('../parser-openrpc/examples/petstore-expanded.json')
    );
    const parser = parserBootstrap.createParser(options);
    const model = parser.parse().model;

    expect(model).toBeDefined();
    expect(model.name).toEqual('Petstore Expanded');
    expect(model.servers).toHaveLength(1);
    expect(model.endpoints).toHaveLength(4);

    const endpointNames = model.endpoints.map((endpoint) => endpoint.name);
    expect(endpointNames).toContain('get_pets');
    expect(endpointNames).toContain('create_pet');
    expect(endpointNames).toContain('get_pet_by_id');
    expect(endpointNames).toContain('delete_pet_by_id');
    expect(endpointNames).not.toContain('made_up');

    expect(model.endpoints[0].name).toEqual('get_pets');
    expect(model.endpoints[0].responses).toHaveLength(2); // 1 result, 1 error
    expect(model.endpoints[0].responses[0].name).toEqual('pet'); // Or should it be something else?
    expect(JavaUtil.getClassName(model.endpoints[0].responses[0].type)).toEqual('GetPetsResponse'); // Should this be 'pet' since is name of `result`?

    const response0 = model.endpoints[0].responses[0];
    expect(response0.type.kind).toEqual(OmniTypeKind.OBJECT);

    const response0properties = ((response0.type.kind == OmniTypeKind.OBJECT) ? response0.type.properties : []) || [];
    expect(response0properties).toBeDefined();
    expect(response0properties).toHaveLength(1); // The others are in abstract supertype
    expect(response0properties[0].name).toEqual('result');

    const allTypes = OmniUtil.getAllExportableTypes(model, model.types);
    expect(allTypes.all.map(it => JavaUtil.getClassName(it))).toContain('DeletePetByIdResponse');
    expect(allTypes.all.map(it => JavaUtil.getClassName(it))).toContain('ErrorUnknownError');
  });
});

