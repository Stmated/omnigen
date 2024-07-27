import {LoggerFactory} from '@omnigen/core-log';
import {
  AstTransformer,
  AstTransformerArguments,
  OmniTypeKind,
  PackageOptions,
  TargetOptions,
} from '@omnigen/core';
import {Cs, CSharpRootNode} from '../ast';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces any enum that has non-numeric item values with a class with static members, since languages like C# does not support non-numeric enums.
 *
 * If possible it will also try to use an enumeration class, either referring to an existing one as a setting or building one.
 */
export class NonNumericEnumToConstClassAstTransformer implements AstTransformer<CSharpRootNode, PackageOptions & TargetOptions> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions>): void {

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceEnumDeclaration: (n, r) => {
        // See `JsonCSharpAstTransformer` for specific additions on enum declarations, for specific enum libraries.
        return defaultReducer.reduceEnumDeclaration(n, r);
      },
      reduceEnumItem: n => {

        if (n.value && n.value.primitiveKind === OmniTypeKind.STRING) {

          if (!n.annotations) {
            n.annotations = new Cs.AnnotationList();
          }

          n.annotations.children.push(new Cs.Annotation(
            new Cs.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System', 'Runtime', 'Serialization'], edgeName: {onUse: 'EnumMember', onImport: 'EnumMemberAttribute'}}}),
            new Cs.AnnotationKeyValuePairList(
              new Cs.AnnotationKeyValuePair(
                new Cs.Identifier('Value'),
                new Cs.Literal(`${n.value.value}`),
              ),
            ),
          ));

          n.value = undefined;
        }

        return n;
      },
      // reduceProperty: (n, r) => {
      //
      //   if (n.type.omniType.kind === OmniTypeKind.ENUM) { // } && n.type.omniType.itemKind === OmniTypeKind.STRING) {
      //
      //     this.addEnumJsonAttribute(n);
      //     return n;
      //   }
      //
      //   return n;
      // },
      // reduceField: (n, r) => {
      //
      //   if (n.type.omniType.kind === OmniTypeKind.ENUM) { // } && n.type.omniType.itemKind === OmniTypeKind.STRING) {
      //
      //     this.addEnumJsonAttribute(n);
      //     return n;
      //   }
      //
      //   return n;
      // },
    });

    if (newRoot) {
      args.root = newRoot;
    }

    // const enumerationClass = this.createEnumerationClass(args);
    //
    // const enumsToReplace: OmniEnumType[] = [];
    // const enumToNode = new Map<OmniType, AstNode>();
    //
    // args.root.visit({
    //   ...args.root.createVisitor(),
    //   visitEnumDeclaration: n => {
    //     if (!OmniUtil.isNumericKind(n.type.omniType.itemKind)) {
    //       enumsToReplace.push(n.type.omniType);
    //     }
    //   },
    // });
    //
    // const defaultReducer = args.root.createReducer();
    // let newRoot = args.root.reduce({
    //   ...defaultReducer,
    //   reduceEnumDeclaration: (n, r) => {
    //
    //     const t = n.omniType;
    //     if (enumsToReplace.includes(t)) {
    //       return this.createEnumAlternative(n, args, r, enumToNode);
    //     }
    //
    //     return defaultReducer.reduceEnumDeclaration(n, r);
    //   },
    // });
    //
    // if (!newRoot) {
    //   return undefined;
    // }
    //
    // // 2 passes, since we need to have replaced the ENUMs first.
    // newRoot = newRoot.reduce({
    //   ...defaultReducer,
    //   // reduceField(n, r) {
    //   //
    //   //   const reduced = defaultReducer.reduceField(n, r);
    //   //
    //   //   // if (reduced && reduced instanceof Code.Field) {
    //   //   //
    //   //   //   const actualType = OmniUtil.getUnwrappedType(n.type.omniType);
    //   //   //   const node = enumToNode.get(actualType);
    //   //   //
    //   //   //   if (node) {
    //   //   //     const newComment = new Code.FreeTextTypeLink(node);
    //   //   //     reduced.comments = new Code.Comment(FreeTextUtils.add(reduced.comments?.text, newComment), reduced.comments?.kind);
    //   //   //   }
    //   //   // }
    //   //
    //   //   return reduced;
    //   // },
    //   // reduceEdgeType(n, r) {
    //   //
    //   //   // Likely not the best comparison since the omni type might be wrapped or transformed. But will do for now.
    //   //   const actualType = OmniUtil.getUnwrappedType(n.omniType);
    //   //   if (actualType.kind === OmniTypeKind.ENUM && enumsToReplace.some(it => it === actualType)) {
    //   //
    //   //     const itemType: OmniPrimitiveType = {
    //   //       kind: actualType.itemKind,
    //   //     };
    //   //
    //   //     OmniUtil.copyTypeMeta(n.omniType, itemType);
    //   //
    //   //     return args.root.getAstUtils().createTypeNode(itemType);
    //   //   }
    //   //
    //   //   return defaultReducer.reduceEdgeType(n, r);
    //   // },
    // });
    //
    // if (newRoot) {
    //   args.root = newRoot;
    // }
  }

  // private addEnumJsonAttribute(n: {annotations?: Cs.AnnotationList | undefined}) {
  //
  //   if (!n.annotations) {
  //     n.annotations = new Cs.AnnotationList();
  //   }
  //
  //   // Newtonsoft.Json.JsonConverterAttribute
  //   // [JsonConverter(typeof(StringEnumConverter))]
  //   n.annotations.children.push(new Cs.Annotation(
  //     new Cs.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonConverter', onImport: 'JsonConverterAttribute'}}}),
  //     new Cs.AnnotationKeyValuePairList(
  //       new Cs.AnnotationKeyValuePair(
  //         undefined,
  //         new Cs.MethodCall(
  //           new Cs.HardCoded('typeof'),
  //           new Cs.ArgumentList(
  //             // ￼ class Newtonsoft.Json.Converters.StringEnumConverter
  //             new Cs.ClassName(new Cs.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['Newtonsoft', 'Json', 'Converters'], edgeName: 'StringEnumConverter'}})),
  //           ),
  //         ),
  //       ),
  //     ),
  //   ));
  // }

  // private createEnumAlternative(
  //   original: Cs.EnumDeclaration,
  //   args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions>,
  //   reducer: Reducer<CodeVisitor<any>>,
  //   enumToNode: Map<OmniType, AstNode>,
  // ) {
  //
  //   const enumerationClass = this.createEnumerationClass(args);
  //
  //   // const itemType: OmniPrimitiveType = {
  //   //   kind: n.omniType.itemKind,
  //   //   literal: true,
  //   //   value: item.value.value,
  //   // };
  //
  //   const newBlock = new Code.Block();
  //   const newType = new Code.EdgeType({kind: OmniTypeKind.OBJECT, name: original.name.value, properties: []});
  //   const newClass = new Code.ClassDeclaration(
  //     original.type,
  //     original.name,
  //     newBlock,
  //     original.modifiers.reduce(reducer),
  //     original.genericParameterList,
  //   );
  //
  //   for (const child of original.body.children) {
  //     if (child instanceof Code.EnumItemList) {
  //       for (const item of child.children) {
  //
  //         // const fieldTypeNode = args.root.getAstUtils().createTypeNode(itemType, false);
  //         const field = new Code.Field(
  //           newType, // n.type,
  //           item.identifier,
  //           new Code.ModifierList(
  //             new Code.Modifier(Code.ModifierKind.PUBLIC),
  //             new Code.Modifier(Code.ModifierKind.STATIC),
  //             new Code.Modifier(Code.ModifierKind.READONLY),
  //           ),
  //           new Cs.NewStatement(
  //             newType,
  //             new Cs.ArgumentList(
  //               new Cs.Literal(newBlock.children.length + 1),
  //               item.value ?? new Cs.Literal(null),
  //             ),
  //           ),
  //         );
  //         // field.annotations = new Cs.AnnotationList(
  //         //   new Cs.VirtualAnnotationNode()
  //         // );
  //
  //         // field.initializer = item.value;
  //         newBlock.children.push(field);
  //       }
  //     }
  //   }
  //
  //   const constructorDeclaration = new Cs.ConstructorDeclaration(
  //     new Cs.ConstructorParameterList(
  //       enumerationClass.idParam,
  //       enumerationClass.nameParam,
  //     ),
  //   );
  //   constructorDeclaration.superCall = new Cs.SuperConstructorCall(new Cs.ArgumentList(
  //     enumerationClass.idParam.identifier,
  //     enumerationClass.nameParam.identifier,
  //   ));
  //
  //   newBlock.children.push(constructorDeclaration);
  //
  //   // if (!newClass.modifiers.children.some(it => it.type === Code.ModifierType.STATIC)) {
  //   //   newClass.modifiers.children.push(new Code.Modifier(Code.ModifierType.STATIC));
  //   // }
  //
  //   enumToNode.set(original.type.omniType, new Code.ClassName(original.type));
  //
  //   newClass.comments = original.comments;
  //   newClass.annotations = original.annotations;
  //
  //   newClass.extends = new Cs.ExtendsDeclaration(new Cs.TypeList(enumerationClass?.class.type));
  //   // newClass.implements = n.implements;
  //
  //   return newClass;
  //
  //   // const t = n.omniType;
  //   // const newBlock = new Code.Block();
  //   //
  //   // for (const child of n.body.children) {
  //   //   if (child instanceof Code.EnumItemList) {
  //   //     for (const item of child.children) {
  //   //
  //   //       const itemType: OmniPrimitiveType = {
  //   //         kind: t.itemKind,
  //   //         literal: true,
  //   //         value: item.value.value,
  //   //       };
  //   //
  //   //       const fieldTypeNode = args.root.getAstUtils().createTypeNode(itemType, false);
  //   //       const field = new Code.Field(
  //   //         fieldTypeNode,
  //   //         item.identifier,
  //   //         new Code.ModifierList(
  //   //           new Code.Modifier(Code.ModifierType.PUBLIC),
  //   //           new Code.Modifier(Code.ModifierType.STATIC),
  //   //           new Code.Modifier(Code.ModifierType.FINAL),
  //   //         ),
  //   //       );
  //   //
  //   //       field.initializer = item.value;
  //   //       newBlock.children.push(field);
  //   //     }
  //   //   }
  //   // }
  //   //
  //   // const newClass = new Code.ClassDeclaration(
  //   //   n.type,
  //   //   n.name,
  //   //   newBlock,
  //   //   n.modifiers.reduce(r),
  //   //   n.genericParameterList,
  //   // );
  //   //
  //   // if (!newClass.modifiers.children.some(it => it.type === Code.ModifierType.STATIC)) {
  //   //   newClass.modifiers.children.push(new Code.Modifier(Code.ModifierType.STATIC));
  //   // }
  //   //
  //   // enumToNode.set(n.type.omniType, new Code.ClassName(n.type));
  //   //
  //   // newClass.comments = n.comments;
  //   // newClass.annotations = n.annotations;
  //   //
  //   // // These will most likely break if there ever are any supertypes.
  //   // newClass.extends = n.extends;
  //   // newClass.implements = n.implements;
  //   //
  //   // return newClass;
  // }
  //
  // private static _cachedEnumerationClass: {class: Cs.ClassDeclaration, idParam: Cs.ConstructorParameter, nameParam: Cs.ConstructorParameter} | undefined = undefined;
  //
  // /**
  //  * For an overview of the class which we construct here, see:
  //  * https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/enumeration-classes-over-enum-types
  //  */
  // private createEnumerationClass(
  //   args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions>,
  // ): Exclude<typeof NonNumericEnumToConstClassAstTransformer._cachedEnumerationClass, undefined> {
  //
  //   if (NonNumericEnumToConstClassAstTransformer._cachedEnumerationClass) {
  //     return NonNumericEnumToConstClassAstTransformer._cachedEnumerationClass;
  //   }
  //
  //   const enumerationType = {kind: OmniTypeKind.OBJECT, name: 'Enumeration', properties: []};
  //   const enumerationTypeNode = new Cs.EdgeType(enumerationType);
  //
  //   const enumerableHardcodedType: OmniHardcodedReferenceType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System', 'Collections', 'Generic'], edgeName: 'IEnumerable'}};
  //   const enumerableItemTypeIdentifier: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'T'};
  //   const enumerableGenericSourceType: OmniGenericSourceType = {
  //     kind: OmniTypeKind.GENERIC_SOURCE,
  //     of: enumerableHardcodedType,
  //     sourceIdentifiers: [
  //       enumerableItemTypeIdentifier,
  //     ],
  //   };
  //
  //   const getAllItemGenericSource: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'E', upperBound: enumerationType};
  //   const getAllGenericTargetType: OmniGenericTargetType = {
  //     kind: OmniTypeKind.GENERIC_TARGET,
  //     source: enumerableGenericSourceType,
  //     targetIdentifiers: [
  //       {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, sourceIdentifier: enumerableItemTypeIdentifier, type: getAllItemGenericSource},
  //     ],
  //   };
  //
  //   const equalsObjParam = new Cs.Parameter(new Cs.EdgeType({kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.OBJECT}), new Cs.Identifier('obj'));
  //
  //   const enumerationNameProp = new Cs.PropertyNode(
  //     new Cs.EdgeType({kind: OmniTypeKind.STRING}),
  //     new Cs.Identifier(`Name`),
  //   );
  //   enumerationNameProp.modifiers = new Cs.ModifierList(new Cs.Modifier(Cs.ModifierKind.PUBLIC));
  //   enumerationNameProp.setModifiers = new Cs.ModifierList(new Cs.Modifier(Cs.ModifierKind.PRIVATE));
  //   enumerationNameProp.annotations = new Cs.AnnotationList(
  //     new Cs.VirtualAnnotationNode({kind: VirtualAnnotationKind.SERIALIZATION_VALUE}),
  //   );
  //
  //   const enumerationIdProp = new Cs.PropertyNode(
  //     new Cs.EdgeType({kind: OmniTypeKind.INTEGER}),
  //     new Cs.Identifier(`Id`),
  //   );
  //   enumerationIdProp.modifiers = new Cs.ModifierList(new Cs.Modifier(Cs.ModifierKind.PUBLIC));
  //   enumerationIdProp.setModifiers = new Cs.ModifierList(new Cs.Modifier(Cs.ModifierKind.PRIVATE));
  //
  //   const getAllReturnTypeNode = args.root.getAstUtils().createTypeNode(getAllGenericTargetType) as Cs.GenericType;
  //
  //   // public static System.Collections.Generic.IEnumerable<T> GetAll<T>() where T : Enumeration =>
  //   //   typeof(T)
  //   //     .GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.DeclaredOnly)
  //   //     .Select(f => f.GetValue(null))
  //   //     .Cast<T>();
  //
  //   const eTypeNode = getAllReturnTypeNode.genericArguments[0];
  //   const typeOfE = new Cs.MethodCall(
  //     new Cs.HardCoded('typeof'),
  //     new Cs.ArgumentList(eTypeNode),
  //   );
  //   const bindingFlags = new Cs.ClassName(new Cs.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System', 'Reflection'], edgeName: 'BindingFlags'}}));
  //   const getFieldsCall = new Cs.MethodCall(
  //     new Cs.MemberAccess(typeOfE, new Cs.Identifier('GetFields')),
  //     new Cs.ArgumentList(
  //       new Cs.BinaryExpression(
  //         new Cs.StaticMemberReference(bindingFlags, new Cs.Identifier('Public')),
  //         Cs.TokenKind.BITWISE_OR,
  //         new Cs.BinaryExpression(
  //           new Cs.StaticMemberReference(bindingFlags, new Cs.Identifier('Static')),
  //           Cs.TokenKind.BITWISE_OR,
  //           new Cs.StaticMemberReference(bindingFlags, new Cs.Identifier('DeclaredOnly')),
  //         ),
  //       ),
  //     ),
  //   );
  //   const fieldsVarDec = new Cs.VariableDeclaration(new Cs.Identifier('fields'), getFieldsCall);
  //
  //   const linqEnumerableClassName = new Cs.ClassName(new Cs.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System', 'Linq'], edgeName: 'Enumerable'}}));
  //   const selectCall = new Cs.MethodCall(
  //     new Cs.StaticMemberReference(
  //       linqEnumerableClassName,
  //       new Cs.Identifier('Select'),
  //     ),
  //     new Cs.ArgumentList(
  //       new Cs.DeclarationReference(fieldsVarDec),
  //       // TODO: This should be converted into an actual `Lambda` node
  //       new Cs.HardCoded(`f => f.GetValue(null)`),
  //     ),
  //   );
  //   const castCall = new Cs.MethodCall(
  //     new Cs.StaticMemberReference(
  //       linqEnumerableClassName,
  //       new Cs.Identifier('Cast'),
  //     ),
  //     // new Cs.MemberAccess(selectCall, new Cs.Identifier('Cast')),
  //     new Cs.ArgumentList(selectCall),
  //     new Cs.ArgumentList(eTypeNode),
  //   );
  //
  //   // var fields = typeof(E).GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly);
  //   // return System.Linq.Enumerable.Cast<E>(System.Linq.Enumerable.Select(fields, f => f.GetValue(null)));
  //
  //   // For the 'Select' call to work we need to import namespace `System.Linq`
  //
  //   const enumerationGetAllMethod = new Cs.MethodDeclaration(
  //     new Cs.MethodDeclarationSignature(
  //       new Cs.Identifier(`GetAll`),
  //       getAllReturnTypeNode,
  //       new Cs.ParameterList(),
  //       new Cs.ModifierList(
  //         new Cs.Modifier(Cs.ModifierKind.PUBLIC),
  //         new Cs.Modifier(Cs.ModifierKind.STATIC),
  //       ),
  //       undefined,
  //       undefined,
  //       undefined,
  //       new Cs.GenericTypeDeclarationList(
  //         // TODO: This feels odd/off, should we actually need to specify any identifier? Should it not always just be the generic source placeholder name?
  //         new Cs.GenericTypeDeclaration(new Cs.Identifier('E'), getAllItemGenericSource, enumerationTypeNode),
  //       ),
  //     ),
  //     new Cs.Block(
  //       new Cs.Statement(fieldsVarDec),
  //       new Cs.Statement(new Cs.ReturnStatement(castCall)),
  //     ),
  //   );
  //
  //   // public int CompareTo(object other) => Id.CompareTo(((Enumeration)other).Id);
  //   const compareToOtherParameter = new Cs.Parameter(new Cs.EdgeType({kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.OBJECT}), new Cs.Identifier('other'));
  //   const enumerationCompareToMethod = new Cs.MethodDeclaration(
  //     new Cs.MethodDeclarationSignature(
  //       new Cs.Identifier(`CompareTo`),
  //       new Cs.EdgeType({kind: OmniTypeKind.INTEGER}),
  //       new Cs.ParameterList(
  //         compareToOtherParameter,
  //       ),
  //       new Cs.ModifierList(
  //         new Cs.Modifier(Cs.ModifierKind.PUBLIC),
  //       ),
  //     ),
  //     new Cs.Block(
  //       new Cs.Statement(new Cs.ReturnStatement(
  //         new Cs.MethodCall(
  //           new Cs.MemberAccess(new Cs.PropertyReference(enumerationIdProp), new Cs.Identifier('CompareTo')),
  //           new Cs.ArgumentList(
  //             new Cs.MemberAccess(
  //               new Cs.Cast(enumerationTypeNode, new Cs.DeclarationReference(compareToOtherParameter)),
  //               new Cs.Identifier('Id'),
  //             ),
  //           ),
  //         ),
  //       )),
  //     ),
  //   );
  //
  //   const otherValueIdentifier = new Cs.Identifier('otherValue');
  //   const selfGetTypeCall = new Cs.MethodCall(new Cs.MemberAccess(new Cs.SelfReference(), new Cs.Identifier('GetType')));
  //
  //   const enumerationEqualsMethod = new Cs.MethodDeclaration(
  //     new Cs.MethodDeclarationSignature(
  //       new Cs.Identifier(`Equals`),
  //       new Cs.EdgeType({kind: OmniTypeKind.BOOL}),
  //       new Cs.ParameterList(
  //         equalsObjParam,
  //       ),
  //       new Cs.ModifierList(
  //         new Cs.Modifier(Cs.ModifierKind.PUBLIC),
  //         new Cs.Modifier(Cs.ModifierKind.OVERRIDE),
  //       ),
  //     ),
  //     new Cs.Block(
  //       // => if (obj is not Enumeration) return false;
  //       new Cs.IfStatement(
  //         new Cs.BinaryExpression(
  //           new Cs.InstanceOf(new Cs.DeclarationReference(equalsObjParam), enumerationTypeNode, otherValueIdentifier),
  //           Cs.TokenKind.EQUALS,
  //           new Cs.Literal(false),
  //         ),
  //         new Cs.Block(
  //           new Cs.Statement(new Cs.ReturnStatement(new Cs.Literal(false))),
  //         ),
  //       ),
  //       // => return GetType().Equals(obj.GetType()) && Id.Equals(otherValue.Id);
  //       new Cs.Statement(new Cs.ReturnStatement(
  //         new Cs.BinaryExpression(
  //           new Cs.MethodCall(
  //             new Cs.MemberAccess(selfGetTypeCall, new Cs.Identifier('Equals')),
  //             new Cs.ArgumentList(
  //               new Cs.MethodCall(new Cs.MemberAccess(new Cs.DeclarationReference(equalsObjParam), new Cs.Identifier('GetType'))),
  //             ),
  //           ),
  //           Cs.TokenKind.AND,
  //           new Cs.MethodCall(
  //             new Cs.MemberAccess(new Cs.PropertyReference(enumerationIdProp), new Cs.Identifier('Equals')),
  //             new Cs.ArgumentList(
  //               new Cs.MemberAccess(otherValueIdentifier, new Cs.Identifier('Id')),
  //             ),
  //           ),
  //         ),
  //       )),
  //     ),
  //   );
  //
  //   // => public override int GetHashCode() => return this.GetType().GetHashCode() + Id.GetHashCode();
  //   const enumerationHashCodeMethod = new Cs.MethodDeclaration(
  //     new Cs.MethodDeclarationSignature(
  //       new Cs.Identifier(`GetHashCode`),
  //       new Cs.EdgeType({kind: OmniTypeKind.INTEGER}),
  //       new Cs.ParameterList(),
  //       new Cs.ModifierList(
  //         new Cs.Modifier(Cs.ModifierKind.PUBLIC),
  //         new Cs.Modifier(Cs.ModifierKind.OVERRIDE),
  //       ),
  //     ),
  //     new Cs.Block(
  //       new Cs.Statement(new Cs.ReturnStatement(
  //         new Cs.BinaryExpression(
  //           new Cs.MethodCall(new Cs.MemberAccess(selfGetTypeCall, new Cs.Identifier('GetHashCode'))),
  //           Cs.TokenKind.ADD,
  //           new Cs.MethodCall(new Cs.MemberAccess(new Cs.PropertyReference(enumerationIdProp), new Cs.Identifier('GetHashCode'))),
  //         ),
  //       )),
  //     ),
  //   );
  //
  //   const idConstructorParam = new Cs.ConstructorParameter(new Cs.PropertyReference(enumerationIdProp), enumerationIdProp.type, new Cs.Identifier('id'));
  //   const nameConstructorParam = new Cs.ConstructorParameter(new Cs.PropertyReference(enumerationNameProp), enumerationNameProp.type, new Cs.Identifier('name'));
  //   const constructor = new Cs.ConstructorDeclaration(
  //     new Cs.ConstructorParameterList(idConstructorParam, nameConstructorParam),
  //     new Cs.Block(
  //       new Cs.Statement(new Cs.BinaryExpression(new Cs.PropertyReference(enumerationIdProp), Cs.TokenKind.ASSIGN, new Cs.DeclarationReference(idConstructorParam))),
  //       new Cs.Statement(new Cs.BinaryExpression(new Cs.PropertyReference(enumerationNameProp), Cs.TokenKind.ASSIGN, new Cs.DeclarationReference(nameConstructorParam))),
  //     ),
  //   );
  //
  //   const enumerationClass = new Cs.ClassDeclaration(
  //     enumerationTypeNode,
  //     new Cs.Identifier(`Enumeration`),
  //     new Cs.Block(
  //       enumerationNameProp,
  //       enumerationIdProp,
  //       constructor,
  //       enumerationGetAllMethod,
  //       enumerationEqualsMethod,
  //       enumerationHashCodeMethod,
  //       enumerationCompareToMethod,
  //     ),
  //     new Cs.ModifierList(
  //       new Cs.Modifier(Cs.ModifierKind.PUBLIC),
  //       new Cs.Modifier(Cs.ModifierKind.ABSTRACT),
  //     ),
  //   );
  //
  //   const comparableHardcodedType: OmniHardcodedReferenceType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System'], edgeName: 'IComparable'}};
  //   enumerationClass.extends = new Cs.ExtendsDeclaration(new Cs.TypeList(
  //     args.root.getAstUtils().createTypeNode(comparableHardcodedType),
  //   ));
  //
  //   args.root.children.push(new Cs.CompilationUnit(
  //     new Cs.PackageDeclaration(args.options.package),
  //     new Cs.ImportList([]),
  //     enumerationClass,
  //   ));
  //
  //   NonNumericEnumToConstClassAstTransformer._cachedEnumerationClass = {
  //     class: enumerationClass,
  //     idParam: idConstructorParam,
  //     nameParam: nameConstructorParam,
  //   };
  //
  //   return NonNumericEnumToConstClassAstTransformer._cachedEnumerationClass;
  // }
}
