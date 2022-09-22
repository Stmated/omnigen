import {OmniTypeKind, OpenRpcParser, SchemaFile} from '@parse';
import * as fs from 'fs/promises';
import * as path from 'path';
import {Naming} from '@parse/Naming';
import {OmniModelUtil} from '@parse/OmniModelUtil';
import {DEFAULT_JAVA_OPTIONS, JavaUtil} from '@java';
import {TestUtils} from '../../TestUtils';

describe('Test Generic Model Creation', () => {
  const parser = new OpenRpcParser();

  test('Test basic loading', async () => {
    const dirPath = './test/examples/openrpc/';
    const files = await fs.readdir(dirPath, {withFileTypes: true});
    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(dirPath, file.name);
        const model = await parser.parse(new SchemaFile(filePath));
        expect(model).toBeDefined();
      }
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
    expect(JavaUtil.getClassName(model.endpoints[0].responses[0].type)).toEqual('GetPetsResponse'); // Should this be 'pet' since is name of `result`?

    const response0 = model.endpoints[0].responses[0];
    expect(response0.type.kind).toEqual(OmniTypeKind.OBJECT);

    const response0properties = ((response0.type.kind == OmniTypeKind.OBJECT) ? response0.type.properties : []) || [];
    expect(response0properties).toBeDefined();
    expect(response0properties).toHaveLength(1); // The others are in abstract supertype
    expect(response0properties[0].name).toEqual('result');

    const allTypes = OmniModelUtil.getAllExportableTypes(model, model.types);
    expect(allTypes.all.map(it => JavaUtil.getClassName(it))).toContain('DeletePetByIdResponse');
    expect(allTypes.all.map(it => JavaUtil.getClassName(it))).toContain('ErrorUnknownError');
  });

  test('Ethereum XOrNull', async () => {

    const model = await TestUtils.readExample('openrpc', 'ethereum.json', DEFAULT_JAVA_OPTIONS);

    // TODO: Add expectations

    expect(model).toBeDefined();
  });
});


