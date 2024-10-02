import {
  OmnigenOpenRpcComponents,
  OmnigenOpenRpcContact,
  OmnigenOpenRpcContentDescriptor,
  OmnigenOpenRpcDocument,
  OmnigenOpenRpcError,
  OmnigenOpenRpcExample,
  OmnigenOpenRpcExamplePairing,
  OmnigenOpenRpcExternalDocumentationObject,
  OmnigenOpenRpcInfoObject,
  OmnigenOpenRpcLicense,
  OmnigenOpenRpcLink,
  OmnigenOpenRpcLinkObjectServer,
  OmnigenOpenRpcMethod,
  OmnigenOpenRpcRef,
  OmnigenOpenRpcServerObject,
  OmnigenOpenRpcServerVariable,
  OmnigenOpenRpcTag,
  OmnigenOpenRpcVisitorFn,
} from './OmnigenOpenRpcDocument';

/**
 * NOTE: Not used yet, just an experiment
 */
export interface OmnigenOpenRpcVisitor<R> {
  visitDocument: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcDocument, R, this>;
  visitRef: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcRef<unknown>, R, this>;
  visitComponents: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcComponents, R, this>;
  visitContentDescriptor: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcContentDescriptor, R, this>;
  visitError: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcError, R, this>;
  visitExamplePairingObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcExamplePairing, R, this>;
  visitExampleObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcExample, R, this>;
  visitLinkObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcLink, R, this>;
  visitTagObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcTag, R, this>;
  visitInfoObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcInfoObject, R, this>;
  visitContactObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcContact, R, this>;
  visitLicenseObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcLicense, R, this>;
  visitExternalDocumentationObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcExternalDocumentationObject, R, this>;
  visitServerObject: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcServerObject, R, this>;
  visitMethod: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcMethod, R, this>;
  visitServerObjectVariable: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcServerVariable, R, this>;
  visitLinkObjectServer: OmnigenOpenRpcVisitorFn<OmnigenOpenRpcLinkObjectServer, R, this>;
}

/**
 * NOTE: Not used yet, just an experiment
 */
export function createOmnigenOpenRpcVisitor<R>(noop?: R): OmnigenOpenRpcVisitor<R> {

  return {
    visitDocument: (node, visitor) => [
      node.info.visit(visitor),
      node.servers?.map(it => visitor.visitServerObject(it, visitor)),
      node.externalDocs?.visit(visitor),
      node.methods.map(it => it.visit(visitor)),
      node.components?.visit(visitor),
    ],
    visitComponents: (node, visitor) => node.contentDescriptors ? Object.entries(node.contentDescriptors).map(e => e[1].visit(visitor)) : noop,
    visitRef: () => noop,
    visitContentDescriptor: () => noop,
    visitServerObject: (node, visitor) => node.variables ? Object.entries(node.variables).map(e => e[1].visit(visitor)) : noop,
    visitServerObjectVariable: () => noop,
    visitContactObject: () => noop,
    visitTagObject: (node, visitor) => node.externalDocs?.visit(visitor),
    visitError: () => noop,
    visitExampleObject: () => noop,
    visitExamplePairingObject: (node, visitor) => [
      node.result.visit(visitor),
      node.params.map(it => it.visit(visitor)),
    ],
    visitExternalDocumentationObject: () => noop,
    visitInfoObject: (node, visitor) => [
      node.license?.visit(visitor),
      node.contact?.visit(visitor),
    ],
    visitLicenseObject: () => noop,
    visitLinkObject: (node, visitor) => node.server?.visit(visitor),
    visitLinkObjectServer: (node, visitor) => node.variables ? Object.entries(node.variables).map(e => e[1].visit(visitor)) : noop,
    visitMethod: (node, visitor) => [
      node.errors?.map(it => it.visit(visitor)),
      node.examples?.map(it => it.visit(visitor)),
      node.externalDocs?.visit(visitor),
      node.links?.map(it => it.visit(visitor)),
      node.params.map(it => it.visit(visitor)),
      node.result.visit(visitor),
      node.servers?.map(it => it.visit(visitor)),
      node.tags?.map(it => it.visit(visitor)),
    ],
  };
}

/**
 * NOTE: Not used yet, just an experiment
 */
export const DefaultOmnigenOpenRpcVisitor = createOmnigenOpenRpcVisitor<void>();
