import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS, DEFAULT_PARSER_OPTIONS,
  OmniCompositionType,
  OmniEndpoint, OmniInterfaceOrObjectType,
  OmniModel,
  OmniObjectType,
  OmniPrimitiveKind,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
} from '@omnigen/core';
import {JavaUtil} from './JavaUtil.js';
import {MapArg, TestUtils} from '@omnigen/utils-test';
import {
  OmniUtil,
  SimplifyInheritanceModelTransformer,
} from '@omnigen/core-util';
import {describe, test, expect} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

describe('Test CompositionDependencyUtil', () => {

  const createModel = (namedTypes: OmniType[]): OmniModel => {

    // Let's create some fake endpoints, to make the types "edge" types that are used outwardly.
    const endpoints: OmniEndpoint[] = namedTypes
      ? namedTypes.map((t, idx) => {
        return {
          name: `Endpoint${idx}`,
          async: false,
          path: '/',
          requestQualifiers: [],
          examples: [],
          request: {
            type: {
              kind: OmniTypeKind.PRIMITIVE,
              primitiveKind: OmniPrimitiveKind.STRING,
            },
            contentType: 'application/json',
          },
          responses: [{
            type: t,
            required: true,
            contentType: 'application/json',
            name: `Response${idx}`,
            deprecated: false,
            qualifiers: [],
            error: false,
          }],
        };
      })
      : [];

    return {
      name: 'Test Model for Dependency Tests',
      types: namedTypes,
      endpoints: endpoints,
      version: '1.0',
      schemaType: 'other',
      servers: [],
      schemaVersion: '1.0',
    };
  };

  test('Empty', async () => {
    const model = createModel([]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(0);
    // expect(result.abstracts).toHaveLength(0);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('One Primitive', async () => {
    const model = createModel([{
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.NUMBER,
    }]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(0);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('One Class', async () => {
    const model = createModel([obj('A')]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(1);
    // expect(result.abstracts).toHaveLength(0);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('Two Classes', async () => {
    const model = createModel([obj('A'), obj('B')]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(2);
    // expect(result.abstracts).toHaveLength(0);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('A extends B, B', async () => {
    const b = obj('B');
    const model = createModel([obj('A', b), b]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(2);
    // expect(result.abstracts).toHaveLength(0);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(1);
  });

  test('A extends B', async () => {

    const model = createModel([obj('A', obj('B'))]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(2);
    expect(JavaUtil.getConcreteClasses(model)).toHaveLength(1);
    // expect(result.abstracts).toHaveLength(1);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(1);
  });

  test('A extends B, C extends D', async () => {

    const model = createModel([
      obj('A', obj('B')),
      obj('C', obj('D')),
    ]);

    // TODO: Should we introduce interfaces since B and D have the same contract?
    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(4);
    expect(JavaUtil.getConcreteClasses(model)).toHaveLength(2);
    // expect(result.abstracts).toHaveLength(2);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(2);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(2);
  });

  test('A extends B, C extends B', async () => {
    const b = obj('B');
    const model = createModel([obj('C', b), obj('C', b)]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(3);
    expect(JavaUtil.getConcreteClasses(model)).toHaveLength(2);
    // expect(result.abstracts).toHaveLength(1);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(2);
  });

  test('A extends B, C extends B, B', async () => {
    const b = obj('B');
    const model = createModel([obj('A', b), obj('C', b), b]);

    expect(model).toBeDefined();
    expect(getInterfaces(model)).toHaveLength(0);
    expect(JavaUtil.getClasses(model)).toHaveLength(3);
    // expect(result.abstracts).toHaveLength(0);
    expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(2);
  });

  test('A extends B & C, D extends B & C, B', async () => {
    const b = obj('B');
    const c = obj('C');
    const bc1 = and(b, c);
    const bc2 = and(b, c);
    const a = obj('A', bc1);
    const d = obj('D', bc2);

    const model = createModel([a, d, b, c]);

    assertTypes(getInterfaces(model), [c]);
    assertTypes(JavaUtil.getClasses(model), [a, b, c, d]);
    assertTypes(JavaUtil.getConcreteClasses(model), [a, d, b, c]);
    assertMap(JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [a, [b, c]],
      [d, [b, c]],
    ]));
  });

  test('A extends B & C, D extends C & B, B', async () => {
    const b = obj('B');
    const c = obj('C');
    const bc = and(b, c);
    const cb = and(c, b);
    const a = obj('A', bc);
    const d = obj('D', cb);

    const model = createModel([a, d, b, c]);

    // B is found before C, because A -> B (and B used as interface for D -> C & B)
    // This would change if the search was done breadth-first vs depth-first.
    assertTypes(getInterfaces(model), [b, c]);
    assertTypes(JavaUtil.getClasses(model), [a, b, c, d]);
    assertTypes(JavaUtil.getConcreteClasses(model), [a, d, b, c]);
    assertMap(JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [a, [b, c]],
      [d, [c, b]],
    ]));
  });

  test('ABCDEF w/o simplification', async () => {

    const dInline = inlineClassWithProp('DInline');

    const A = obj('A');
    const B = obj('B');
    const C = obj('C');
    const cAndInline = and(C, dInline);
    const D = obj('D', cAndInline);
    const E = obj('E', and(C, D));
    const F = obj('F', and(B, D));

    const model = createModel([A, B, C, D, E, F]);

    // This would change if the search was done breadth-first vs depth-first.
    assertTypes(getInterfaces(model), [D, C, dInline]);
    assertTypes(JavaUtil.getClasses(model), [A, B, C, D, E, F]);
    assertMap(JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [D, [C, dInline]],
      [E, [C, D]],
      [F, [B, D]],
    ]));
  });

  test('ABCDEF w/ simplification', async () => {

    const dInline = inlineClassWithProp('DInline');

    const A = obj('A');
    const B = obj('B');
    const C = obj('C');
    const cAndInline = and(C, dInline);
    const D = obj('D', cAndInline);
    const E = obj('E', and(C, D));
    const F = obj('F', and(B, D));

    const model = createModel([A, B, C, D, E, F]);

    new SimplifyInheritanceModelTransformer().transformModel({
      model: model,
      options: {...DEFAULT_PARSER_OPTIONS, ...DEFAULT_MODEL_TRANSFORM_OPTIONS},
    });

    // This would change if the search was done breadth-first vs depth-first.
    assertTypes(getInterfaces(model), [D, C, dInline]);
    assertTypes(JavaUtil.getClasses(model), [A, B, C, D, E, F]);
    assertMap(JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [D, [C, dInline]],
      [E, [D]],
      [F, [B, D]],
    ]));
  });

  // TODO: A test case where we expect 'dInline' to not an interface, and inline it because it is single use non-edge type?

  test('Ancestry w/o simplification', async () => {

    const A = obj('A');
    const B = obj('B', A);
    const C = obj('C', and(A, B));

    const model = createModel([A, C]);

    // Since we do not simplify the model, we will think that B needs to be an interface..
    // And A is also an interface, since if B is an interface and uses A, then A also needs to have an interface.
    assertTypes(getInterfaces(model), [B, A]);

    // And since B is never actually used other than supertype #2 for C, it will only be an interface and not a class.
    // TODO: Maybe this is wrong? B should also be available as a class? Make it an option "javaAddSuperfluousClass?"
    assertTypes(JavaUtil.getClasses(model), [A, C]);
    assertTypes(JavaUtil.getConcreteClasses(model), [A, C]);
    assertMap(JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [C, [A, B]],
      [B, [A]],
    ]));
  });

  test('Ancestry w/ simplification', async () => {

    const A = obj('A');
    const B = obj('B', A);
    const C = obj('C', and(A, B));

    const model = createModel([A, B, C]);

    // const parserOptions = OptionsUtil.resolve(DEFAULT_PARSER_OPTIONS, {}, PARSER_OPTIONS_RESOLVERS);
    // const transformOptions = OptionsUtil.resolve(DEFAULT_MODEL_TRANSFORM_OPTIONS, {}, TRANSFORM_OPTIONS_RESOLVER);

    new SimplifyInheritanceModelTransformer().transformModel({
      model: model,
      options: {...DEFAULT_PARSER_OPTIONS, ...DEFAULT_MODEL_TRANSFORM_OPTIONS},
    });

    expect(getInterfaces(model)).toEqual([]);
    expect(JavaUtil.getClasses(model)).toEqual([A, B, C]);
    expect(JavaUtil.getConcreteClasses(model)).toEqual([A, B, C]);
    assertMap(JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [C, [B]],
      [B, [A]],
    ]));
  });
});

