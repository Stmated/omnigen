import {describe, test} from 'vitest';
import {JsonSchemaMigrator} from './JsonSchemaMigrator.ts';

describe('JsonSchemaMigrator', () => {

  const migrator = new JsonSchemaMigrator();
  test('basic', ctx => {
    const migrated = migrator.migrate({
      $schema: 'http://json-schema.org/draft-07/schema',
    });

    ctx.expect(migrated.$schema).toEqual('https://json-schema.org/draft/2020-12/schema');
  });

  test('missed id to $id', ctx => {
    const migrated = migrator.migrate({
      $schema: 'http://json-schema.org/draft-07/schema',
      id: 'foo',
    });

    ctx.expect(migrated).not.toHaveProperty('$id');
    ctx.expect(migrated.id).toEqual('foo');
  });

  test('id to $id', ctx => {
    const migrated = migrator.migrate({
      $schema: 'http://json-schema.org/draft-05/schema',
      id: 'foo',
    });

    ctx.expect(migrated).not.toHaveProperty('id');
    ctx.expect(migrated.$id).toEqual('foo');
  });

  test('nested-inner-missed', ctx => {
    const migrated = migrator.migrate({
      $schema: 'http://json-schema.org/draft-05/schema',
      id: 'foo',
      properties: {
        a: {
          $schema: 'http://json-schema.org/draft-07/schema',
          id: 'bar',
        },
      },
    });

    ctx.expect(migrated).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'foo',
      properties: {
        a: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          id: 'bar',
        },
      },
    });
  });

  test('nested-outer-missed', ctx => {
    const migrated = migrator.migrate({
      $schema: 'http://json-schema.org/draft-07/schema',
      id: 'foo',
      properties: {
        a: {
          $schema: 'http://json-schema.org/draft-05/schema',
          id: 'bar',
        },
      },
    });

    ctx.expect(migrated).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      id: 'foo',
      properties: {
        a: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          $id: 'bar',
        },
      },
    });
  });

  test('nested-advanced', ctx => {
    const migrated = migrator.migrate({
      $schema: 'http://json-schema.org/draft-05/schema',
      id: 'foo',
      properties: {
        obj: {
          type: 'object',
          properties: {
            name: {type: 'string'},
            credit_card: {type: 'number'},
            billing_address: {type: 'string'},
            age: {
              type: 'number',
              exclusiveMinimum: true,
              minimum: 18,
            },
            array1: {
              items: [
                {$ref: '#/definitions/foo'},
                {$ref: '#/definitions/bar'},
              ],
            },
            array2: {
              items: [
                {$ref: '#/definitions/foo'},
                {$ref: '#/definitions/bar'},
              ],
              additionalItems: false,
            },
            array3: {
              items: [
                {$ref: '#/definitions/foo'},
                {$ref: '#/definitions/bar'},
              ],
              additionalItems: {$ref: '#/definitions/baz'},
            },
          },
          dependencies: {
            credit_card: ['name'], // Array of property names, means "name" is required when "credit_card" is present.
            name: { // JSON schema means the schema applies when "name" is present.
              properties: {
                billing_address: {type: 'string'},
              },
              required: ['billing_address'],
            },
          },
        },
      },
      definitions: {
        Data: {
          type: 'object',
          properties: {
            prop: {type: 'string'},
          },
        },
        OtherData: {
          type: 'object',
          properties: {
            data: {$ref: '#/definitions/Data'},
          },
        },
      },
    });

    ctx.expect(migrated).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'foo',
      properties: {
        obj: {
          type: 'object',
          properties: {
            name: {type: 'string'},
            credit_card: {type: 'number'},
            billing_address: {type: 'string'},
            age: {
              type: 'number',
              exclusiveMinimum: 18,
            },
            array1: {
              prefixItems: [
                {$ref: '#/definitions/foo'},
                {$ref: '#/definitions/bar'},
              ],
            },
            array2: {
              prefixItems: [
                {$ref: '#/definitions/foo'},
                {$ref: '#/definitions/bar'},
              ],
              items: false,
            },
            array3: {
              prefixItems: [
                {$ref: '#/definitions/foo'},
                {$ref: '#/definitions/bar'},
              ],
              items: {$ref: '#/definitions/baz'},
            },
          },
          dependentRequired: {
            credit_card: ['name'],
          },
          dependentSchemas: {
            name: {
              properties: {
                billing_address: {type: 'string'},
              },
              required: ['billing_address'],
            },
          },
        },
      },
      definitions: {
        Data: {
          type: 'object',
          properties: {
            prop: {type: 'string'},
          },
        },
        OtherData: {
          type: 'object',
          properties: {
            data: {$ref: '#/definitions/Data'},
          },
        },
      },
    });
  });
});
