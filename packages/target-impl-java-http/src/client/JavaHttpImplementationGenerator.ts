import {ImplementationGenerator} from './ImplementationGenerator';
import {
  AddThrowsForKnownMethodsJavaAstTransformer,
  JACKSON_JSON_NODE,
  JACKSON_OBJECT_MAPPER,
  JacksonJavaAstTransformer,
  Java,
  JAVA_FEATURES,
  JavaAndTargetOptions,
  JavaOptions,
} from '@omnigen/target-java';
import {type ImplementationArgs} from './ImplementationArgs';
import {
  AstNode,
  AstTransformer,
  LiteralValue,
  OmniComparisonOperator,
  OmniHardcodedReferenceType, OmniItemKind,
  OmniObjectType,
  OmniOutput,
  OmniType,
  OmniTypeKind, PackageOptions,
  RootAstNode,
  TargetOptions,
  TypeNode,
  UnknownKind,
} from '@omnigen/core';
import {ImplementationOptions} from './ImplementationOptions';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, Naming, OmniUtil} from '@omnigen/core-util';
import {
  AddAbstractAccessorsAstTransformer,
  AddAccessorsForFieldsAstTransformer,
  AddCompositionMembersCodeAstTransformer,
  AddConstructorCodeAstTransformer,
  AddFieldsAstTransformer, Code,
  PackageResolverAstTransformer,
  RemoveConstantParametersAstTransformer,
  ReorderMembersAstTransformer,
  ResolveGenericSourceIdentifiersAstTransformer,
} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

type JavaHttpGeneratorType = ImplementationGenerator<RootAstNode, JavaAndTargetOptions, ImplementationOptions>;
type JavaHttpArgs = ImplementationArgs<Java.JavaAstRootNode, JavaAndTargetOptions, ImplementationOptions>;

/**
 * TODO: Transformer that checks the response object, and counts the number of non-literal final values
 *        If there is only one possible thing that changes between the different responses, then only give that (optional)
 *
 * TODO: Set more headers depending on the endpoint properties
 *
 * TODO: Able to decide if it should be a POST or GET, etc
 *
 * TODO: Able to decide if the request should be sync or async
 *
 * TODO: Either taking a HttpClientBuilder, or taking a HttpClient, or building it on our own
 *        Should still always go through a central "getHttpClient" method?
 *
 * TODO: Transformer that moves common strings into private static final fields that are used instead
 *
 * TODO: Test cases for all of it
 */
export class JavaHttpImplementationGenerator implements JavaHttpGeneratorType {

  /**
   * Takes argument containing the model and the AST nodes of that model, and creates a new model for server/client.
   *
   * @param args
   */
  generate(args: JavaHttpArgs): Promise<AstNode[]> {

    const promises: Promise<AstNode>[] = [];

    if (args.implOptions.generateClient) {
      promises.push(this.generateClient(args));
    }

    // for (const endpoint of args.model.endpoints) {
    //   if (args.options.generateServer) {
    //     if (endpoint.responses) {
    //
    //     }
    //   }
    // }

    return Promise.all(promises)
      .then(rootNodes => {
        return rootNodes;
      });
  }

