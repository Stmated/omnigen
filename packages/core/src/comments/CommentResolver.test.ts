import {describe, test} from 'vitest';
import {
  OMNI_GENERIC_FEATURES,
  OMNI_RESTRICTIVE_GENERIC_FEATURES,
  OmniEndpoint,
  OmniItemKind,
  OmniLink,
  OmniModel,
  OmniObjectType,
  OmniPrimitiveBaseType,
  OmniProperty,
  OmniTypeKind,
} from '@omnigen/api';
import {CommentResolver} from './CommentResolver';
import type {TaskContext, TestContext} from 'vitest';

// ── helpers ──────────────────────────────────────────────────────────────

function emptyModel(overrides?: Partial<OmniModel>): OmniModel {
  return {
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [],
    types: [],
    ...overrides,
  };
}

function prop(name: string, type: OmniProperty['type'], extra?: Partial<OmniProperty>): OmniProperty {
  return {kind: OmniItemKind.PROPERTY, name, type, ...extra};
}

function obj(name: string, properties: OmniProperty[] = []): OmniObjectType {
  return {kind: OmniTypeKind.OBJECT, name, properties};
}

function ep(
  name: string,
  requestType: OmniObjectType,
  responseType: OmniObjectType,
  extra?: Partial<OmniEndpoint>,
): OmniEndpoint {
  return {
    kind: OmniItemKind.ENDPOINT,
    name,
    transports: [{kind: OmniItemKind.TRANSPORT_HTTP, async: false, path: '/'}],
    request: {kind: OmniItemKind.INPUT, type: requestType, contentType: 'application/json'},
    responses: [{
      kind: OmniItemKind.OUTPUT,
      name: `${name}Response`,
      type: responseType,
      contentType: 'application/json',
      required: true,
      deprecated: false,
      error: false,
      qualifiers: [],
    }],
    ...extra,
  };
}

function snap(ctx: TaskContext & TestContext, name?: string): string {
  if (name) {
    return `./__snapshots__/${ctx.task.suite?.name}-${ctx.task.name}-${name}.json`;
  } else {
    return `./__snapshots__/${ctx.task.suite?.name}-${ctx.task.name}.json`;
  }
}

function strType(extra?: Omit<Partial<OmniPrimitiveBaseType>, 'kind'>): OmniPrimitiveBaseType<typeof OmniTypeKind.STRING> {
  return {...extra, kind: OmniTypeKind.STRING};
}

function intType(extra?: Omit<Partial<OmniPrimitiveBaseType>, 'kind'>): OmniPrimitiveBaseType<typeof OmniTypeKind.INTEGER> {
  return {...extra, kind: OmniTypeKind.INTEGER};
}

// ── tests ────────────────────────────────────────────────────────────────

