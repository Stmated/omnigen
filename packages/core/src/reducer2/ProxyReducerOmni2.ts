import {OmniItemKind, OmniModel, OmniNode, OmniSuperTypeCapableType, OmniType, OmniTypeKind} from '@omnigen/api';
import {ProxyReducer2} from './ProxyReducer2';
import {assertDefined, assertGenericSuperType, isDefined} from '../util';
import {Spec2} from './types';
import {ReducerOpt2} from './ReducerOpt2';
import {OmniTypeUtil} from '../parse/OmniTypeUtil.ts';
import {OmniDescribeUtils} from '../parse/OmniDescribeUtils.ts';

interface ProxyReducerOmniNodeOverrides2 {
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
}

export function assertProxySuperType2(type: undefined): undefined;
export function assertProxySuperType2(type: OmniType): OmniSuperTypeCapableType;
export function assertProxySuperType2(type: OmniType | undefined): OmniSuperTypeCapableType | undefined;
export function assertProxySuperType2(type: OmniType | undefined): OmniSuperTypeCapableType | undefined {

  if (!type) {
    return undefined;
  }

  if (OmniTypeUtil.asSuperType(type, true)) {
    return type;
  } else {
    throw new Error(`${OmniDescribeUtils.describe(type)} should have been supertype compatible`);
  }
}