function map<T>(arg: MapArg<T>): Map<T, T[]> {
  return TestUtils.map(arg);
}

function obj(name: string, extendedBy?: OmniSuperTypeCapableType): OmniObjectType {
  return TestUtils.obj(name, extendedBy);
}

function and<T extends OmniType>(...types: T[]): OmniCompositionType<T, typeof OmniTypeKind.INTERSECTION> {
  return TestUtils.and(...types);
}

function assertTypes<T extends OmniType>(expected: T[], given: T[]) {

  const expectedDescriptions = expected.map(it => OmniUtil.describe(it)).join(', ');
  const givenDescriptions = given.map(it => OmniUtil.describe(it)).join(', ');

  expect(expectedDescriptions).toEqual(givenDescriptions);
}

function assertMap<T extends OmniType>(expected: Map<T, T[]>, given: Map<T, T[]>) {

  for (const e of expected.entries()) {
    const givenValues = given.get(e[0]);
    if (!givenValues) {
      throw new Error(`Expected key '${OmniUtil.describe(e[0])}' but not in given`);
    }

    const keyDescription = OmniUtil.describe(e[0]);
    const expectedDescriptions = e[1].map(it => OmniUtil.describe(it)).join(', ');
    const givenDescriptions = givenValues.map(it => OmniUtil.describe(it)).join(', ');

    expect(`${keyDescription}: ${expectedDescriptions}`).toEqual(`${keyDescription}: ${givenDescriptions}`);
  }

  for (const e of given.entries()) {
    if (!expected.has(e[0])) {
      throw new Error(`Given unexpected '${OmniUtil.describe(e[0])}`);
    }
  }
}