describe('CommentResolver', () => {

  const resolver = new CommentResolver(OMNI_GENERIC_FEATURES);

  // ── getTypeDeclarationComment ────────────────────────────────────────

  describe('getTypeDeclarationComment', () => {

    test('empty', async ctx => {
      const result = resolver.getTypeDeclarationComment(emptyModel(), obj('Empty'));
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('description_summary', async ctx => {
      const type: OmniObjectType = {
        ...obj('Described'),
        description: 'A detailed description',
        summary: 'A brief summary',
        title: 'My Title',
      };
      const result = resolver.getTypeDeclarationComment(emptyModel(), type);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('direct_examples', async ctx => {
      const type: OmniObjectType = {
        ...obj('WithExamples'),
        examples: [
          {kind: OmniItemKind.EXAMPLE, value: {id: 1, name: 'Alice'}, description: 'First example'},
          {kind: OmniItemKind.EXAMPLE, value: {id: 2, name: 'Bob'}},
        ],
      };
      const result = resolver.getTypeDeclarationComment(emptyModel(), type);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('composition_descriptions', async ctx => {
      const type = {
        kind: OmniTypeKind.UNION,
        types: [
          {...obj('ChildA'), description: 'First variant'},
          {...obj('ChildB'), summary: 'Second variant summary'},
          obj('ChildC'),
        ],
      };
      const result = resolver.getTypeDeclarationComment(emptyModel(), type);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('from_endpoint_response', async ctx => {
      const responseType: OmniObjectType = {...obj('ResponseObj'), description: 'Response object'};
      const endpoint = ep('getData', obj('RequestObj'), responseType);
      const firstResponse = endpoint.responses[0];
      if (firstResponse) {
        firstResponse.description = 'Successful response';
        firstResponse.summary = 'Returns the data';
      }
      const model = emptyModel({endpoints: [endpoint]});
      const result = resolver.getTypeDeclarationComment(model, responseType);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('from_endpoint_request', async ctx => {
      const innerType = obj('InnerType');
      const requestType = obj('RequestObj', [
        prop('field', innerType, {description: 'An important field', summary: 'Field summary'}),
      ]);
      const model = emptyModel({endpoints: [ep('sendData', requestType, obj('ResponseObj'))]});
      const result = resolver.getTypeDeclarationComment(model, innerType);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('from_example_pair', async ctx => {
      const resultType = obj('ResultObj');
      const idProp = prop('id', intType());
      const endpoint = ep('fetchStuff', obj('RequestObj', [idProp]), resultType, {
        examples: [{
          kind: OmniItemKind.EXAMPLE_PAIRING,
          name: 'happy path',
          description: 'Fetch when everything is fine',
          params: [{
            kind: OmniItemKind.EXAMPLE_PARAM,
            name: 'id',
            property: idProp,
            type: intType(),
            value: 42,
          }],
          result: {
            kind: OmniItemKind.EXAMPLE_RESULT,
            name: 'result',
            type: resultType,
            value: {status: 'ok'},
            description: 'The success result',
          },
        }],
      });
      const model = emptyModel({endpoints: [endpoint]});
      const result = resolver.getTypeDeclarationComment(model, resultType);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('literal_wo_support', async ctx => {
      const resolver = new CommentResolver(OMNI_RESTRICTIVE_GENERIC_FEATURES);
      const result = resolver.getTypeDeclarationComment(emptyModel(), strType({literal: true, value: 'FIXED'}));
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('literal_w_support', async ctx => {
      const result = resolver.getTypeDeclarationComment(emptyModel(), strType({literal: true, value: 'FIXED'}));
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('continuation_links', async ctx => {
      const srcProp = prop('srcField', strType());
      const tgtProp = prop('tgtField', strType());
      const srcObj = obj('SourceObj', [srcProp]);
      const tgtObj = obj('TargetObj', [tgtProp]);
      const link: OmniLink = {
        kind: OmniItemKind.LINK,
        mappings: [{
          kind: OmniItemKind.LINK_MAPPING,
          source: {kind: OmniItemKind.LINK_SOURCE_PARAMETER, propertyPath: [srcProp]},
          target: {kind: OmniItemKind.LINK_TARGET_PARAMETER, propertyPath: [tgtProp]},
        }],
      };
      const model = emptyModel({types: [srcObj, tgtObj], continuations: [link]});
      const result = resolver.getTypeDeclarationComment(model, srcObj);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('dedup_summary_description', async ctx => {
      const type: OmniObjectType = {...obj('Dedup'), description: 'Same text', summary: 'Same text'};
      const result = resolver.getTypeDeclarationComment(emptyModel(), type);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── getPropertyComment ───────────────────────────────────────────────

  describe('getPropertyComment', () => {

    test('basic', async ctx => {
      const p = prop('myProp', strType(), {description: 'Property description', summary: 'Property summary'});
      const result = resolver.getPropertyComment(emptyModel(), p.type, p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('deprecated', async ctx => {
      const p = prop('old', intType(), {description: 'Old field', deprecated: true});
      const result = resolver.getPropertyComment(emptyModel(), p.type, p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('object_type_then_no_comment', async ctx => {
      const innerObj: OmniObjectType = {...obj('Inner'), description: 'Inner obj description'};
      const p = prop('nested', innerObj);
      const result = resolver.getPropertyComment(emptyModel(), p.type, p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('primitive_type_then_comment', async ctx => {
      const p = prop('code', strType({description: 'A status code'}));
      const result = resolver.getPropertyComment(emptyModel(), p.type, p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('default_value', async ctx => {
      const p = prop('threshold', {kind: OmniTypeKind.DOUBLE, value: 0.5});
      const result = resolver.getPropertyComment(emptyModel(), p.type, p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('literal_wo_support', async ctx => {
      const resolver = new CommentResolver(OMNI_RESTRICTIVE_GENERIC_FEATURES);
      const p = prop('version', strType({literal: true, value: '2.0'}));
      const result = resolver.getPropertyComment(emptyModel(), p.type, p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── getAccessorComment ───────────────────────────────────────────────

  describe('getAccessorComment', () => {

    test('basic', async ctx => {
      const p = prop('name', strType({description: 'The name'}), {description: 'Accessor for name', summary: 'Name getter'});
      const result = resolver.getAccessorComment(emptyModel(), p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('deprecated', async ctx => {
      const p = prop('legacy', intType(), {description: 'Old accessor', deprecated: true});
      const result = resolver.getAccessorComment(emptyModel(), p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── getMutatorComment ────────────────────────────────────────────────

  describe('getMutatorComment', () => {

    test('basic', async ctx => {
      const p = prop('count', intType({description: 'The count value'}), {description: 'Set the count'});
      const result = resolver.getMutatorComment(emptyModel(), p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── getMethodDeclarationComment ──────────────────────────────────────

  describe('getMethodDeclarationComment', () => {

    test('basic', async ctx => {
      const returnType = strType({description: 'Whether it succeeded', summary: 'Success flag'});
      const result = resolver.getMethodDeclarationComment(
        emptyModel(),
        returnType,
        [{name: 'input', type: intType({description: 'The input value'})}],
        true,
      );
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('fallback_to_return_type', async ctx => {
      const returnType = strType({description: 'The result description', summary: 'Result summary'});
      const result = resolver.getMethodDeclarationComment(
        emptyModel(),
        returnType,
        [{name: 'a', type: intType()}, {name: 'b', type: intType()}],
      );
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('w_examples_and_links', async ctx => {
      const srcProp = prop('srcField', strType());
      const tgtProp = prop('tgtField', strType());
      const srcObj = obj('SourceObj', [srcProp]);
      const tgtObj = obj('TargetObj', [tgtProp]);
      const link: OmniLink = {
        kind: OmniItemKind.LINK,
        mappings: [{
          kind: OmniItemKind.LINK_MAPPING,
          source: {kind: OmniItemKind.LINK_SOURCE_PARAMETER, propertyPath: [srcProp]},
          target: {kind: OmniItemKind.LINK_TARGET_PARAMETER, propertyPath: [tgtProp]},
        }],
      };
      const endpoint = ep('doStuff', obj('Req'), srcObj, {
        examples: [{
          kind: OmniItemKind.EXAMPLE_PAIRING,
          name: 'example 1',
          description: 'An example call',
          params: [{kind: OmniItemKind.EXAMPLE_PARAM, name: 'x', property: srcProp, type: strType(), value: 'hello'}],
          result: {kind: OmniItemKind.EXAMPLE_RESULT, name: 'result', type: srcObj, value: {ok: true}},
        }],
      });
      const model = emptyModel({endpoints: [endpoint], types: [srcObj, tgtObj], continuations: [link]});
      const result = resolver.getMethodDeclarationComment(
        model,
        srcObj,
        [],
      );
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── getMethodDeclarationParameterComment ─────────────────────────────

  describe('getMethodDeclarationParameterComment', () => {

    test('w_type', async ctx => {
      const type = strType({description: 'A filter expression', summary: 'Filter expr', title: 'filter'});
      const result = resolver.getMethodDeclarationParameterComment(emptyModel(), type);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── getMethodCallArgumentComment ─────────────────────────────────────

  describe('getMethodCallArgumentComment', () => {

    test('w_value', async ctx => {
      const p = prop('id', intType(), {description: 'The entity identifier'});
      const result = resolver.getMethodCallArgumentComment(emptyModel(), p, 42);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('wo_value', async ctx => {
      const p = prop('query', strType(), {description: 'Search query', summary: 'The query'});
      const result = resolver.getMethodCallArgumentComment(emptyModel(), p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── getConstructorComment ────────────────────────────────────────────

  describe('getConstructorComment', () => {

    test('w_properties', async ctx => {
      const innerObj = obj('Person', [
        prop('firstName', strType(), {description: 'First name'}),
        prop('lastName', strType(), {description: 'Last name', summary: 'Surname'}),
        prop('age', intType()),
      ]);
      const p = prop('person', innerObj, {description: 'Construct a person'});
      const result = resolver.getConstructorComment(emptyModel(), p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });

    test('wo_properties', async ctx => {
      const p = prop('value', strType(), {description: 'A simple value'});
      const result = resolver.getConstructorComment(emptyModel(), p);
      await ctx.expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snap(ctx));
    });
  });

  // ── integration / combined scenarios ─────────────────────────────────

  describe('integration', () => {

    test('rich', async ctx => {
      const resolver = new CommentResolver(OMNI_RESTRICTIVE_GENERIC_FEATURES);

      const idProp = prop('id', intType(), {description: 'Unique identifier'});
      const statusProp = prop('status', strType({literal: true, value: 'active'}), {description: 'Status field'});

      const thingType: OmniObjectType = {
        ...obj('Thing', [idProp, statusProp]),
        description: 'A thing in the system',
        summary: 'Thing entity',
      };

      const thingIdProp = prop('thingId', intType(), {description: 'The thing to fetch'});
      const requestType = obj('GetThingRequest', [thingIdProp]);

      const endpoint = ep('getThing', requestType, thingType, {
        examples: [{
          kind: OmniItemKind.EXAMPLE_PAIRING,
          name: 'get thing #1',
          description: 'Fetch thing with id 1',
          params: [{
            kind: OmniItemKind.EXAMPLE_PARAM,
            name: 'thingId',
            property: thingIdProp,
            type: intType(),
            value: 1,
          }],
          result: {
            kind: OmniItemKind.EXAMPLE_RESULT,
            name: 'thing result',
            type: thingType,
            value: {id: 1, status: 'active'},
            description: 'The fetched thing',
          },
        }],
      });

      const tgtProp = prop('relatedId', intType());
      const tgtObj = obj('Related', [tgtProp]);
      const link: OmniLink = {
        kind: OmniItemKind.LINK,
        mappings: [{
          kind: OmniItemKind.LINK_MAPPING,
          source: {kind: OmniItemKind.LINK_SOURCE_PARAMETER, propertyPath: [idProp]},
          target: {kind: OmniItemKind.LINK_TARGET_PARAMETER, propertyPath: [tgtProp]},
        }],
      };

      const model = emptyModel({
        endpoints: [endpoint],
        types: [thingType, requestType, tgtObj],
        continuations: [link],
      });

      const ctorProp = prop('thing', thingType, {description: 'Build a thing'});

      const comments = JSON.stringify({
        type: resolver.getTypeDeclarationComment(model, thingType),
        prop: resolver.getPropertyComment(model, statusProp.type, statusProp),
        accessor: resolver.getAccessorComment(model, idProp),
        mutator: resolver.getMutatorComment(model, idProp),
        ctor: resolver.getConstructorComment(model, ctorProp),
      }, null, 2);

      await ctx.expect(comments).toMatchFileSnapshot(snap(ctx));
    });
  });
});
