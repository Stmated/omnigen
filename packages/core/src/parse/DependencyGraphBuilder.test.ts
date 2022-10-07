import {
  OmniCompositionType,
  OmniInheritableType,
  OmniObjectType,
  OmniPrimitiveKind,
  OmniType,
  OmniTypeKind,
  DEFAULT_GRAPH_OPTIONS,
  DependencyGraph,
  DependencyGraphBuilder,
  DependencyGraphOptions
} from '../parse';
import {TestUtils} from '@omnigen/utils-test';

describe('Test CompositionDependencyUtil', () => {

  const javaOptions: DependencyGraphOptions = {
    ...DEFAULT_GRAPH_OPTIONS,
    ...{}
  };

  function java(namedTypes: OmniType[]): DependencyGraph {
    return DependencyGraphBuilder.build(namedTypes, javaOptions);
  }

  test('Empty', async () => {
    const result = java([]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(0);
    // expect(result.abstracts).toHaveLength(0);
    expect(getUsedBy(result.uses).size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('One Primitive', async () => {
    const result = java([{
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.NUMBER,
    }]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(0);
    // expect(result.abstracts).toHaveLength(0);
    expect(getUsedBy(result.uses).size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('One Class', async () => {
    const result = java([obj('A')]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(1);
    // expect(result.abstracts).toHaveLength(0);
    expect(getUsedBy(result.uses).size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('Two Classes', async () => {
    const result = java([obj('A'), obj('B')]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(2);
    // expect(result.abstracts).toHaveLength(0);
    expect(getUsedBy(result.uses).size).toEqual(0);
    expect(result.uses.size).toEqual(0);
  });

  test('A extends B, B', async () => {
    const b = obj('B');
    const result = java([obj('A', b), b]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(2);
    // expect(result.abstracts).toHaveLength(0);
    expect(getUsedBy(result.uses).size).toEqual(1);
    expect(result.uses.size).toEqual(1);
  });

  test('A extends B', async () => {

    const result = java([obj('A', obj('B'))]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(1);
    // expect(result.abstracts).toHaveLength(1);
    expect(getUsedBy(result.uses).size).toEqual(1);
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
    // expect(result.abstracts).toHaveLength(2);
    expect(getUsedBy(result.uses).size).toEqual(2);
    expect(result.uses.size).toEqual(2);
  });

  test('A extends B, C extends B', async () => {
    const b = obj('B');
    const result = java([obj('C', b), obj('C', b)]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(2);
    // expect(result.abstracts).toHaveLength(1);
    expect(getUsedBy(result.uses).size).toEqual(1);
    expect(result.uses.size).toEqual(2);
  });

  test('A extends B, C extends B, B', async () => {
    const b = obj('B');
    const result = java([obj('A', b), obj('C', b), b]);

    expect(result).toBeDefined();
    expect(result.interfaces).toHaveLength(0);
    expect(result.concretes).toHaveLength(3);
    // expect(result.abstracts).toHaveLength(0);
    expect(getUsedBy(result.uses).size).toEqual(1);
    expect(result.uses.size).toEqual(2);
  });

  test('A extends B & C, D extends B & C, B', async () => {
    const b = obj('B');
    const c = obj('C');
    const bc1 = and(b, c);
    const bc2 = and(b, c);
    const a = obj('A', bc1);
    const d = obj('D', bc2);

    const result = java([a, d, b, c]);

    expect(result).toEqual<DependencyGraph>({
      // abstracts: [],
      concretes: [a, d, b, c],
      interfaces: [c],
      uses: map([
        [a, [b, c]],
        [d, [b, c]]
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

    const result = java([a, d, b, c]);

    expect(result).toEqual<DependencyGraph>({
      // abstracts: [c],
      concretes: [a, d, b, c],
      interfaces: [c, b],
      uses: map([
        [a, [b, c]],
        [d, [c, b]]
      ])
    });
  });

  test('ABCDEF', async () => {

    const inline = inlineClassWithProp('DInline');

    const A = obj('A');
    const B = obj('B');
    const C = obj('C');
    const cAndInline = and(C, inline)
    const D = obj('D', cAndInline);
    const E = obj('E', and(C, D));
    const F = obj('F', and(B, D));

    const result = java([A, B, C, D, E, F]);

    // We will get the composition type in "uses" here, since the model is not simplified.
    // In a simplified model here, "inline" would be merged into D, and D only extend C.
    expect(result).toEqual<DependencyGraph>({
      // abstracts: [],
      concretes: [A, B, C, D, E, F],
      interfaces: [D],
      uses: map([
        [D, [C, inline]],
        [E, [D]],
        [F, [B, D]]
      ])
    });
  });

  test('Ancestry simplification', async () => {

    const A = obj('A');
    const B = obj('B', A);
    const C = obj('C', and(A, B));

    const result = java([A, B, C]);

    expect(result).toEqual<DependencyGraph>({
      // abstracts: [],
      concretes: [A, B, C],
      interfaces: [],
      uses: map([
        [C, [B]],
        [B, [A]],
      ])
    });
  });
});

type MapArg = Array<[OmniType, Array<OmniType>]>;

function getUsedBy(original: Map<OmniType, OmniType[]>): Map<OmniType, OmniType[]> {
  const map = new Map<OmniType, OmniType[]>();
  for (const e of original.entries()) {
    for (const key of e[1]) {
      map.set(key, (map.get(key) || []).concat(e[0]));
    }
  }

  return map;
}

function map(arg: MapArg): Map<OmniType, OmniType[]> {
  const map = new Map<OmniType, OmniType[]>();
  for (const array of arg) {
    map.set(array[0], array[1]);
  }

  return map;
}

function obj(name: string, extendedBy?: OmniInheritableType): OmniObjectType {
  return TestUtils.obj(name, extendedBy);
}

function and(...types: OmniType[]): OmniCompositionType {
  return TestUtils.and(...types);
}

function inlineClassWithProp(name: string,) {
  const inline: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    properties: [],
    name: `${name}Class`,
  };
  inline.properties = [
    {
      name: `${name}Property`,
      owner: inline,
      type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER}
    }
  ];
  return inline;
}
