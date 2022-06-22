import {
  CompositionKind,
  GenericClassType,
  GenericCompositionType,
  GenericPrimitiveKind,
  GenericType,
  GenericTypeKind
} from '@parse';
import {
  CompositionDependencyUtil,
  DEFAULT_GRAPH_OPTIONS, DependencyGraph,
  DependencyGraphOptions
} from '@parse/CompositionDependencyUtil';
import {Naming} from '../../src/parse/Naming';

describe('Test CompositionDependencyUtil', () => {

  const javaOptions: DependencyGraphOptions = {
    ...DEFAULT_GRAPH_OPTIONS,
    ...{}
  };

  function java(types: GenericType[]): DependencyGraph {
    return CompositionDependencyUtil.buildGraph(types, javaOptions);
  }

  test('Empty', async () => {
    const result = java([]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(0);
    expect(result.abstracts).toHaveLength(0);
    expect(result.usedBy.size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('One Primitive', async () => {
    const result = java([{
      name: () => 'number',
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.NUMBER,
    }]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(0);
    expect(result.abstracts).toHaveLength(0);
    expect(result.usedBy.size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('One Class', async () => {
    const result = java([obj('A')]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(1);
    expect(result.abstracts).toHaveLength(0);
    expect(result.usedBy.size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('Two Classes', async () => {
    const result = java([obj('A'), obj('B')]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(2);
    expect(result.abstracts).toHaveLength(0);
    expect(result.usedBy.size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('A extends B, B', async () => {
    const b = obj('B');
    const result = java([obj('A', b), b]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(2);
    expect(result.abstracts).toHaveLength(0);
    expect(result.usedBy.size).toEqual(1);
    expect(result.uses.size).toEqual(1);
  });

  test('A extends B', async () => {

    const result = java([obj('A', obj('B'))]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(1);
    expect(result.abstracts).toHaveLength(1);
    expect(result.usedBy.size).toEqual(1);
    expect(result.uses.size).toEqual(1);
  });

  test('A extends B, C extends D', async () => {

    const result = java([
      obj('A', obj('B')),
      obj('C', obj('D'))
    ]);

    // TODO: Should we introduce interfaces since B and D have the same contract?
    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(2);
    expect(result.abstracts).toHaveLength(2);
    expect(result.usedBy.size).toEqual(2);
    expect(result.uses.size).toEqual(2);
  });

  test('A extends B, C extends B', async () => {
    const b = obj('B');
    const result = java([obj('C', b), obj('C', b)]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(2);
    expect(result.abstracts).toHaveLength(1);
    expect(result.usedBy.size).toEqual(1);
    expect(result.uses.size).toEqual(2);
  });

  test('A extends B, C extends B, B', async () => {
    const b = obj('B');
    const result = java([obj('A', b), obj('C', b), b]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(3);
    expect(result.abstracts).toHaveLength(0);
    expect(result.usedBy.size).toEqual(1);
    expect(result.uses.size).toEqual(2);
  });

  test('A extends B & C, D extends B & C, B', async () => {
    const b = obj('B');
    const c = obj('C');
    const bc1 = and(b, c);
    const bc2 = and(b, c);
    const a = obj('A', bc1);
    const d = obj('D', bc2);

    const result = java([a, d, b]);

    expect(result).toEqual<DependencyGraph>({
      abstracts: [],
      concretes: [a, d, b],
      interfaces: [c],
      uses: map([
        [a, [b, c]],
        [d, [b, c]]
      ]),
      usedBy: map([
        [b, [a, d]],
        [c, [a, d]]
      ])
    });
  });

  test('A extends B & C, D extends C & B, B', async () => {
    const b = obj('B');
    const c = obj('C');
    const bc = and(b, c);
    const cb = and(c, b);
    const a = obj('A', bc);
    const d = obj('D', cb);

    const result = java([a, d, b]);

    expect(result).toEqual<DependencyGraph>({
      abstracts: [c],
      concretes: [a, d, b],
      interfaces: [c],
      uses: map([
        [a, [b, c]],
        [d, [c, b]]
      ]),
      usedBy: map([
        [b, [a, d]],
        [c, [a, d]]
      ])
    });
  });
});

type MapArg = Array<[GenericType, Array<GenericType>]>;

function map(arg: MapArg): Map<GenericType, GenericType[]> {
  const map = new Map<GenericType, GenericType[]>();
  for (const array of arg) {
    map.set(array[0], array[1]);
  }

  return map;
}

function obj(name: string, extendedBy?: GenericType): GenericClassType {
  return {
    name: name,
    kind: GenericTypeKind.OBJECT,
    extendedBy: extendedBy,
    additionalProperties: false,
  };
}

function and(...types: GenericType[]): GenericCompositionType {
  return {
    name: types.map(it => Naming.unwrap(it.name)).join('And'),
    kind: GenericTypeKind.COMPOSITION,
    compositionKind: CompositionKind.AND,
    types: types,
  };
}
