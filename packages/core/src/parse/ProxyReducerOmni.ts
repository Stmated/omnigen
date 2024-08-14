import {OmniItemKind, OmniModel, OmniNode, OmniType, OmniTypeKind} from '@omnigen/api';
import {createProxyReducerCreator, ProxyReducerSpec} from './ProxyReducer.ts';
import {assertSuperType} from './Reducer.ts';
import {assertDefined, assertGenericSuperType, isDefined} from '../util';
import {ReduceReturnTypeOmni} from './ReducerOmni.ts';

interface ProxyReduceReturnTypeOverride {
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

const DEFAULT_PROXY_REDUCER_OMNI_SPEC: ProxyReducerSpec<OmniNode, 'kind', ReduceReturnTypeOmni> = {

  MODEL: (n, a) => {
    n.endpoints = n.endpoints.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.contact) n.contact = a.reducer.reduce(n.contact);
    if (n.license) n.license = a.reducer.reduce(n.license);
    if (n.continuations) n.continuations = n.continuations?.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.externalDocumentations) n.externalDocumentations = n.externalDocumentations.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.servers) n.servers = n.servers.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.types) n.types = n.types.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  BOOL: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  CHAR: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  DECIMAL: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  INTEGER: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  INTEGER_SMALL: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  LONG: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  NUMBER: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  DOUBLE: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  FLOAT: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  STRING: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  VOID: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  UNDEFINED: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  NULL: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  UNKNOWN: (n, a) => {
    if (n.examples) n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  DECORATING: (n, a) => {
    n.of = assertDefined(a.reducer.reduce(n.of));
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  ARRAY: (n, a) => {
    n.of = assertDefined(a.reducer.reduce(n.of));
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  ARRAY_PROPERTIES_BY_POSITION: (n, a) => {
    n.properties = n.properties.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.commonDenominator) n.commonDenominator = a.reducer.reduce(n?.commonDenominator);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  DICTIONARY: (n, a) => {
    n.valueType = assertDefined(a.reducer.reduce(n.valueType));
    n.keyType = assertDefined(a.reducer.reduce(n.keyType));
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  ENUM: (n, a) => {
    n.members = n.members?.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  UNION: (n, a) => {
    n.types = n.types.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  EXCLUSIVE_UNION: (n, a) => {
    n.types = n.types.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  INTERSECTION: (n, a) => {
    n.types = n.types.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  NEGATION: (n, a) => {
    n.types = n.types.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  EXTERNAL_MODEL_REFERENCE: (n, a) => {
    n.of = assertDefined(a.reducer.reduce(n.of));
    n.model = assertDefined(a.reducer.reduce(n.model));
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);

  },
  GENERIC_SOURCE: (n, a) => {
    n.of = assertGenericSuperType(a.reducer.reduce(n.of));
    n.sourceIdentifiers = n.sourceIdentifiers.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  GENERIC_SOURCE_IDENTIFIER: (n, a) => {
    if (n.upperBound) n.upperBound = a.reducer.reduce(n.upperBound);
    if (n.lowerBound) n.lowerBound = a.reducer.reduce(n.lowerBound);
    if (n.knownEdgeTypes) n.knownEdgeTypes = n.knownEdgeTypes.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  GENERIC_TARGET: (n, a) => {
    const source = assertDefined(a.reducer.reduce(n.source));
    if (source.kind !== OmniTypeKind.GENERIC_SOURCE) {
      throw new Error(`Reduced GenericSource must still be a GenericSource when given to a GenericTarget`);
    }

    n.source = source;
    n.targetIdentifiers = n.targetIdentifiers.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  GENERIC_TARGET_IDENTIFIER: (n, a) => {

    n.type = assertDefined(a.reducer.reduce(n.type));
    n.sourceIdentifier = assertDefined(a.reducer.reduce(n.sourceIdentifier));
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  HARDCODED_REFERENCE: (n, a) => {
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  INTERFACE: (n, a) => {
    n.of = assertSuperType(assertDefined(a.reducer.reduce(n.of)));
    if (n.extendedBy) n.extendedBy = assertSuperType(a.reducer.reduce(n.extendedBy));
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  OBJECT: (n, a) => {
    n.properties = n.properties.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.extendedBy) n.extendedBy = assertSuperType(a.reducer.reduce(n.extendedBy));
    if (n.subTypeHints) n.subTypeHints = n.subTypeHints?.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  SUBTYPE_HINT: (n, a) => {
    n.type = assertDefined(a.reducer.reduce(n.type));
    n.qualifiers = n.qualifiers.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  TUPLE: (n, a) => {
    n.types = n.types.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.commonDenominator) n.commonDenominator = a.reducer.reduce(n.commonDenominator);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },

  PROPERTY: (n, a) => {
    n.type = assertDefined(a.reducer.reduce(n.type));
    n.owner = assertDefined(a.reducer.reduce(n.owner));
  },

  EXAMPLE_PAIRING: (n, a) => {
    if (n.params) n.params = n.params?.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.result) n.result = assertDefined(a.reducer.reduce(n.result));
  },
  EXAMPLE_PARAM: (n, a) => {
    n.property = assertDefined(a.reducer.reduce(n.property));
    n.type = assertDefined(a.reducer.reduce(n.type));
  },
  EXAMPLE_RESULT: (n, a) => {
    n.type = assertDefined(a.reducer.reduce(n.type));
  },

  ENDPOINT: (n, a) => {
    n.callbacks = n.callbacks?.map(it => a.reducer.reduce(it)).filter(isDefined);
    n.externalDocumentations = n.externalDocumentations?.map(it => a.reducer.reduce(it)).filter(isDefined);
    n.request = assertDefined(a.reducer.reduce(n.request));
    n.responses = n.responses.map(it => a.reducer.reduce(it)).filter(isDefined);
    n.requestQualifiers = n.requestQualifiers?.map(it => a.reducer.reduce(it)).filter(isDefined);
    n.transports = n.transports.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  LINK_SOURCE_PARAMETER: (n, a) => {
    if (n.propertyPath) n.propertyPath = n.propertyPath?.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  LINK_TARGET_PARAMETER: (n, a) => {
    n.propertyPath = n.propertyPath.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
  LINK_MAPPING: (n, a) => {
    n.source = assertDefined(a.reducer.reduce(n.source));
    n.target = assertDefined(a.reducer.reduce(n.target));
  },
  LINK: (n, a) => {
    n.mappings = n.mappings.map(it => a.reducer.reduce(it)).filter(isDefined);
    if (n.server) n.server = a.reducer.reduce(n.server);
    if (n.sourceModel) n.sourceModel = a.reducer.reduce(n.sourceModel);
    if (n.targetModel) n.targetModel = a.reducer.reduce(n.targetModel);
  },
  INPUT: (n, a) => {
    n.type = assertDefined(a.reducer.reduce(n.type));
  },
  OUTPUT: (n, a) => {
    n.qualifiers = n.qualifiers.map(it => a.reducer.reduce(it)).filter(isDefined);
    n.type = assertDefined(a.reducer.reduce(n.type));
  },
  CALLBACK: (n, a) => {
    n.request = assertDefined(a.reducer.reduce(n.request));
    n.responses = n.responses.map(it => a.reducer.reduce(it)).filter(isDefined);
    n.transport = assertDefined(a.reducer.reduce(n.transport));
    if (n.examples) n.examples = n.examples.map(it => a.reducer.reduce(it)).filter(isDefined);
  },
};

export const createProxyReducerOmni = createProxyReducerCreator<OmniNode, 'kind', ProxyReduceReturnTypeOverride>('kind', DEFAULT_PROXY_REDUCER_OMNI_SPEC);
