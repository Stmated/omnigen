import {GenericTypeKind, OpenRpcParser, SchemaFile} from '@parse';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Test Generic Model Creation', () => {
  const parser = new OpenRpcParser();

  test('Test basic loading', async () => {
    const dirPath ='./test/examples/openrpc/';
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const model = await parser.parse(new SchemaFile(filePath));
      expect(model).toBeDefined();
    }
  });

  test('PetStore should create expected model', async () => {
    const model = await parser.parse(new SchemaFile('./test/examples/openrpc/petstore-expanded.json'));

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
    expect(model.endpoints[0].responses[0].type.name).toEqual('GetPetsResponse'); // Should this be 'pet' since is name of `result`?

    const response0 = model.endpoints[0].responses[0];
    expect(response0.type.kind).toEqual(GenericTypeKind.OBJECT);

    const response0properties = ((response0.type.kind == GenericTypeKind.OBJECT) ? response0.type.properties : []) || [];
    expect(response0properties).toBeDefined();
    expect(response0properties).toHaveLength(3);
    expect(response0properties[0].name).toEqual('result');
    expect(response0properties[1].name).toEqual('error');
    expect(response0properties[2].name).toEqual('id');

    expect(model.types.map(it => it.name)).toContain('DeletePetByIdErrorUnknownError');
  });
});