const DEFAULT_PROXY_REDUCER_OMNI_SPEC2: Spec2<OmniNode, 'kind', ProxyReducerOmniNodeOverrides2, ReducerOpt2> = {

  MODEL: (n, r) => {
    r.put('endpoints', n.endpoints.map(it => r.reduce(it)).filter(isDefined));

    if (n.contact) r.put('contact', r.reduce(n.contact));
    if (n.license) r.put('license', r.reduce(n.license));
    if (n.continuations) r.put('continuations', n.continuations?.map(it => r.reduce(it)).filter(isDefined));
    if (n.externalDocumentations) r.put('externalDocumentations', n.externalDocumentations.map(it => r.reduce(it)).filter(isDefined));
    if (n.servers) r.put('servers', n.servers.map(it => r.reduce(it)).filter(isDefined));
    if (n.types) r.put('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },

  BOOL: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  CHAR: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  DECIMAL: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  INTEGER: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  INTEGER_SMALL: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  LONG: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  NUMBER: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  DOUBLE: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  FLOAT: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  STRING: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  VOID: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  UNDEFINED: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  NULL: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  UNKNOWN: (n, r) => {
    if (n.upperBound) r.put('upperBound', r.reduce(n.upperBound));
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    r.yieldBase();
  },

  DECORATING: (n, r) => {
    r.put('of', assertDefined(r.reduce(n.of)));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },

  ARRAY: (n, r) => {
    r.put('of', assertDefined(r.reduce(n.of)));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  ARRAY_PROPERTIES_BY_POSITION: (n, r) => {
    r.put('properties', n.properties.map(it => r.reduce(it)).filter(isDefined));
    if (n.commonDenominator) r.put('commonDenominator', r.reduce(n?.commonDenominator));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  DICTIONARY: (n, r) => {
    r.put('valueType', assertDefined(r.reduce(n.valueType)));
    r.put('keyType', assertDefined(r.reduce(n.keyType)));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },

  ENUM: (n, r) => {
    r.put('members', n.members?.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },

  UNION: (n, r) => {
    r.put('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist();
  },
  EXCLUSIVE_UNION: (n, r) => {
    r.put('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist();
  },
  INTERSECTION: (n, r) => {
    r.put('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist();
  },
  NEGATION: (n, r) => {
    r.put('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist();
  },

  EXTERNAL_MODEL_REFERENCE: (n, r) => {
    r.put('of', assertDefined(r.reduce(n.of)));
    r.put('model', assertDefined(r.reduce(n.model)));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  GENERIC_SOURCE: (n, r) => {
    r.put('of', assertGenericSuperType(r.reduce(n.of)));
    r.put('sourceIdentifiers', n.sourceIdentifiers.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist().yieldBase();
  },
  GENERIC_SOURCE_IDENTIFIER: (n, r) => {
    if (n.upperBound) r.put('upperBound', r.reduce(n.upperBound));
    if (n.lowerBound) r.put('lowerBound', r.reduce(n.lowerBound));
    if (n.knownEdgeTypes) r.put('knownEdgeTypes', n.knownEdgeTypes.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist().yieldBase();
  },
  GENERIC_TARGET: (n, r) => {
    const source = assertDefined(r.reduce(n.source));
    if (source.kind !== OmniTypeKind.GENERIC_SOURCE) {
      throw new Error(`Reduced GenericSource must still be a GenericSource when given to a GenericTarget`);
    }

    r.put('source', source);
    r.put('targetIdentifiers', n.targetIdentifiers.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist().yieldBase();
  },
  GENERIC_TARGET_IDENTIFIER: (n, r) => {

    r.put('type', assertDefined(r.reduce(n.type)));
    r.put('sourceIdentifier', assertDefined(r.reduce(n.sourceIdentifier)));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  HARDCODED_REFERENCE: (n, r) => {
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  INTERFACE: (n, r) => {
    r.put('of', assertProxySuperType2(assertDefined(r.reduce(n.of))));
    if (n.extendedBy) r.put('extendedBy', assertProxySuperType2(r.reduce(n.extendedBy)));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist().yieldBase();
  },
  OBJECT: (n, r) => {
    r.put('properties', n.properties.map(it => r.reduce(it)).filter(isDefined));
    if (n.extendedBy) r.put('extendedBy', assertProxySuperType2(r.reduce(n.extendedBy)));
    if (n.subTypeHints) r.put('subTypeHints', n.subTypeHints?.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.persist().yieldBase();
  },
  SUBTYPE_HINT: (n, r) => {
    r.put('type', assertDefined(r.reduce(n.type)));
    r.put('qualifiers', n.qualifiers.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  TUPLE: (n, r) => {
    r.put('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.commonDenominator) r.put('commonDenominator', r.reduce(n.commonDenominator));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },

  PROPERTY: (n, r) => r.put('type', assertDefined(r.reduce(n.type))).callBase(),

  EXAMPLE_PAIRING: (n, r) => {
    if (n.params) r.put('params', n.params?.map(it => r.reduce(it)).filter(isDefined));
    if (n.result) r.put('result', assertDefined(r.reduce(n.result)));
    r.yieldBase();
  },
  EXAMPLE_PARAM: (n, r) => {
    r.put('property', assertDefined(r.reduce(n.property)));
    r.put('type', assertDefined(r.reduce(n.type)));
    r.yieldBase();
  },
  EXAMPLE_RESULT: (n, r) => {
    r.put('type', assertDefined(r.reduce(n.type)));
    r.yieldBase();
  },

  ENDPOINT: (n, r) => {
    r.put('callbacks', n.callbacks?.map(it => r.reduce(it)).filter(isDefined));
    r.put('externalDocumentations', n.externalDocumentations?.map(it => r.reduce(it)).filter(isDefined));
    r.put('request', assertDefined(r.reduce(n.request)));
    r.put('responses', n.responses.map(it => r.reduce(it)).filter(isDefined));
    r.put('requestQualifiers', n.requestQualifiers?.map(it => r.reduce(it)).filter(isDefined));
    r.put('transports', n.transports.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  LINK_SOURCE_PARAMETER: (n, r) => {
    if (n.propertyPath) r.put('propertyPath', n.propertyPath?.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  LINK_TARGET_PARAMETER: (n, r) => {
    r.put('propertyPath', n.propertyPath.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
  LINK_MAPPING: (n, r) => {
    r.put('source', assertDefined(r.reduce(n.source)));
    r.put('target', assertDefined(r.reduce(n.target)));
    r.yieldBase();
  },
  LINK: (n, r) => {
    r.put('mappings', n.mappings.map(it => r.reduce(it)).filter(isDefined));
    if (n.server) r.put('server', r.reduce(n.server));
    if (n.sourceModel) r.put('sourceModel', r.reduce(n.sourceModel));
    if (n.targetModel) r.put('targetModel', r.reduce(n.targetModel));
    r.yieldBase();
  },
  INPUT: (n, r) => {
    r.put('type', assertDefined(r.reduce(n.type)));
    r.yieldBase();
  },
  OUTPUT: (n, r) => {
    r.put('qualifiers', n.qualifiers.map(it => r.reduce(it)).filter(isDefined));
    r.put('type', assertDefined(r.reduce(n.type)));
    r.yieldBase();
  },
  CALLBACK: (n, r) => {
    r.put('request', assertDefined(r.reduce(n.request)));
    r.put('responses', n.responses.map(it => r.reduce(it)).filter(isDefined));
    r.put('transport', assertDefined(r.reduce(n.transport)));
    if (n.examples) r.put('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    r.yieldBase();
  },
};

export class ProxyReducerOmni2 {

  private static _builder = ProxyReducer2.builder<OmniNode, ProxyReducerOmniNodeOverrides2>()
    .discriminator('kind')
    .spec(DEFAULT_PROXY_REDUCER_OMNI_SPEC2);

  public static builder() {
    return this._builder;
  }
}