  private async generateClient(args: JavaHttpArgs): Promise<AstNode> {

    const root = new Java.JavaAstRootNode();

    const client = new Java.ClassDeclaration(
      new Java.EdgeType({kind: OmniTypeKind.OBJECT, name: 'ApiClient', properties: []}, true),
      new Java.Identifier('ApiClient'), // Should be a setting
      new Java.Block(),
    );

    const objectMapperField = new Java.Field(
      new Java.EdgeType({
        kind: OmniTypeKind.HARDCODED_REFERENCE,
        fqn: JACKSON_OBJECT_MAPPER,
      }),
      new Java.Identifier('objectMapper'),
      new Java.ModifierList(new Java.Modifier(Java.ModifierKind.PRIVATE), new Java.Modifier(Java.ModifierKind.FINAL)),
    );

    client.body.children.push(objectMapperField);

    this.addFieldAndMethods(client, args, root, objectMapperField);

    const implTargetOptions: JavaAndTargetOptions = {
      ...args.targetOptions,
      package: args.implOptions.clientPackage,
    };

    const transformers: AstTransformer<Code.CodeRootAstNode, PackageOptions & TargetOptions & JavaOptions>[] = [
      // new ElevateAsAbstractMembersAstTransformer(),
      new AddCompositionMembersCodeAstTransformer(),
      new AddFieldsAstTransformer(),
      new AddConstructorCodeAstTransformer(),
      new AddAccessorsForFieldsAstTransformer([objectMapperField.identifier]),
      new AddAbstractAccessorsAstTransformer(),
      new AddThrowsForKnownMethodsJavaAstTransformer(),
      new ResolveGenericSourceIdentifiersAstTransformer(),
      new RemoveConstantParametersAstTransformer(),
      new JacksonJavaAstTransformer(),
      new PackageResolverAstTransformer(),
      new ReorderMembersAstTransformer(),
    ];

    for (const transformer of transformers) {

      await transformer.transformAst({
        root: root,
        options: implTargetOptions,
        model: args.model,
        externals: [{
          node: args.root,
          options: args.targetOptions,
        }],
        features: JAVA_FEATURES,
      });
    }

    return Promise.resolve(root);
  }