const inlineClassWithProp = (name: string): OmniObjectType => {
  const inline: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    properties: [],
    name: `${name}Class`,
  };
  inline.properties = [
    {
      name: `${name}Property`,
      owner: inline,
      type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER},
    },
  ];
  return inline;
};

function getAsInterface(model: OmniModel, type: OmniType): OmniInterfaceOrObjectType | undefined {

  const unwrapped = OmniUtil.getUnwrappedType(type);
  if (unwrapped.kind == OmniTypeKind.INTERFACE) {
    return unwrapped;
  }

  if (unwrapped.kind != OmniTypeKind.OBJECT) {
    return undefined;
  }

  // Now we need to figure out if this type is ever used as an interface in another type.

  const subTypeOfOurType = OmniUtil.visitTypesDepthFirst(model, ctx => {
    if ('extendedBy' in ctx.type && ctx.type.extendedBy) {

      const flattened = OmniUtil.getFlattenedSuperTypes(ctx.type.extendedBy);
      const usedAtIndex = flattened.indexOf(unwrapped);
      if (usedAtIndex > 0) {
        return ctx.type;
      }
    }

    return;
  });

  if (subTypeOfOurType) {

    const typeName = OmniUtil.describe(unwrapped);
    const subType = OmniUtil.describe(subTypeOfOurType);
    logger.debug(`Given type ${typeName} is used as interface in type ${subType}`);
    return unwrapped;
  }

  return undefined;
}

function getInterfaces(model: OmniModel): OmniInterfaceOrObjectType[] {

  const interfaces: OmniInterfaceOrObjectType[] = [];

  OmniUtil.visitTypesDepthFirst(model, ctx => {
    const asInterface = getAsInterface(model, ctx.type);
    if (asInterface && !interfaces.includes(asInterface)) {
      interfaces.push(asInterface);

      // TODO: THIS IS WRONG! MOVE THIS INTO "getAsInterface"! It must be *central* to how it is decided!

      // If this is an interface, then we also need to add *all* supertypes as interfaces.
      // This is because an interface cannot inherit from a class, so all needs to be interfaces.
      for (const superClass of JavaUtil.getSuperClassHierarchy(model, asInterface)) {

        // getAsInterface is costly. So do a quicker check here.
        // The check might desync from the definition of an interface in getAsInterface, so keep heed here.
        if (superClass.kind == OmniTypeKind.OBJECT || superClass.kind == OmniTypeKind.INTERFACE) {
          if (!interfaces.includes(superClass)) {
            interfaces.push(superClass);
          }
        }
      }
    }
  });

  return interfaces;
}
