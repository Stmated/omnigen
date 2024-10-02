import {OmnigenOpenRpcVisitor} from './OmnigenOpenRpcVisitor';
import {VisitResult} from '@omnigen/api';
import {
  Components,
  ContactObject,
  ContentDescriptorObject,
  ErrorObject,
  ExampleObject,
  ExamplePairingObject,
  ExternalDocumentationObject,
  InfoObject,
  LicenseObject,
  LinkObject,
  LinkObjectMethod,
  LinkObjectServer,
  MethodObject,
  Openrpc,
  OpenrpcDocument,
  ServerObject,
  ServerObjectVariable,
  TagObject,
} from '@open-rpc/meta-schema';
import {AnyJSONSchema} from '@omnigen/parser-jsonschema';

type KeysOf<T extends object> = {
  [K in keyof T]: T[K] extends undefined ? undefined | unknown : unknown
};
export type OmnigenOpenRpcVisitorFn<N extends AbstractOpenRpcEntity, R, V extends OmnigenOpenRpcVisitor<R>> = (node: N, visitor: V) => VisitResult<R>;
export type ImplOrRef<T> = OmnigenOpenRpcRef<T> | Exclude<T, { $ref: any }>;
export type ImplOrRefRecordOf<T> = { [key: string]: ImplOrRef<T> };

export abstract class AbstractOpenRpcEntity {
  abstract visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R>;

  // eslint-disable-next-line no-undef
  [key: string]: unknown;
}

export class OmnigenOpenRpcRef<T> extends AbstractOpenRpcEntity {
  $ref: string;

  constructor($ref: string) {
    super();
    this.$ref = $ref;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitRef(this, visitor);
  }
}

export class OmnigenOpenRpcError extends AbstractOpenRpcEntity implements KeysOf<ErrorObject> {
  code: ErrorObject['code'];
  message: ErrorObject['message'];
  data?: ErrorObject['data'];

  constructor(code: ErrorObject['code'], message: ErrorObject['message']) {
    super();
    this.code = code;
    this.message = message;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitError(this, visitor);
  }
}

export class OmnigenOpenRpcExamplePairing extends AbstractOpenRpcEntity implements KeysOf<ExamplePairingObject> {

  name: ExamplePairingObject['name'];
  params: Array<ImplOrRef<OmnigenOpenRpcExample>>;
  result: ImplOrRef<OmnigenOpenRpcExample>;
  description?: ExamplePairingObject['description'];

  constructor(name: OmnigenOpenRpcExamplePairing['name'], params: OmnigenOpenRpcExamplePairing['params'], result: OmnigenOpenRpcExamplePairing['result']) {
    super();
    this.name = name;
    this.params = params;
    this.result = result;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitExamplePairingObject(this, visitor);
  }
}

export class OmnigenOpenRpcExample extends AbstractOpenRpcEntity implements KeysOf<ExampleObject> {
  name: ExampleObject['name'];
  value: ExampleObject['value'];
  description?: ExampleObject['description'];
  summary?: ExampleObject['summary'];

  constructor(name: ExampleObject['name'], value: ExampleObject['value']) {
    super();
    this.name = name;
    this.value = value;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitExampleObject(this, visitor);
  }
}

export class OmnigenOpenRpcLinkObjectServer extends AbstractOpenRpcEntity implements KeysOf<LinkObjectServer> {
  readonly url: LinkObjectServer['url'];
  description?: LinkObjectServer['description'];
  name?: LinkObjectServer['name'];
  summary?: LinkObjectServer['summary'];
  variables?: Record<string, OmnigenOpenRpcServerVariable>;

  constructor(url: LinkObjectServer['url']) {
    super();
    this.url = url;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitLinkObjectServer(this, visitor);
  }
}

export class OmnigenOpenRpcLink extends AbstractOpenRpcEntity implements KeysOf<LinkObject> {
  description?: LinkObject['description'];
  method?: LinkObject['method'];
  name?: LinkObject['name'];
  params?: Record<LinkObjectMethod, any>;
  server?: OmnigenOpenRpcLinkObjectServer | undefined;
  summary?: LinkObject['summary'];

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitLinkObject(this, visitor);
  }
}

export class OmnigenOpenRpcTag extends AbstractOpenRpcEntity implements KeysOf<TagObject> {
  readonly name: TagObject['name'];
  description?: TagObject['description'];
  externalDocs?: OmnigenOpenRpcExternalDocumentationObject | undefined;

  constructor(name: TagObject['name']) {
    super();
    this.name = name;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitTagObject(this, visitor);
  }
}

export class OmnigenOpenRpcComponents extends AbstractOpenRpcEntity implements KeysOf<Components> {
  contentDescriptors?: ImplOrRefRecordOf<OmnigenOpenRpcContentDescriptor>;
  errors?: ImplOrRefRecordOf<OmnigenOpenRpcError>;
  examplePairings?: ImplOrRefRecordOf<OmnigenOpenRpcExamplePairing>;
  examples?: ImplOrRefRecordOf<OmnigenOpenRpcExample>;
  links?: ImplOrRefRecordOf<OmnigenOpenRpcLink>;
  schemas?: { [key: string]: AnyJSONSchema };
  tags?: ImplOrRefRecordOf<OmnigenOpenRpcTag>;

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitComponents(this, visitor);
  }
}

