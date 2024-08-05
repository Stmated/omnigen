import {assertDefined, assertGenericSuperType, isDefined} from '../util';
import {OmniItemKind, OmniModel, OmniNode, OmniSuperTypeCapableType, OmniType, OmniTypeKind} from '@omnigen/core';
import {OmniUtil} from './OmniUtil.ts';
import {PROP_KEY_RECURSIVE_ORIGINAL} from './OmniReducer.ts';

export type ReturnTypeOverride = {
  [OmniTypeKind.BOOL]: OmniType | undefined,
  [OmniTypeKind.CHAR]: OmniType | undefined,
  [OmniTypeKind.DECIMAL]: OmniType | undefined,
  [OmniTypeKind.DECORATING]: OmniType | undefined,
  [OmniTypeKind.DICTIONARY]: OmniType | undefined,
  [OmniTypeKind.DOUBLE]: OmniType | undefined,
  [OmniTypeKind.ENUM]: OmniType | undefined,
  [OmniTypeKind.EXCLUSIVE_UNION]: OmniType | undefined,
  [OmniTypeKind.EXTERNAL_MODEL_REFERENCE]: OmniType | undefined,
  [OmniTypeKind.FLOAT]: OmniType | undefined,
  [OmniTypeKind.GENERIC_SOURCE]: OmniType | undefined,
  [OmniTypeKind.GENERIC_TARGET]: OmniType | undefined,
  [OmniTypeKind.HARDCODED_REFERENCE]: OmniType | undefined,
  [OmniTypeKind.INTEGER]: OmniType | undefined,
  [OmniTypeKind.INTEGER_SMALL]: OmniType | undefined,
  [OmniTypeKind.INTERFACE]: OmniType | undefined,
  [OmniTypeKind.INTERSECTION]: OmniType | undefined,
  [OmniTypeKind.LONG]: OmniType | undefined,
  [OmniTypeKind.NEGATION]: OmniType | undefined,
  [OmniTypeKind.NULL]: OmniType | undefined,
  [OmniTypeKind.NUMBER]: OmniType | undefined,
  [OmniTypeKind.OBJECT]: OmniType | undefined,
  [OmniTypeKind.STRING]: OmniType | undefined,
  [OmniTypeKind.TUPLE]: OmniType | undefined,
  [OmniTypeKind.UNDEFINED]: OmniType | undefined,
  [OmniTypeKind.UNION]: OmniType | undefined,
  [OmniTypeKind.UNKNOWN]: OmniType | undefined,
  [OmniTypeKind.VOID]: OmniType | undefined,

  [OmniItemKind.MODEL]: OmniModel,
};

/**
 * Translates incoming `FN` into an alternative Return type.
 */
export type Ret<FN extends object, D extends keyof FN, O>
  = FN[D] extends keyof O
  ? O[FN[D]]
  : (FN | undefined)
  ;

export interface ReducerArgs<N extends object, D extends keyof N, O> {
  dispatcher: Reducer<N, D, O>,
  base: ReducerSpec<N, D, O>,
}

export const ANY = Symbol('Receiver of all');

export type OmniReducerFn<N extends object, FN extends N, D extends keyof N, O> = (node: FN, args: ReducerArgs<N, D, O>) => Ret<FN, D, O>;
export type OmniPropReducerFn<N extends object, V, D extends keyof N, O> = (v: V, args: ReducerArgs<N, D, O>) => V;

export type ReducerSpecObject<N extends object, FN extends N, D extends keyof N, O> = OmniReducerFn<N, FN, D, O>;
export type ReducerSpecObjects<N extends object, D extends keyof N, O> = { [K in N[D] & string]: ReducerSpecObject<N, Extract<N, Record<D, K>>, D, O> };
export type ReducerSpecAny<N extends object, D extends keyof N, O> = { [ANY]?: OmniReducerFn<N, N, D, O> };
export type ReducerSpec<N extends object, D extends keyof N, O> = ReducerSpecObjects<N, D, O> & ReducerSpecAny<N, D, O> & ReducerSpecProps<N, D, O>;

export interface Reducer<N extends object, D extends keyof N, O> {
  reduce<FN extends N>(node: FN): Ret<FN, D, O>;
}

type Join<K, P> = K extends string | number ? `${K}.${P & string}` : never;

// To distribute over the union and construct the required key-value pairs
type DistributeKeys<T extends object, D extends keyof T, O> =
  T extends unknown
    ? { [K in Exclude<keyof T, D> as Join<T[D], K>]?: OmniPropReducerFn<T, T[K], D, O>; }
    : never;