  private addFieldAndMethods(
    client: Java.ClassDeclaration,
    args: JavaHttpArgs,
    root: Java.JavaAstRootNode,
    objectMapperField: Java.Field,
  ): void {

    // TODO: Transformer that adds functionality of keeping track of all instantiations of the object

    const requestIdentifier = new Java.Identifier('request');
    const pathIdentifier = new Java.Identifier('path');

    const callMethod = this.createCallMethod(pathIdentifier, requestIdentifier, objectMapperField);
    client.body.children.push(callMethod);

    for (const endpoint of args.model.endpoints) {

      // TODO: A few different method signatures per request-type
      //        * One with the whole payload as argument
      //        * One with only the required properties of the request body, and build it dynamically
      //          - Especially built only for JsonRPC or can it be done generically?
      //  Also must add generic method that does actual sending -- either as abstract method or as impl (or both?)

      const methodBlock = new Java.Block(...[]);

      // TODO: Custom transformer that does the Composition XOR -> Compatible Java code
      //        (move it out from the base transformer, and let this special transformer handle all edge cases)
      //        That way we can re-use that transformer here as well, for when we have different response types.

      const requestIdentifier = new Java.Identifier('request');
      const responseIdentifier = new Java.Identifier('response');

      const requestParameter = new Java.Parameter(
        new Java.EdgeType(endpoint.request.type),
        requestIdentifier,
      );

      const regularResponses: OmniOutput[] = [];
      const errorResponses: OmniOutput[] = [];

      const responseDeclaration = new Java.VariableDeclaration(
        responseIdentifier,
        new Java.MethodCall(
          new Java.MemberAccess(new Java.SelfReference(), callMethod.signature.identifier),
          new Java.ArgumentList(
            new Java.DeclarationReference(requestParameter),
          ),
        ),
      );

      methodBlock.children.push(new Java.Statement(responseDeclaration));

      const throwsTypeList = new Java.TypeList();

      let unqualifiedResponses = 0;
      for (const response of endpoint.responses) {

        if (response.qualifiers.length > 0) {

          const qualifierResultBlock = this.addResponseWithQualifiers(response, responseDeclaration, methodBlock);

          if (response.error) {
            errorResponses.push(response);
            // TODO: Need to throw the actual exception :)
            qualifierResultBlock.children.push(
              ...this.createExceptionThrowingBlock(args, objectMapperField, responseDeclaration, response.type, client.body, throwsTypeList),
            );
          } else {
            regularResponses.push(response);
            qualifierResultBlock.children.push(
              new Java.Statement(
                new Java.ReturnStatement(
                  this.createConverterMethodCall(args.root, objectMapperField, responseDeclaration, response.type),
                ),
              ),
            );
          }

        } else {
          unqualifiedResponses++;
        }
      }

      if (unqualifiedResponses == 0) {
        methodBlock.children.push(
          new Java.Statement(
            new Java.ThrowStatement(
              new Java.NewStatement(
                new Java.EdgeType(
                  {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['java', 'lang'], edgeName: 'IllegalArgumentException'}},
                  true,
                ),
                new Java.ArgumentList(
                  new Java.Literal(`No response qualifier matched`),
                ),
              ),
            ),
          ),
        );
      }

      const methodResponseType = this.getMethodResponseType(args, regularResponses, errorResponses);

      const requestMethod = new Java.MethodDeclaration(
        new Java.MethodDeclarationSignature(
          new Java.Identifier(Case.camel(endpoint.name)),
          methodResponseType,
          new Java.ParameterList(requestParameter),
          undefined,
          undefined,
          undefined,
          throwsTypeList,
        ),
        methodBlock,
      );

      client.body.children.push(requestMethod);
    }

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(args.implOptions.clientPackage),
      new Java.ImportList(),
      client,
    ));
  }

  private createCallMethod(
    pathIdentifier: Java.Identifier,
    requestIdentifier: Java.Identifier,
    objectMapperField: Java.Field,
  ) {

    const httpClientBuilderIdentifier = new Java.Identifier('builder');
    const httpClientIdentifier = new Java.Identifier('client');
    const stringValueIdentifier = new Java.Identifier('stringValue');
    const httpRequestIdentifier = new Java.Identifier('httpRequest');
    const httpResponseIdentifier = new Java.Identifier('httpResponse');

    const httpClientBuilderDeclaration = new Java.VariableDeclaration(
      httpClientBuilderIdentifier,
      new Java.MethodCall(
        new Java.MemberAccess(
          new Java.ClassName(new Java.EdgeType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: {namespace: ['java', 'net', 'http'], edgeName: 'HttpClient'},
          })),
          new Java.Identifier('newBuilder'),
        ),
        new Java.ArgumentList(),
      ),
      undefined, true,
    );

    const requestArgumentDeclaration = new Java.Parameter(
      new Java.EdgeType({kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.DYNAMIC_OBJECT}, false),
      requestIdentifier,
    );

    const httpRequestBuilderDeclaration = new Java.VariableDeclaration(
      new Java.Identifier('httpRequestBuilder'),
      new Java.MethodCall(
        new Java.MemberAccess(
          new Java.ClassName(new Java.EdgeType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: {namespace: ['java', 'net', 'http'], edgeName: 'HttpRequest'},
          })),
          new Java.Identifier('newBuilder'),
        ),
        new Java.ArgumentList(
          new Java.MethodCall(
            new Java.MemberAccess(
              new Java.ClassName(new Java.EdgeType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: {namespace: ['java', 'net'], edgeName: 'URI'},
              })),
              new Java.Identifier('create'),
            ),
            new Java.ArgumentList(
              new Java.Literal('https://google.com'),
            ),
          ),
        ),
      ),
      undefined, true,
    );

    const httpRequestVariableDeclaration = new Java.VariableDeclaration(
      httpRequestIdentifier,
      new Java.MethodCall(
        new Java.MemberAccess(
          new Java.MethodCall(
            new Java.MemberAccess(
              new Java.MethodCall(
                new Java.MemberAccess(
                  new Java.DeclarationReference(httpRequestBuilderDeclaration),
                  new Java.Identifier('header'),
                ),
                new Java.ArgumentList(new Java.Literal('Content-Type'), new Java.Literal('application/json')),
              ),
              new Java.Identifier('POST'),
            ),
            new Java.ArgumentList(
              new Java.MethodCall(
                new Java.MemberAccess(
                  new Java.ClassName(new Java.EdgeType({
                    kind: OmniTypeKind.HARDCODED_REFERENCE,
                    fqn: {namespace: ['java', 'net', 'http', {name: 'HttpRequest', nested: true}], edgeName: 'BodyPublishers'},
                  })),
                  new Java.Identifier('ofString'),
                ),
                new Java.ArgumentList(stringValueIdentifier),
              ),
            ),
          ),
          new Java.Identifier('build'),
        ),
        new Java.ArgumentList(),
      ),
      undefined, true,
    );

    // TODO: Is there some way of outsourcing this to another transformer that can add the type for us?
    const httpClientDeclaration = new Java.VariableDeclaration(
      httpClientIdentifier,
      new Java.MethodCall(
        new Java.MemberAccess(
          new Java.DeclarationReference(httpClientBuilderDeclaration),
          new Java.Identifier('build'),
        ),
        new Java.ArgumentList(),
      ),
      new Java.EdgeType({
        kind: OmniTypeKind.HARDCODED_REFERENCE,
        fqn: {namespace: ['java', 'net', 'http'], edgeName: 'HttpClient'},
      }),
      true,
    );

    const httpResponseVariableDeclaration = new Java.VariableDeclaration(
      httpResponseIdentifier,
      new Java.MethodCall(
        new Java.MemberAccess(
          new Java.DeclarationReference(httpClientDeclaration),
          new Java.Identifier('send'),
        ),
        new Java.ArgumentList(
          new Java.DeclarationReference(httpRequestVariableDeclaration),
          new Java.MethodCall(
            new Java.MemberAccess(
              new Java.ClassName(new Java.EdgeType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: {namespace: ['java', 'net', 'http', {name: 'HttpResponse', nested: true}], edgeName: 'BodyHandlers'},
              } satisfies OmniHardcodedReferenceType)),
              new Java.Identifier('ofString'),
            ),
            new Java.ArgumentList(),
          ),
        ),
      ),
      undefined, true,
    );

    const stringValueDeclaration = new Java.VariableDeclaration(
      stringValueIdentifier,
      new Java.MethodCall(
        new Java.MemberAccess(
          new Java.FieldReference(objectMapperField),
          new Java.Identifier('writeValueAsString'),
        ),
        new Java.ArgumentList(
          new Java.DeclarationReference(requestArgumentDeclaration),
        ),
      ),
      undefined, true,
    );

    return new Java.MethodDeclaration(
      new Java.MethodDeclarationSignature(
        new Java.Identifier('_call'),
        new Java.EdgeType({kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.OBJECT}, false),
        new Java.ParameterList(
          new Java.Parameter(
            new Java.EdgeType({kind: OmniTypeKind.STRING}),
            pathIdentifier,
          ),
          requestArgumentDeclaration,
        ),
        new Java.ModifierList(
          new Java.Modifier(Java.ModifierKind.PRIVATE),
        ),
      ),
      new Java.Block(
        // TODO: This should be refactored out, and instead we should use an abstract node
        //        Which is then based on transformers replaced into a concrete node depending on options

        // NOTE: This should maybe be a variable that is sent in as a constructor variable
        new Java.Statement(httpClientBuilderDeclaration),
        new Java.Statement(httpClientDeclaration),
        new Java.Statement(stringValueDeclaration),
        new Java.Statement(httpRequestBuilderDeclaration),
        new Java.Statement(httpRequestVariableDeclaration),
        new Java.Statement(httpResponseVariableDeclaration),

        new Java.Statement(
          new Java.ReturnStatement(
            new Java.MethodCall(
              new Java.MemberAccess(
                new Java.FieldReference(objectMapperField),
                new Java.Identifier('readValue'),
              ),
              new Java.ArgumentList(
                new Java.MethodCall(
                  new Java.MemberAccess(
                    new Java.DeclarationReference(httpResponseVariableDeclaration),
                    new Java.Identifier('body'),
                  ),
                  new Java.ArgumentList(),
                ),
                new Java.ClassReference(new Java.ClassName(new Java.EdgeType({
                  kind: OmniTypeKind.HARDCODED_REFERENCE,
                  fqn: JACKSON_JSON_NODE,
                }))),
              ),
            ),
          ),
        ),

        // httpRequestIdentifier
      ),
    );

    // ObjectMapper objectMapper = new ObjectMapper();
    // String requestBody = objectMapper
    //   .writerWithDefaultPrettyPrinter()
    //   .writeValueAsString(map);
    //
    // HttpRequest request = HttpRequest.newBuilder(uri)
    //   .header("Content-Type", "application/json")
    //   .POST(BodyPublishers.ofString(requestBody))
    //   .build();
    //
    // return HttpClient.newHttpClient()
    //   .sendAsync(request, BodyHandlers.ofString())
    //   .thenApply(HttpResponse::statusCode)
    //   .thenAccept(System.out::println);
    // return callMethod;
  }

  private addResponseWithQualifiers(
    response: OmniOutput,
    responseDeclaration: Java.Parameter | Java.VariableDeclaration,
    qualifierResultBlock: Java.Block,
  ): Java.Block {

    const ifChecks: Java.IfStatement[] = [];

    for (const qualifier of response.qualifiers) {
      switch (qualifier.operator) {
        case OmniComparisonOperator.DEFINED: {

          ifChecks.push(
            new Java.IfStatement(
              new Java.BinaryExpression(
                new Java.MethodCall(
                  new Java.MemberAccess(
                    new Java.MethodCall(
                      new Java.MemberAccess(new Java.DeclarationReference(responseDeclaration), new Java.Identifier('at')),
                      new Java.ArgumentList(
                        new Java.Literal(`/${qualifier.path.join('/')}`),
                      ),
                    ),
                    new Java.Identifier('isMissingNode'),
                  ),
                  new Java.ArgumentList(),
                ),
                Java.TokenKind.EQUALS,
                new Java.Literal(false),
              ),
              new Java.Block(),
            ),
          );

          break;
        }
        case OmniComparisonOperator.EQUALS: {

          const typeAndValue = this.getTypeAndLiteral(qualifier.value);
          const jsonObjectMethodName = this.getJsonObjectValueGetter(typeAndValue[0]);

          ifChecks.push(
            new Java.IfStatement(
              new Java.BinaryExpression(
                new Java.MethodCall(
                  new Java.MemberAccess(
                    new Java.MethodCall(
                      new Java.MemberAccess(
                        new Java.DeclarationReference(responseDeclaration),
                        new Java.Identifier('at'),
                      ),
                      new Java.ArgumentList(
                        new Java.Literal(`/${qualifier.path.join('/')}`),
                      ),
                    ),
                    new Java.Identifier(jsonObjectMethodName),
                  ),
                  new Java.ArgumentList(),
                ),
                Java.TokenKind.EQUALS,
                new Java.Literal(typeAndValue[1]),
              ),
              new Java.Block(),
            ),
          );

          break;
        }
      }
    }

    for (let i = 0; i < ifChecks.length; i++) {
      qualifierResultBlock.children.push(ifChecks[i]);
      qualifierResultBlock = ifChecks[i].body;
    }
    return qualifierResultBlock;
  }

  private createExceptionThrowingBlock(
    args: JavaHttpArgs,
    converterField: Java.Field,
    fromValueDeclaration: Java.VariableDeclaration | Java.Parameter,
    type: OmniType,
    cuBody: Java.Block,
    throws: Java.TypeList,
  ): Java.Statement[] {

    const result = this.createConverterMethodCall(args.root, converterField, fromValueDeclaration, type);
    const resultVariable = new Java.VariableDeclaration(
      new Java.Identifier('errorResponse'),
      result,
      undefined,
      true,
    );

    const astType = this.getOrCreateExceptionAstType(args, type, cuBody);
    throws.children.push(astType);

    return [
      new Java.Statement(resultVariable),
      new Java.Statement(
        new Java.ThrowStatement(
          new Java.NewStatement(
            astType,
            new Java.ArgumentList(
              new Java.DeclarationReference(resultVariable),
            ),
          ),
        ),
      ),
    ];
  }

  private readonly _typeToExceptionMap = new Map<OmniType, Java.EdgeType>();

  private getOrCreateExceptionAstType(args: JavaHttpArgs, type: OmniType, cuBody: Java.Block): Java.EdgeType {

    const existing = this._typeToExceptionMap.get(type);
    if (existing) {
      return existing;
    }

    const exceptionType: OmniHardcodedReferenceType = {
      kind: OmniTypeKind.HARDCODED_REFERENCE,
      fqn: {namespace: ['java', 'lang'], edgeName: 'Exception'},
    };

    const newExceptionType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: {
        name: OmniUtil.getTypeName(type) || 'Unknown',
        suffix: 'Exception',
      },
      properties: [],
      extendedBy: exceptionType,
    };
    newExceptionType.properties.push({
      kind: OmniItemKind.PROPERTY,
      type: type,
      name: 'body',
      owner: newExceptionType,
      required: true,
      readOnly: true,
      description: 'The error response body object',
    });

    const newExceptionAstType = new Java.EdgeType(newExceptionType, true);

    const newExceptionDeclaration = new Java.ClassDeclaration(
      newExceptionAstType,
      new Java.Identifier(Naming.unwrap(newExceptionType.name)),
      new Java.Block(
      ),
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierKind.PUBLIC),
        new Java.Modifier(Java.ModifierKind.STATIC),
        new Java.Modifier(Java.ModifierKind.FINAL),
      ),
    );

    newExceptionDeclaration.extends = new Java.ExtendsDeclaration(
      new Java.TypeList(args.root.getAstUtils().createTypeNode(exceptionType)),
    );

    cuBody.children.push(newExceptionDeclaration);
    this._typeToExceptionMap.set(type, newExceptionAstType);

    return newExceptionAstType;
  }

  private createConverterMethodCall(
    root: RootAstNode,
    converterField: Java.Field,
    fromValueDeclaration: Java.VariableDeclaration | Java.Parameter,
    type: OmniType,
  ): Java.MethodCall {

    return new Java.MethodCall(
      new Java.MemberAccess(
        new Java.FieldReference(converterField),
        new Java.Identifier('convertValue'),
      ),
      new Java.ArgumentList(
        new Java.DeclarationReference(fromValueDeclaration),
        new Java.ClassReference(new Java.ClassName(root.getAstUtils().createTypeNode(type, false))),
      ),
    );
  }

  private getMethodResponseType(
    args: JavaHttpArgs,
    regularResponses: OmniOutput[],
    errorResponses: OmniOutput[],
  ): TypeNode {

    if (regularResponses.length == 1) {

      if (args.implOptions.onErrorThrowExceptions) {
        return args.root.getAstUtils().createTypeNode(regularResponses[0].type, false);
      } else {
        if (errorResponses.length == 0) {
          return args.root.getAstUtils().createTypeNode(regularResponses[0].type, false);
        } else {
          // TODO: We need to merge the different responses into on container object. An XOR composition.
          //        (and then run the XOR composition transformer over it all)
        }
      }
    } else {
      // TODO: We need to merge the different responses into on container object. An XOR composition.
      //        (and then run the XOR composition transformer over it all)
    }

    if (regularResponses.length == 0) {
      return args.root.getAstUtils().createTypeNode({kind: OmniTypeKind.UNKNOWN}, false);
    }

    return args.root.getAstUtils().createTypeNode(regularResponses[0].type, false);
  }

  private getTypeAndLiteral(value: unknown | undefined): ['null' | 'string' | 'number' | 'boolean', LiteralValue] {

    if (value == undefined) {
      return ['null', null];
    }

    if (value == null) {
      return ['null', null];
    }

    if (typeof value == 'string') {
      return ['string', value];
    }

    if (typeof value == 'number') {
      return ['number', value];
    }

    if (typeof value == 'boolean') {
      return ['boolean', value];
    }

    return ['null', null];
  }

  private getJsonObjectValueGetter(type: 'null' | 'string' | 'number' | 'boolean'): string {
    switch (type) {
      case 'null':
        // TODO: Wrong, needs to be fixed
        return 'asText';
      case 'number':
        // Wrong: Needs to differentiate between integers and doubles, etc
        // TODO: Need to include the expected type with the qualifier, if possible
        return 'asDouble';
      case 'boolean':
        return 'asBoolean';
      case 'string':
        return 'asText';
    }
  }
}
