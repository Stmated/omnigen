import {OmniItemKind, OmniModel, OmniNode, OmniSuperTypeCapableType, OmniType, OmniTypeKind} from '@omnigen/api';
import {ProxyReducer} from './ProxyReducer';
import {assertDefined, assertGenericSuperType, isDefined} from '../util';
import {ProxyReducerBuilder} from './ProxyReducerBuilder';

import {Spec} from './types';
import {ReducerOpt} from './ReducerOpt';
import {OmniUtil} from '../parse';

interface ProxyReducerOmniNodeOverrides {
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

export function assertProxySuperType(type: undefined): undefined;
export function assertProxySuperType(type: OmniType): OmniSuperTypeCapableType;
export function assertProxySuperType(type: OmniType | undefined): OmniSuperTypeCapableType | undefined;
export function assertProxySuperType(type: OmniType | undefined): OmniSuperTypeCapableType | undefined {

  if (!type) {
    return undefined;
  }

  // NOTE: The special case could be a lie, but should hopefully be true.
  //        The real solution is to have stricter generics and resolving the type everywhere.
  if (OmniUtil.asSuperType(type, true, t => ProxyReducer.isProxy(t) ? true : undefined)) {
    return type;
  } else {
    throw new Error(`${OmniUtil.describe(type)} should have been supertype compatible`);
  }
}


const DEFAULT_PROXY_REDUCER_OMNI_SPEC: Spec<OmniNode, 'kind', ProxyReducerOmniNodeOverrides, ReducerOpt> = {

  MODEL: (n, r) => {
    n.endpoints = n.endpoints.map(it => r.next(it)).filter(isDefined);
    if (n.contact) n.contact = r.next(n.contact);
    if (n.license) n.license = r.next(n.license);
    if (n.continuations) n.continuations = n.continuations?.map(it => r.next(it)).filter(isDefined);
    if (n.externalDocumentations) n.externalDocumentations = n.externalDocumentations.map(it => r.next(it)).filter(isDefined);
    if (n.servers) n.servers = n.servers.map(it => r.next(it)).filter(isDefined);
    if (n.types) n.types = n.types.map(it => r.next(it)).filter(isDefined);
  },

  BOOL: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  CHAR: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  DECIMAL: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  INTEGER: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  INTEGER_SMALL: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  LONG: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  NUMBER: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  DOUBLE: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  FLOAT: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  STRING: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  VOID: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  UNDEFINED: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  NULL: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },
  UNKNOWN: (n, r) => {
    if (n.examples) n.examples.map(it => r.next(it)).filter(isDefined);
  },

  DECORATING: (n, r) => {
    n.of = assertDefined(r.next(n.of));
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },

  ARRAY: (n, r) => {
    n.of = assertDefined(r.next(n.of));
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  ARRAY_PROPERTIES_BY_POSITION: (n, r) => {
    n.properties = n.properties.map(it => r.next(it)).filter(isDefined);
    if (n.commonDenominator) n.commonDenominator = r.next(n?.commonDenominator);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  DICTIONARY: (n, r) => {
    n.valueType = assertDefined(r.next(n.valueType));
    n.keyType = assertDefined(r.next(n.keyType));
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },

  ENUM: (n, r) => {
    n.members = n.members?.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },

  UNION: (n, r) => {
    n.types = n.types.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  EXCLUSIVE_UNION: (n, r) => {
    n.types = n.types.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  INTERSECTION: (n, r) => {
    n.types = n.types.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  NEGATION: (n, r) => {
    n.types = n.types.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },

  EXTERNAL_MODEL_REFERENCE: (n, r) => {
    n.of = assertDefined(r.next(n.of));
    n.model = assertDefined(r.next(n.model));
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);

  },
  GENERIC_SOURCE: (n, r) => {
    n.of = assertGenericSuperType(r.next(n.of));
    n.sourceIdentifiers = n.sourceIdentifiers.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  GENERIC_SOURCE_IDENTIFIER: (n, r) => {
    if (n.upperBound) n.upperBound = r.next(n.upperBound);
    if (n.lowerBound) n.lowerBound = r.next(n.lowerBound);
    if (n.knownEdgeTypes) n.knownEdgeTypes = n.knownEdgeTypes.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  GENERIC_TARGET: (n, r) => {
    const source = assertDefined(r.next(n.source));
    if (source.kind !== OmniTypeKind.GENERIC_SOURCE) {
      throw new Error(`Reduced GenericSource must still be a GenericSource when given to a GenericTarget`);
    }

    n.source = source;
    n.targetIdentifiers = n.targetIdentifiers.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  GENERIC_TARGET_IDENTIFIER: (n, r) => {

    n.type = assertDefined(r.next(n.type));
    n.sourceIdentifier = assertDefined(r.next(n.sourceIdentifier));
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  HARDCODED_REFERENCE: (n, r) => {
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  INTERFACE: (n, r) => {
    n.of = assertProxySuperType(assertDefined(r.next(n.of)));
    if (n.extendedBy) n.extendedBy = assertProxySuperType(r.next(n.extendedBy));
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },

  OBJECT: (n, r) => {
    n.properties = n.properties.map(it => r.next(it)).filter(isDefined);
    if (n.extendedBy) n.extendedBy = assertProxySuperType(r.next(n.extendedBy));
    if (n.subTypeHints) n.subTypeHints = n.subTypeHints?.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  SUBTYPE_HINT: (n, r) => {
    n.type = assertDefined(r.next(n.type));
    n.qualifiers = n.qualifiers.map(it => r.next(it)).filter(isDefined);
  },
  TUPLE: (n, r) => {
    n.types = n.types.map(it => r.next(it)).filter(isDefined);
    if (n.commonDenominator) n.commonDenominator = r.next(n.commonDenominator);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },

  PROPERTY: (n, r) => {
    n.type = assertDefined(r.next(n.type));
  },

  EXAMPLE_PAIRING: (n, r) => {
    if (n.params) n.params = n.params?.map(it => r.next(it)).filter(isDefined);
    if (n.result) n.result = assertDefined(r.next(n.result));
  },
  EXAMPLE_PARAM: (n, r) => {
    n.property = assertDefined(r.next(n.property));
    n.type = assertDefined(r.next(n.type));
  },
  EXAMPLE_RESULT: (n, r) => {
    n.type = assertDefined(r.next(n.type));
  },

  ENDPOINT: (n, r) => {
    n.callbacks = n.callbacks?.map(it => r.next(it)).filter(isDefined);
    n.externalDocumentations = n.externalDocumentations?.map(it => r.next(it)).filter(isDefined);
    n.request = assertDefined(r.next(n.request));
    n.responses = n.responses.map(it => r.next(it)).filter(isDefined);
    n.requestQualifiers = n.requestQualifiers?.map(it => r.next(it)).filter(isDefined);
    n.transports = n.transports.map(it => r.next(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
  LINK_SOURCE_PARAMETER: (n, r) => {
    if (n.propertyPath) n.propertyPath = n.propertyPath?.map(it => r.next(it)).filter(isDefined);
  },
  LINK_TARGET_PARAMETER: (n, r) => {
    n.propertyPath = n.propertyPath.map(it => r.next(it)).filter(isDefined);
  },
  LINK_MAPPING: (n, r) => {
    n.source = assertDefined(r.next(n.source));
    n.target = assertDefined(r.next(n.target));
  },
  LINK: (n, r) => {
    n.mappings = n.mappings.map(it => r.next(it)).filter(isDefined);
    if (n.server) n.server = r.next(n.server);
    if (n.sourceModel) n.sourceModel = r.next(n.sourceModel);
    if (n.targetModel) n.targetModel = r.next(n.targetModel);
  },
  INPUT: (n, r) => {
    n.type = assertDefined(r.next(n.type));
  },
  OUTPUT: (n, r) => {
    n.qualifiers = n.qualifiers.map(it => r.next(it)).filter(isDefined);
    n.type = assertDefined(r.next(n.type));
  },
  CALLBACK: (n, r) => {
    n.request = assertDefined(r.next(n.request));
    n.responses = n.responses.map(it => r.next(it)).filter(isDefined);
    n.transport = assertDefined(r.next(n.transport));
    if (n.examples) n.examples = n.examples.map(it => r.next(it)).filter(isDefined);
  },
};

export class ProxyReducerOmni {

  private static _builder?: ProxyReducerBuilder<OmniNode, 'kind', ProxyReducerOmniNodeOverrides, {}>;

  public static builder() {

    if (!this._builder) {
      this._builder = ProxyReducer.builder<OmniNode, ProxyReducerOmniNodeOverrides>()
        .discriminator('kind')
        .spec(DEFAULT_PROXY_REDUCER_OMNI_SPEC);
    }

    return this._builder;
  }
}
