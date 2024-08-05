import {OmniNode, OmniNodeKind} from '@omnigen/core';

export type OmniVisitorFn<N extends OmniNode> = (node: N, visitor: OmniVisitor, dispatcher: OmniVisitorDispatcher) => void;

export type OmniVisitor = {
  [K in OmniNodeKind]: OmniVisitorFn<Extract<OmniNode, { kind: K }>>;
};

export interface OmniVisitorDispatcher {
  visit<T extends OmniNode>(type: T | undefined, visitor: OmniVisitor): void;
}

export class DefaultOmniVisitorDispatcher implements OmniVisitorDispatcher {

  private readonly _base: OmniVisitor;

  constructor(base?: OmniVisitor) {
    this._base = base ?? DEFAULT_OMNI_VISITOR;
  }

  public visit<N extends OmniNode>(node: N | undefined, visitor: Partial<OmniVisitor>): void {

    if (!node) {
      return;
    }

    let fn = visitor[node.kind];
    if (!fn) {
      fn = this._base[node.kind];
      visitor = {...this._base, ...visitor} satisfies OmniVisitor;
    }

    fn(node as any, visitor as OmniVisitor, this);
  }
}

const DEFAULT_OMNI_VISITOR: Readonly<OmniVisitor> = {

  MODEL: (t, v, d) => {
    t.types.forEach(it => d.visit(it, v));
    t.endpoints.forEach(it => d.visit(it, v));
    d.visit(t.contact, v);
    t.continuations?.forEach(it => d.visit(it, v));
    t.externalDocumentations?.forEach(it => d.visit(it, v));
    d.visit(t.license, v);
    t.servers?.forEach(it => d.visit(it, v));
  },

  BOOL: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  CHAR: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  DECIMAL: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  INTEGER: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  INTEGER_SMALL: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  LONG: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  NUMBER: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  DOUBLE: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  FLOAT: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },

  STRING: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  VOID: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  UNDEFINED: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  NULL: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  UNKNOWN: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },

  DECORATING: (t, v, d) => {
    d.visit(t.of, v);
    t.examples?.forEach(it => d.visit(it, v));
  },

  ARRAY: (t, v, d) => {
    d.visit(t.of, v);
    t.examples?.forEach(it => d.visit(it, v));
  },
  ARRAY_PROPERTIES_BY_POSITION: (t, v, d) => {
    t.properties.forEach(it => d.visit(it, v));
    d.visit(t?.commonDenominator, v);
    t.examples?.forEach(it => d.visit(it, v));
  },
  DICTIONARY: (t, v, d) => {
    d.visit(t.valueType, v);
    d.visit(t.keyType, v);
    t.examples?.forEach(it => d.visit(it, v));
  },

  ENUM: (t, v, d) => {
    t.members.forEach(it => d.visit(it, v));
    t.examples?.forEach(it => d.visit(it, v));
  },
  ENUM_MEMBER: (t, v, d) => {
  },

  UNION: (t, v, d) => {
    t.types.forEach(it => d.visit(it, v));
    t.examples?.forEach(it => d.visit(it, v));
  },
  EXCLUSIVE_UNION: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  INTERSECTION: (t, v, d) => {
    t.types.forEach(it => d.visit(it, v));
    t.examples?.forEach(it => d.visit(it, v));
  },
  NEGATION: (t, v, d) => {
    t.types.forEach(it => d.visit(it, v));
    t.examples?.forEach(it => d.visit(it, v));
  },

  EXTERNAL_MODEL_REFERENCE: (t, v, d) => {
    d.visit(t.of, v);
    d.visit(t.model, v);
    t.examples?.forEach(it => d.visit(it, v));
  },
  GENERIC_SOURCE: (t, v, d) => {
    t.sourceIdentifiers.forEach(it => d.visit(it, v));
    d.visit(t.of, v);
    t.examples?.forEach(it => d.visit(it, v));
  },
  GENERIC_SOURCE_IDENTIFIER: (t, v, d) => {
    d.visit(t.upperBound, v);
    d.visit(t.lowerBound, v);
    t.knownEdgeTypes?.forEach(it => d.visit(it, v));
    t.examples?.forEach(it => d.visit(it, v));
  },
  GENERIC_TARGET: (t, v, d) => {
    d.visit(t.source, v);
    t.targetIdentifiers.forEach(it => d.visit(it, v));
    t.examples?.forEach(it => d.visit(it, v));
  },
  GENERIC_TARGET_IDENTIFIER: (t, v, d) => {
    d.visit(t.type, v);
    d.visit(t.sourceIdentifier, v);
    t.examples?.forEach(it => d.visit(it, v));
  },
  HARDCODED_REFERENCE: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
  },
  INTERFACE: (t, v, d) => {
    d.visit(t.of, v);
    d.visit(t.extendedBy, v);
    t.examples?.forEach(it => d.visit(it, v));
  },

  OBJECT: (t, v, d) => {
    t.properties.forEach(it => d.visit(it, v));
    d.visit(t.extendedBy, v);
    t.subTypeHints;
    t.examples?.forEach(it => d.visit(it, v));
  },
  SUBTYPE_HINT: (n, v, d) => {
    d.visit(n.type, v);
    n.qualifiers.map(it => d.visit(it, v));
  },
  TUPLE: (t, v, d) => {
    t.types.forEach(it => d.visit(it, v));
    d.visit(t.commonDenominator, v);
    t.examples?.forEach(it => d.visit(it, v));
  },

  PROPERTY: (t, v, d) => {
    d.visit(t.type, v);
    d.visit(t.owner, v); // TODO: Replace with ref to owner -- so as to not have recursive visiting.
  },

  EXAMPLE: (t, v, d) => {
  },
  EXAMPLE_PAIRING: (t, v, d) => {
    t.params?.forEach(it => d.visit(it, v));
    d.visit(t.result, v);
  },
  EXAMPLE_PARAM: (t, v, d) => {
    d.visit(t.property, v);
    d.visit(t.type, v);
  },
  EXAMPLE_RESULT: (t, v, d) => {
    d.visit(t.type, v);
  },

  LICENSE: (t, v, d) => {
  },
  CONTACT: (t, v, d) => {
  },
  EXTERNAL_DOCUMENTATION: (t, v, d) => {
  },
  SERVER: (t, v, d) => {
  },
  ENDPOINT: (t, v, d) => {
    t.callbacks?.forEach(it => d.visit(it, v));
    t.examples?.forEach(it => d.visit(it, v));
    t.externalDocumentations?.forEach(it => d.visit(it, v));
    d.visit(t.request, v);
    t.responses.forEach(it => d.visit(it, v));
    t.requestQualifiers?.forEach(it => d.visit(it, v));
    t.transports.forEach(it => d.visit(it, v));
  },
  LINK_SOURCE_PARAMETER: (t, v, d) => {
    t.propertyPath?.forEach(it => d.visit(it, v));
  },
  LINK_TARGET_PARAMETER: (t, v, d) => {
    t.propertyPath.forEach(it => d.visit(it, v));
  },
  LINK_MAPPING: (t, v, d) => {
    d.visit(t.source, v);
    d.visit(t.target, v);
  },
  LINK: (t, v, d) => {
    t.mappings.forEach(it => d.visit(it, v));
    d.visit(t.server, v);
    d.visit(t.sourceModel, v);
    d.visit(t.targetModel, v);
  },
  INPUT: (t, v, d) => {
    d.visit(t.type, v);
  },
  OUTPUT: (t, v, d) => {
    t.qualifiers.forEach(it => d.visit(it, v));
  },
  CALLBACK: (t, v, d) => {
    t.examples?.forEach(it => d.visit(it, v));
    d.visit(t.request, v);
    t.responses.forEach(it => d.visit(it, v));
    d.visit(t.transport, v);
  },
  TRANSPORT_HTTP: (t, v, d) => {
  },
  TRANSPORT_MQ: (t, v, d) => {
  },
  PAYLOAD_PATH_QUALIFIER: (t, v, d) => {
  },
};