export class OmnigenOpenRpcContentDescriptor extends AbstractOpenRpcEntity implements KeysOf<ContentDescriptorObject> {

  name: ContentDescriptorObject['name'];
  schema: AnyJSONSchema;
  deprecated?: ContentDescriptorObject['deprecated'];
  description?: ContentDescriptorObject['description'];
  required?: ContentDescriptorObject['required'];
  summary?: ContentDescriptorObject['summary'];

  constructor(name: ContentDescriptorObject['name'], schema: AnyJSONSchema) {
    super();
    this.name = name;
    this.schema = schema;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitContentDescriptor(this, visitor);
  }
}

export class OmnigenOpenRpcContact extends AbstractOpenRpcEntity implements KeysOf<ContactObject> {
  email?: ContactObject['email'];
  name?: ContactObject['name'];
  url?: ContactObject['url'];

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitContactObject(this, visitor);
  }
}

export class OmnigenOpenRpcLicense extends AbstractOpenRpcEntity implements KeysOf<LicenseObject> {
  name: LicenseObject['name'];
  url: LicenseObject['url'];

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitLicenseObject(this, visitor);
  }

}

export class OmnigenOpenRpcInfoObject extends AbstractOpenRpcEntity implements KeysOf<InfoObject> {
  title: InfoObject['title'];
  version: InfoObject['version'];

  contact?: OmnigenOpenRpcContact | undefined;
  description?: InfoObject['description'];
  license?: OmnigenOpenRpcLicense | undefined;
  termsOfService?: InfoObject['termsOfService'];

  constructor(title: InfoObject['title'], version: InfoObject['version']) {
    super();
    this.title = title;
    this.version = version;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitInfoObject(this, visitor);
  }
}

export class OmnigenOpenRpcExternalDocumentationObject extends AbstractOpenRpcEntity implements KeysOf<ExternalDocumentationObject> {
  url: ExternalDocumentationObject['url'];
  description?: ExternalDocumentationObject['description'];

  constructor(url: ExternalDocumentationObject['url']) {
    super();
    this.url = url;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitExternalDocumentationObject(this, visitor);
  }
}

export class OmnigenOpenRpcServerObject extends AbstractOpenRpcEntity implements KeysOf<ServerObject> {
  readonly url: ServerObject['url'];
  description?: ServerObject['description'];
  name?: ServerObject['name'];
  summary?: ServerObject['summary'];
  variables?: ImplOrRefRecordOf<OmnigenOpenRpcServerVariable>;

  constructor(url: ServerObject['url']) {
    super();
    this.url = url;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitServerObject(this, visitor);
  }
}

export class OmnigenOpenRpcServerVariable extends AbstractOpenRpcEntity implements KeysOf<ServerObjectVariable> {
  readonly 'default': ServerObjectVariable['default'];
  description?: ServerObjectVariable['description'];
  enum?: ServerObjectVariable['enum'];

  constructor(def: OmnigenOpenRpcServerVariable['default']) {
    super();
    this.default = def;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitServerObjectVariable(this, visitor);
  }
}

export class OmnigenOpenRpcMethod extends AbstractOpenRpcEntity implements KeysOf<MethodObject> {
  name: MethodObject['name'];
  params: Array<ImplOrRef<OmnigenOpenRpcContentDescriptor>>;
  result: ImplOrRef<OmnigenOpenRpcContentDescriptor>;
  deprecated?: MethodObject['deprecated'] | undefined;
  description?: MethodObject['description'] | undefined;
  errors?: Array<ImplOrRef<OmnigenOpenRpcError>> | undefined;
  examples?: Array<ImplOrRef<OmnigenOpenRpcExamplePairing>> | undefined;
  externalDocs?: OmnigenOpenRpcExternalDocumentationObject | undefined;
  links?: Array<ImplOrRef<OmnigenOpenRpcLink>> | undefined;
  paramStructure?: MethodObject['paramStructure'];
  servers?: Array<OmnigenOpenRpcServerObject> | undefined;
  summary?: MethodObject['summary'];
  tags?: Array<ImplOrRef<OmnigenOpenRpcTag>> | undefined;

  constructor(name: OmnigenOpenRpcMethod['name'], params: OmnigenOpenRpcMethod['params'], result: OmnigenOpenRpcMethod['result']) {
    super();
    this.name = name;
    this.params = params;
    this.result = result;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitMethod(this, visitor);
  }
}

export class OmnigenOpenRpcDocument extends AbstractOpenRpcEntity implements KeysOf<OpenrpcDocument> {
  openrpc: Openrpc;
  info: OmnigenOpenRpcInfoObject;
  methods: Array<ImplOrRef<OmnigenOpenRpcMethod>>;
  components?: OmnigenOpenRpcComponents;
  externalDocs?: OmnigenOpenRpcExternalDocumentationObject;
  servers?: Array<OmnigenOpenRpcServerObject>;

  constructor(openrpc: OmnigenOpenRpcDocument['openrpc'], info: OmnigenOpenRpcDocument['info'], methods: OmnigenOpenRpcDocument['methods']) {
    super();
    this.openrpc = openrpc;
    this.info = info;
    this.methods = methods;
  }

  visit<R>(visitor: OmnigenOpenRpcVisitor<R>): VisitResult<R> {
    return visitor.visitDocument(this, visitor);
  }
}
