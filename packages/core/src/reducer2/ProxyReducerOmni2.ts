import {OmniItemKind, OmniModel, OmniNode, OmniSuperTypeCapableType, OmniType, OmniTypeKind} from '@omnigen/api';
import {ProxyReducer2} from './ProxyReducer2.ts';
import {assertDefined, assertGenericSuperType, isDefined} from '../util';
import {ProxyReducerBuilder2} from './ProxyReducerBuilder2.ts';

import {Spec2} from './types.ts';
import {ReducerOpt2} from './ReducerOpt2.ts';
import {OmniUtil} from '../parse';

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

  // NOTE: The special case could be a lie, but should hopefully be true.
  //        The real solution is to have stricter generics and resolving the type everywhere.
  if (OmniUtil.asSuperType(type, true, t => ProxyReducer2.isProxy(t) ? true : undefined)) {
    return type;
  } else {
    throw new Error(`${OmniUtil.describe(type)} should have been supertype compatible`);
  }
}


const DEFAULT_PROXY_REDUCER_OMNI_SPEC2: Spec2<OmniNode, 'kind', ProxyReducerOmniNodeOverrides2, ReducerOpt2> = {

  MODEL: (n, r) => {
    n = r.set('endpoints', n.endpoints.map(it => r.reduce(it)).filter(isDefined));

    if (n.contact) n = r.set('contact', r.reduce(n.contact));
    if (n.license) n = r.set('license', r.reduce(n.license));
    if (n.continuations) n = r.set('continuations', n.continuations?.map(it => r.reduce(it)).filter(isDefined));
    if (n.externalDocumentations) n = r.set('externalDocumentations', n.externalDocumentations.map(it => r.reduce(it)).filter(isDefined));
    if (n.servers) n = r.set('servers', n.servers.map(it => r.reduce(it)).filter(isDefined));
    if (n.types) n = r.set('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },

  BOOL: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  CHAR: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  DECIMAL: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  INTEGER: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  INTEGER_SMALL: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  LONG: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  NUMBER: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  DOUBLE: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  FLOAT: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  STRING: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  VOID: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  UNDEFINED: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  NULL: (n, r) => {
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },
  UNKNOWN: (n, r) => {
    if (n.upperBound) r.set('upperBound', r.reduce(n.upperBound));
    if (n.examples) n.examples.map(it => r.reduce(it)).filter(isDefined);
    return r.next();
  },

  DECORATING: (n, r) => {
    n = r.set('of', assertDefined(r.reduce(n.of)));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },

  ARRAY: (n, r) => {
    n = r.set('of', assertDefined(r.reduce(n.of)));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  ARRAY_PROPERTIES_BY_POSITION: (n, r) => {
    n = r.set('properties', n.properties.map(it => r.reduce(it)).filter(isDefined));
    if (n.commonDenominator) n = r.set('commonDenominator', r.reduce(n?.commonDenominator));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  DICTIONARY: (n, r) => {
    n = r.set('valueType', assertDefined(r.reduce(n.valueType)));
    n = r.set('keyType', assertDefined(r.reduce(n.keyType)));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },

  ENUM: (n, r) => {
    n = r.set('members', n.members?.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },

  UNION: (n, r) => {
    n = r.set('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().commit();
  },
  EXCLUSIVE_UNION: (n, r) => {
    n = r.set('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().commit();
  },
  INTERSECTION: (n, r) => {
    n = r.set('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().commit();
  },
  NEGATION: (n, r) => {
    n = r.set('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().commit();
  },

  EXTERNAL_MODEL_REFERENCE: (n, r) => {
    n = r.set('of', assertDefined(r.reduce(n.of)));
    n = r.set('model', assertDefined(r.reduce(n.model)));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  GENERIC_SOURCE: (n, r) => {
    n = r.set('of', assertGenericSuperType(r.reduce(n.of)));
    n = r.set('sourceIdentifiers', n.sourceIdentifiers.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().next();
  },
  GENERIC_SOURCE_IDENTIFIER: (n, r) => {
    if (n.upperBound) n = r.set('upperBound', r.reduce(n.upperBound));
    if (n.lowerBound) n = r.set('lowerBound', r.reduce(n.lowerBound));
    if (n.knownEdgeTypes) n = r.set('knownEdgeTypes', n.knownEdgeTypes.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().next();
  },
  GENERIC_TARGET: (n, r) => {
    const source = assertDefined(r.reduce(n.source));
    if (source.kind !== OmniTypeKind.GENERIC_SOURCE) {
      throw new Error(`Reduced GenericSource must still be a GenericSource when given to a GenericTarget`);
    }

    n = r.set('source', source);
    n = r.set('targetIdentifiers', n.targetIdentifiers.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().next();
  },
  GENERIC_TARGET_IDENTIFIER: (n, r) => {

    n = r.set('type', assertDefined(r.reduce(n.type)));
    n = r.set('sourceIdentifier', assertDefined(r.reduce(n.sourceIdentifier)));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  HARDCODED_REFERENCE: (n, r) => {
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  INTERFACE: (n, r) => {
    n = r.set('of', assertProxySuperType2(assertDefined(r.reduce(n.of))));
    if (n.extendedBy) n = r.set('extendedBy', assertProxySuperType2(r.reduce(n.extendedBy)));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().next();
  },

  OBJECT: (n, r) => {
    n = r.set('properties', n.properties.map(it => r.reduce(it)).filter(isDefined));
    if (n.extendedBy) n = r.set('extendedBy', assertProxySuperType2(r.reduce(n.extendedBy)));
    if (n.subTypeHints) n = r.set('subTypeHints', n.subTypeHints?.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.persist().next();
  },
  SUBTYPE_HINT: (n, r) => {
    n = r.set('type', assertDefined(r.reduce(n.type)));
    n = r.set('qualifiers', n.qualifiers.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  TUPLE: (n, r) => {
    n = r.set('types', n.types.map(it => r.reduce(it)).filter(isDefined));
    if (n.commonDenominator) n = r.set('commonDenominator', r.reduce(n.commonDenominator));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },

  PROPERTY: (n, r) => {
    r.set('type', assertDefined(r.reduce(n.type)));
    return r.next();
  },

  EXAMPLE_PAIRING: (n, r) => {
    if (n.params) n = r.set('params', n.params?.map(it => r.reduce(it)).filter(isDefined));
    if (n.result) n = r.set('result', assertDefined(r.reduce(n.result)));
    return r.next();
  },
  EXAMPLE_PARAM: (n, r) => {
    n = r.set('property', assertDefined(r.reduce(n.property)));
    n = r.set('type', assertDefined(r.reduce(n.type)));
    return r.next();
  },
  EXAMPLE_RESULT: (n, r) => {
    n = r.set('type', assertDefined(r.reduce(n.type)));
    return r.next();
  },

  ENDPOINT: (n, r) => {
    n = r.set('callbacks', n.callbacks?.map(it => r.reduce(it)).filter(isDefined));
    n = r.set('externalDocumentations', n.externalDocumentations?.map(it => r.reduce(it)).filter(isDefined));
    n = r.set('request', assertDefined(r.reduce(n.request)));
    n = r.set('responses', n.responses.map(it => r.reduce(it)).filter(isDefined));
    n = r.set('requestQualifiers', n.requestQualifiers?.map(it => r.reduce(it)).filter(isDefined));
    n = r.set('transports', n.transports.map(it => r.reduce(it)).filter(isDefined));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  LINK_SOURCE_PARAMETER: (n, r) => {
    if (n.propertyPath) n = r.set('propertyPath', n.propertyPath?.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  LINK_TARGET_PARAMETER: (n, r) => {
    n = r.set('propertyPath', n.propertyPath.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
  LINK_MAPPING: (n, r) => {
    n = r.set('source', assertDefined(r.reduce(n.source)));
    n = r.set('target', assertDefined(r.reduce(n.target)));
    return r.next();
  },
  LINK: (n, r) => {
    n = r.set('mappings', n.mappings.map(it => r.reduce(it)).filter(isDefined));
    if (n.server) n = r.set('server', r.reduce(n.server));
    if (n.sourceModel) n = r.set('sourceModel', r.reduce(n.sourceModel));
    if (n.targetModel) n = r.set('targetModel', r.reduce(n.targetModel));
    return r.next();
  },
  INPUT: (n, r) => {
    n = r.set('type', assertDefined(r.reduce(n.type)));
    return r.next();
  },
  OUTPUT: (n, r) => {
    n = r.set('qualifiers', n.qualifiers.map(it => r.reduce(it)).filter(isDefined));
    n = r.set('type', assertDefined(r.reduce(n.type)));
    return r.next();
  },
  CALLBACK: (n, r) => {
    n = r.set('request', assertDefined(r.reduce(n.request)));
    n = r.set('responses', n.responses.map(it => r.reduce(it)).filter(isDefined));
    n = r.set('transport', assertDefined(r.reduce(n.transport)));
    if (n.examples) n = r.set('examples', n.examples.map(it => r.reduce(it)).filter(isDefined));
    return r.next();
  },
};

export class ProxyReducerOmni2 {

  private static _builder?: ProxyReducerBuilder2<OmniNode, 'kind', ProxyReducerOmniNodeOverrides2, {}>;

  public static builder() {

    if (!this._builder) {
      this._builder = ProxyReducer2.builder<OmniNode, ProxyReducerOmniNodeOverrides2>()
        .discriminator('kind')
        .spec(DEFAULT_PROXY_REDUCER_OMNI_SPEC2);
    }

    return this._builder;
  }
}
