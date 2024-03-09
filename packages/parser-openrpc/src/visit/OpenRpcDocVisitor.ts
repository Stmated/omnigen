
import {ToDefined, DocVisitorTransformer, ToResolved, ToSingle} from '@omnigen/parser-jsonschema';
import {OpenrpcDocument} from '@open-rpc/meta-schema';

type MethodType<S extends OpenrpcDocument> = ToResolved<ToSingle<S['methods']>>;
type ServerType<S extends OpenrpcDocument> = ToSingle<ToDefined<S['servers']>>;
type ServerVariableType<S extends OpenrpcDocument> = ToSingle<ToDefined<S['servers']>>['variables'];
type LinkType<S extends OpenrpcDocument> = ToResolved<ToSingle<ToDefined<MethodType<S>['links']>>>;
type LinkObjectServerType<S extends OpenrpcDocument> = ToDefined<LinkType<S>['server']>;

// export interface OpenRpcVisitor<S extends OpenrpcDocument> {
//   visitDocument: DocVisitorTransformer<S['Document'], this>;
//   visitRef: DocVisitorTransformer<S['ref'], this>;
//   visitComponents: DocVisitorTransformer<S['Components'], this>;
//   visitContentDescriptor: DocVisitorTransformer<S['ContentDescriptor'], this>;
//   visitError: DocVisitorTransformer<S['Error'], this>;
//   visitExamplePairingObject: DocVisitorTransformer<S['ExamplePairingObject'], this>;
//   visitExampleObject: DocVisitorTransformer<S['ExampleObject'], this>;
//   visitLinkObject: DocVisitorTransformer<S['LinkObject'], this>;
//   visitTagObject: DocVisitorTransformer<S['TagObject'], this>;
//   visitInfoObject: DocVisitorTransformer<S['InfoObject'], this>;
//   visitContactObject: DocVisitorTransformer<S['ContactObject'], this>;
//   visitLicenseObject: DocVisitorTransformer<S['LicenseObject'], this>;
//   visitExternalDocumentationObject: DocVisitorTransformer<ToDefined<S['externalDocs']>, this>;
//   visitServerObject: DocVisitorTransformer<ServerType<S>, this>;
//   visitMethod: DocVisitorTransformer<MethodType<S>, this>;
//   visitServerObjectVariable: DocVisitorTransformer<S['ServerObjectVariable'], this>;
//   visitLinkObjectServer: DocVisitorTransformer<LinkObjectServerType<S>, this>;
// }
//
// export function createOpenRpcVisitor<R>(noop?: R): OpenRpcVisitor<OpenrpcDocument> {
//
//   return {
//     visitDocument: (node, visitor) => [
//       node.info.visit(visitor),
//       node.servers?.map(it => visitor.visitServerObject(it, visitor)),
//       node.externalDocs?.visit(visitor),
//       node.methods.map(it => it.visit(visitor)),
//       node.components?.visit(visitor),
//     ],
//     visitComponents: (node, visitor) => node.contentDescriptors ? Object.entries(node.contentDescriptors).map(e => e[1].visit(visitor)) : noop,
//     visitRef: () => noop,
//     visitContentDescriptor: () => noop,
//     visitServerObject: (node, visitor) => node.variables ? Object.entries(node.variables).map(e => e[1].visit(visitor)) : noop,
//     visitServerObjectVariable: () => noop,
//     visitContactObject: () => noop,
//     visitTagObject: (node, visitor) => node.externalDocs?.visit(visitor),
//     visitError: () => noop,
//     visitExampleObject: () => noop,
//     visitExamplePairingObject: (node, visitor) => [
//       node.result.visit(visitor),
//       node.params.map(it => it.visit(visitor)),
//     ],
//     visitExternalDocumentationObject: () => noop,
//     visitInfoObject: (node, visitor) => [
//       node.license?.visit(visitor),
//       node.contact?.visit(visitor),
//     ],
//     visitLicenseObject: () => noop,
//     visitLinkObject: (node, visitor) => node.server?.visit(visitor),
//     visitLinkObjectServer: (node, visitor) => node.variables ? Object.entries(node.variables).map(e => e[1].visit(visitor)) : noop,
//     visitMethod: (node, visitor) => [
//       node.errors?.map(it => visitor.visitError(it, visitor),
//       node.examples?.map(it => visitor.visitExampleObject(it, visitor)),
//       node.externalDocs?.visit(visitor),
//       node.links?.map(it => visitor.visitLinkObject(it, visitor)),
//       node.params.map(it => visitor.visitContentDescriptor(it, visitor)),
//       visitor.visitContentDescriptor(node.result, visitor),
//       node.servers?.map(it => visitor.visitServerObject(it, visitor)),
//       node.tags?.map(it => visitor.visitTagObject(it, visitor)),
//     ],
//   };
// }
//
// export const DefaultOpenRpcVisitor = createOpenRpcVisitor<void>();