// Helper type to convert union to intersection
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type ReducerSpecProps<T extends object, D extends keyof T, O> = UnionToIntersection<DistributeKeys<T, D, O>>;

export function assertSuperType(type: undefined): undefined;
export function assertSuperType(type: OmniType): OmniSuperTypeCapableType;
export function assertSuperType(type: OmniType | undefined): OmniSuperTypeCapableType | undefined;
export function assertSuperType(type: OmniType | undefined): OmniSuperTypeCapableType | undefined {

  if (!type) {
    return undefined;
  }

  // NOTE: The special case could be a lie, but should hopefully be true.
  //        The real solution is to have stricter generics and resolving the type everywhere.
  if (OmniUtil.asSuperType(type, true, t => PROP_KEY_RECURSIVE_ORIGINAL in t ? true : undefined)) {
    return type;
  } else {
    throw new Error(`${OmniUtil.describe(type)} should have been supertype compatible`);
  }
}

export const DEFAULT_OMNI_REDUCER: ReducerSpec<OmniNode, 'kind', ReturnTypeOverride> = {

  MODEL: (n, a) => ({
    ...n,
    endpoints: n.endpoints.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.contact) && {contact: a.dispatcher.reduce(n.contact)},
    ...(n.license) && {license: a.dispatcher.reduce(n.license)},
    ...(n.continuations) && {continuations: n.continuations?.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
    ...(n.externalDocumentations) && {externalDocumentations: n.externalDocumentations.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
    ...(n.servers) && {servers: n.servers.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
    types: n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined),
  }),

  BOOL: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  CHAR: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  DECIMAL: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  INTEGER: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  INTEGER_SMALL: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  LONG: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  NUMBER: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  DOUBLE: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  FLOAT: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  STRING: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  VOID: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  UNDEFINED: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  NULL: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),
  UNKNOWN: (n, a) => ({...n, ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)}}),

  DECORATING: (n, a) => ({
    ...n,
    of: assertDefined(a.dispatcher.reduce(n.of)),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),

  ARRAY: (n, a) => ({
    ...n,
    of: assertDefined(a.dispatcher.reduce(n.of)),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  ARRAY_PROPERTIES_BY_POSITION: (n, a) => ({
    ...n,
    properties: n.properties.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.commonDenominator) && {commonDenominator: a.dispatcher.reduce(n?.commonDenominator)},
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  DICTIONARY: (n, a) => ({
    ...n,
    valueType: assertDefined(a.dispatcher.reduce(n.valueType)),
    keyType: assertDefined(a.dispatcher.reduce(n.keyType)),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),

  ENUM: (n, a) => ({
    ...n,
    members: n.members?.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  ENUM_MEMBER: n => n,

  UNION: (n, a) => ({
    ...n,
    types: n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  EXCLUSIVE_UNION: (n, a) => ({
    ...n,
    types: n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  INTERSECTION: (n, a) => ({
    ...n,
    types: n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  NEGATION: (n, a) => ({
    ...n,
    types: n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),

  EXTERNAL_MODEL_REFERENCE: (n, a) => ({
    ...n,
    of: assertDefined(a.dispatcher.reduce(n.of)),
    model: assertDefined(a.dispatcher.reduce(n.model)),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  GENERIC_SOURCE: (n, a) => ({
    ...n,
    of: assertGenericSuperType(a.dispatcher.reduce(n.of)),
    sourceIdentifiers: n.sourceIdentifiers.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  GENERIC_SOURCE_IDENTIFIER: (n, a) => ({
    ...n,
    ...(n.upperBound) && {upperBound: a.dispatcher.reduce(n.upperBound)},
    ...(n.lowerBound) && {lowerBound: a.dispatcher.reduce(n.lowerBound)},
    ...(n.knownEdgeTypes) && {knownEdgeTypes: n.knownEdgeTypes?.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  GENERIC_TARGET: (n, a) => {
    const source = assertDefined(a.dispatcher.reduce(n.source));
    if (source.kind !== OmniTypeKind.GENERIC_SOURCE) {
      throw new Error(`Reduced GenericSource must still be a GenericSource when given to a GenericTarget`);
    }
    return ({
      ...n,
      source: source,
      targetIdentifiers: n.targetIdentifiers.map(it => a.dispatcher.reduce(it)).filter(isDefined),
      ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
    });
  },
  GENERIC_TARGET_IDENTIFIER: (n, a) => ({
    ...n,
    type: assertDefined(a.dispatcher.reduce(n.type)),
    sourceIdentifier: assertDefined(a.dispatcher.reduce(n.sourceIdentifier)),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  HARDCODED_REFERENCE: (n, a) => ({
    ...n,
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  INTERFACE: (n, a) => ({
    ...n,
    of: assertSuperType(assertDefined(a.dispatcher.reduce(n.of))),
    ...(n.extendedBy) && {extendedBy: assertSuperType(a.dispatcher.reduce(n.extendedBy))},
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),

  OBJECT: (n, a) => ({
    ...n,
    properties: n.properties.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.extendedBy) && {extendedBy: assertSuperType(a.dispatcher.reduce(n.extendedBy))},
    ...(n.subTypeHints) && {subTypeHints: n.subTypeHints?.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  SUBTYPE_HINT: (n, a) => ({
    ...n,
    type: assertDefined(a.dispatcher.reduce(n.type)),
    qualifiers: n.qualifiers.map(it => a.dispatcher.reduce(it)).filter(isDefined),
  }),
  TUPLE: (n, a) => ({
    ...n,
    types: n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.commonDenominator) && {commonDenominator: a.dispatcher.reduce(n.commonDenominator)},
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),

  PROPERTY: (n, a) => ({
    ...n,
    type: assertDefined(a.dispatcher.reduce(n.type)),
    owner: assertDefined(a.dispatcher.reduce(n.owner)),
  }),

  EXAMPLE: n => n,
  EXAMPLE_PAIRING: (n, a) => ({
    ...n,
    params: n.params?.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.result) && {result: assertDefined(a.dispatcher.reduce(n.result))},
  }),
  EXAMPLE_PARAM: (n, a) => ({
    ...n,
    property: assertDefined(a.dispatcher.reduce(n.property)),
    type: assertDefined(a.dispatcher.reduce(n.type)),
  }),
  EXAMPLE_RESULT: (n, a) => ({
    ...n,
    type: assertDefined(a.dispatcher.reduce(n.type)),
  }),

  LICENSE: n => n,
  CONTACT: n => n,
  EXTERNAL_DOCUMENTATION: n => n,
  SERVER: n => n,
  ENDPOINT: (n, a) => ({
    ...n,
    callbacks: n.callbacks?.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    externalDocumentations: n.externalDocumentations?.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    request: assertDefined(a.dispatcher.reduce(n.request)),
    responses: n.responses.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    requestQualifiers: n.requestQualifiers?.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    transports: n.transports.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  LINK_SOURCE_PARAMETER: (n, a) => ({
    ...n,
    propertyPath: n.propertyPath?.map(it => a.dispatcher.reduce(it)).filter(isDefined),
  }),
  LINK_TARGET_PARAMETER: (n, a) => ({
    ...n,
    propertyPath: n.propertyPath.map(it => a.dispatcher.reduce(it)).filter(isDefined),
  }),
  LINK_MAPPING: (n, a) => ({
    ...n,
    source: assertDefined(a.dispatcher.reduce(n.source)),
    target: assertDefined(a.dispatcher.reduce(n.target)),
  }),
  LINK: (n, a) => ({
    ...n,
    mappings: n.mappings.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    ...(n.server) && {server: a.dispatcher.reduce(n.server)},
    ...(n.sourceModel) && {sourceModel: a.dispatcher.reduce(n.sourceModel)},
    ...(n.targetModel) && {targetModel: a.dispatcher.reduce(n.targetModel)},
  }),
  INPUT: (n, a) => ({
    ...n,
    type: assertDefined(a.dispatcher.reduce(n.type)),
  }),
  OUTPUT: (n, a) => ({
    ...n,
    qualifiers: n.qualifiers.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    type: assertDefined(a.dispatcher.reduce(n.type)),
  }),
  CALLBACK: (n, a) => ({
    ...n,
    request: assertDefined(a.dispatcher.reduce(n.request)),
    responses: n.responses.map(it => a.dispatcher.reduce(it)).filter(isDefined),
    transport: assertDefined(a.dispatcher.reduce(n.transport)),
    ...(n.examples) && {examples: n.examples.map(it => a.dispatcher.reduce(it)).filter(isDefined)},
  }),
  TRANSPORT_HTTP: n => n,
  TRANSPORT_MQ: n => n,
  PAYLOAD_PATH_QUALIFIER: n => n,
};
