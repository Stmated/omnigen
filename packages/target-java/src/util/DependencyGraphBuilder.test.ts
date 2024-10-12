import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PARSER_OPTIONS,
  OmniCompositionType,
  OmniEndpoint,
  OmniInterfaceOrObjectType,
  OmniItemKind,
  OmniModel, OmniNode,
  OmniObjectType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
} from '@omnigen/api';
import {JavaPotentialClassType, JavaUtil} from './JavaUtil.js';
import {MapArg, TestUtils} from '@omnigen/utils-test';
import {ANY_KIND, OmniUtil, ProxyReducerOmni2, SimplifyInheritanceModelTransformer} from '@omnigen/core';
import {describe, test, TaskContext, TestContext} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

describe('Test CompositionDependencyUtil', () => {

  const createModel = (namedTypes: OmniType[]): OmniModel => {

    // Let's create some fake endpoints, to make the types "edge" types that are used outwardly.
    const endpoints: OmniEndpoint[] = namedTypes
      ? namedTypes.map((t, idx) => {
        return {
          kind: OmniItemKind.ENDPOINT,
          name: `Endpoint${idx}`,
          transports: [{
            kind: OmniItemKind.TRANSPORT_HTTP,
            async: false,
            path: '/',
          }],
          examples: [],
          request: {
            kind: OmniItemKind.INPUT,
            type: {
              kind: OmniTypeKind.STRING,
            },
            contentType: 'application/json',
          },
          responses: [{
            kind: OmniItemKind.OUTPUT,
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
      kind: OmniItemKind.MODEL,
      name: 'Test Model for Dependency Tests',
      types: namedTypes,
      endpoints: endpoints,
      version: '1.0',
      schemaType: 'other',
      servers: [],
      schemaVersion: '1.0',
    };
  };

  test('Empty', ctx => {
    const model = createModel([]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(0);
    // ctx.expect(result.abstracts).toHaveLength(0);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('One Primitive', ctx => {
    const model = createModel([{
      kind: OmniTypeKind.NUMBER,
    }]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(0);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('One Class', ctx => {
    const model = createModel([obj('A')]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(1);
    // ctx.expect(result.abstracts).toHaveLength(0);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('Two Classes', ctx => {
    const model = createModel([obj('A'), obj('B')]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(2);
    // ctx.expect(result.abstracts).toHaveLength(0);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(0);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(0);
  });

  test('A extends B, B', ctx => {
    const b = obj('B');
    const model = createModel([obj('A', b), b]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(2);
    // ctx.expect(result.abstracts).toHaveLength(0);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(1);
  });

  test('A extends B', ctx => {

    const model = createModel([obj('A', obj('B'))]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(2);
    ctx.expect(getConcreteClasses(model)).toHaveLength(1);
    // ctx.expect(result.abstracts).toHaveLength(1);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(1);
  });

  test('A extends B, C extends D', ctx => {

    const model = createModel([
      obj('A', obj('B')),
      obj('C', obj('D')),
    ]);

    // TODO: Should we introduce interfaces since B and D have the same contract?
    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(4);
    ctx.expect(getConcreteClasses(model)).toHaveLength(2);
    // ctx.expect(result.abstracts).toHaveLength(2);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(2);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(2);
  });

  test('A extends B, C extends B', ctx => {
    const b = obj('B');
    const model = createModel([obj('C', b), obj('C', b)]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(3);
    ctx.expect(getConcreteClasses(model)).toHaveLength(2);
    // ctx.expect(result.abstracts).toHaveLength(1);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(2);
  });

  test('A extends B, C extends B, B', ctx => {
    const b = obj('B');
    const model = createModel([obj('A', b), obj('C', b), b]);

    ctx.expect(model).toBeDefined();
    ctx.expect(getInterfaces(model)).toHaveLength(0);
    ctx.expect(getClasses(model)).toHaveLength(3);
    // ctx.expect(result.abstracts).toHaveLength(0);
    ctx.expect(JavaUtil.getSuperTypeToSubTypesMap(model).size).toEqual(1);
    ctx.expect(JavaUtil.getSubTypeToSuperTypesMap(model).size).toEqual(2);
  });

  test('A extends B & C, D extends B & C, B', ctx => {
    const b = obj('B');
    const c = obj('C');
    const bc1 = and(b, c);
    const bc2 = and(b, c);
    const a = obj('A', bc1);
    const d = obj('D', bc2);

    const model = createModel([a, d, b, c]);

    assertTypes(ctx, getInterfaces(model), [c]);
    assertTypes(ctx, getClasses(model), [a, b, c, d]);
    assertTypes(ctx, getConcreteClasses(model), [a, b, c, d]);
    assertMap(ctx, JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [a, [b, c]],
      [d, [b, c]],
    ]));
  });

  test('A extends B & C, D extends C & B, B', ctx => {
    const b = obj('B');
    const c = obj('C');
    const bc = and(b, c);
    const cb = and(c, b);
    const a = obj('A', bc);
    const d = obj('D', cb);

    const model = createModel([a, d, b, c]);

    // B is found before C, because A -> B (and B used as interface for D -> C & B)
    // This would change if the search was done breadth-first vs depth-first.
    assertTypes(ctx, getInterfaces(model), [b, c]);
    assertTypes(ctx, getClasses(model), [a, b, c, d]);
    assertTypes(ctx, getConcreteClasses(model), [a, b, c, d]);
    assertMap(ctx, JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [a, [b, c]],
      [d, [c, b]],
    ]));
  });

  test('ABCDEF w/o simplification', ctx => {

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
    assertTypes(ctx, getInterfaces(model), [D, C, dInline]);
    assertTypes(ctx, getClasses(model), [A, B, C, D, E, F]);
    assertMap(ctx, JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [D, [C, dInline]],
      [E, [C, D]],
      [F, [B, D]],
    ]));
  });

  test('ABCDEF w/ simplification', ctx => {

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
    assertTypes(ctx, getInterfaces(model), [D, C, dInline]);
    assertTypes(ctx, getClasses(model), [A, B, C, D, E, F]);
    assertMap(ctx, JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [D, [C, dInline]],
      [E, [D]],
      [F, [B, D]],
    ]));
  });

  // TODO: A test case where we expect 'dInline' to not an interface, and inline it because it is single use non-edge type?

  test('Ancestry w/o simplification', ctx => {

    const A = obj('A');
    const B = obj('B', A);
    const C = obj('C', and(A, B));

    const model = createModel([A, C]);

    // Since we do not simplify the model, we will think that B needs to be an interface..
    // And A is also an interface, since if B is an interface and uses A, then A also needs to have an interface.
    assertTypes(ctx, getInterfaces(model), [B, A]);

    // And since B is never actually used other than supertype #2 for C, it will only be an interface and not a class.
    // TODO: Maybe this is wrong? B should also be available as a class? Make it an option "javaAddSuperfluousClass?"
    assertTypes(ctx, getClasses(model), [A, C]);
    assertTypes(ctx, getConcreteClasses(model), [A, C]);
    assertMap(ctx, JavaUtil.getSubTypeToSuperTypesMap(model), map([
      [C, [A, B]],
      [B, [A]],
    ]));
  });

  test('Ancestry w/ simplification', ctx => {

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

    ctx.expect(getInterfaces(model)).toEqual([]);
    ctx.expect(getClasses(model)).toEqual([A, B, C]);
    ctx.expect(getConcreteClasses(model)).toEqual([A, B, C]);
    assertMap(ctx, JavaUtil.getSubTypeToSuperTypesMap(model), map([
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

function assertTypes<T extends OmniType>(ctx: TaskContext & TestContext, actual: T[], expected: T[]) {

  const actualDescriptions = actual.map(it => OmniUtil.describe(it)).join(', ');
  const expectedDescriptions = expected.map(it => OmniUtil.describe(it)).join(', ');

  ctx.expect(actualDescriptions).toEqual(expectedDescriptions);
}

function assertMap<T extends OmniType>(ctx: TaskContext & TestContext, expected: Map<T, T[]>, actual: Map<T, T[]>) {

  for (const e of expected.entries()) {
    const actualValues = actual.get(e[0]);
    if (!actualValues) {
      throw new Error(`Expected key '${OmniUtil.describe(e[0])}' but not in given`);
    }

    const keyDescription = OmniUtil.describe(e[0]);
    const expectedDescriptions = e[1].map(it => OmniUtil.describe(it)).join(', ');
    const actualDescriptions = actualValues.map(it => OmniUtil.describe(it)).join(', ');

    ctx.expect(`${keyDescription}: ${expectedDescriptions}`).toEqual(`${keyDescription}: ${actualDescriptions}`);
  }

  for (const e of actual.entries()) {
    if (!expected.has(e[0])) {
      throw new Error(`Given unexpected '${OmniUtil.describe(e[0])}`);
    }
  }
}

const inlineClassWithProp = (name: string): OmniObjectType => {
  return {
    kind: OmniTypeKind.OBJECT,
    properties: [
      {
        kind: OmniItemKind.PROPERTY,
        name: `${name}Property`,
        type: {kind: OmniTypeKind.INTEGER},
      },
    ],
    name: `${name}Class`,
  };
};

function getAsInterface(model: OmniModel, type: OmniNode): OmniInterfaceOrObjectType | undefined {

  const unwrapped = OmniUtil.getUnwrappedType(type);
  if (unwrapped.kind === OmniTypeKind.INTERFACE) {
    return unwrapped;
  }

  if (unwrapped.kind !== OmniTypeKind.OBJECT) {
    return undefined;
  }

  // Now we need to figure out if this type is ever used as an interface in another type.

  const subTypeOfOurType = ProxyReducerOmni2.builder().reduce(model, {immutable: true}, {
    [ANY_KIND]: (n, r) => {
      if ('extendedBy' in n && n.extendedBy) {

        const flattened = OmniUtil.getFlattenedSuperTypes(n.extendedBy);
        const usedAtIndex = flattened.indexOf(unwrapped);
        if (usedAtIndex > 0) {
          return n;
        }
      }

      return r.callBase();
    },
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

  ProxyReducerOmni2.builder().reduce(model, {immutable: true}, {
    [ANY_KIND]: (n, r) => {

      const asInterface = getAsInterface(model, OmniUtil.asWriteable(n));
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

      r.callBase();
    },
  });

  return interfaces;
}

function getConcreteClasses(model: OmniModel): JavaPotentialClassType[] {

  // TODO: It should be an option or not whether concrete vs abstract classes should exist, or all just be classes.
  const edgeTypes = OmniUtil.getAllExportableTypes(model).edge;

  const concreteClasses: JavaPotentialClassType[] = [];
  for (const edgeType of edgeTypes) {
    const asClass = JavaUtil.getAsClass(model, edgeType);
    if (asClass) {
      concreteClasses.push(asClass);
    }
  }

  return concreteClasses;
}

function getClasses(model: OmniModel): JavaPotentialClassType[] {

  const checked: OmniType[] = [];
  const classes: JavaPotentialClassType[] = [];

  ProxyReducerOmni2.builder().reduce(model, {immutable: true}, {
    [ANY_KIND]: (n, r) => {

      if (!OmniUtil.isType(n)) {
        return r.callBase();
      }

      if (checked.includes(n)) {
        return;
      }
      checked.push(n);

      const asClass = JavaUtil.getAsClass(model, n);
      if (asClass && !classes.includes(asClass)) {
        classes.push(asClass);
      }

      r.callBase();
    },
  });

  return classes;
}
