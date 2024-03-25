import {OmniInterfaceType, OmniObjectType, OmniTypeKind} from '@omnigen/core';
import {JavaUtil} from '../util';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs, JavaAstUtils} from '../transform';
import * as Java from '../ast';
import {Naming, OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

export class AddAdditionalPropertiesInterfaceAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    // const classDecStack: Java.ClassDeclaration[] = [];
    // type AddType = {classDeclaration: Java.ClassDeclaration, field: Java.Field};
    // const additions: AddType[] = [];
    //
    // const defaultVisitor = args.root.createVisitor();
    // args.root.visit(VisitorFactoryManager.create(defaultVisitor, {
    //
    //   visitClassDeclaration: (node, visitor) => {
    //     try {
    //       classDecStack.push(node);
    //       defaultVisitor.visitClassDeclaration(node, visitor);
    //     } finally {
    //       classDecStack.pop();
    //     }
    //   },
    //
    //   visitField: (n, v) => {
    //
    //     if (n.property && OmniUtil.isPatternPropertyName(n.property.name)) {
    //
    //       const currentClassDec = classDecStack[classDecStack.length - 1];
    //       additions.push({classDeclaration: currentClassDec, field: n});
    //     }
    //   },
    // }));
    //
    // if (additions.length >= args.options.additionalPropertiesInterfaceAfterDuplicateCount) {
    //
    //   const additionalPropertiesObjectType: OmniObjectType = {
    //     kind: OmniTypeKind.OBJECT,
    //     properties: [],
    //     name: 'IAdditionalProperties',
    //   };
    //
    //   // const additionalPropertiesField = additions[0].field.children.find(it => it instanceof Java.Field);
    //   // if (!additionalPropertiesField || !(additionalPropertiesField instanceof Java.Field)) {
    //   //   throw new Error(`There was no field found inside the additional properties node, some code refactoring must have removed it`);
    //   // }
    //
    //   // additionalPropertiesObjectType.properties.push({
    //   //   // TODO: Wrong! Should have one interface per map type, or use common denominator. Right now there might be additional properties that collide
    //   //   type: additionalPropertiesField.type.omniType,
    //   //   name: 'additionalProperties',
    //   //   owner: additionalPropertiesObjectType,
    //   // });
    //   //
    //
    //   // TODO: Need some way to "restrict" this interface to only be able to have the additionalProperties field(s) lifted to its level
    //   const interfaceType: OmniInterfaceType = {
    //     kind: OmniTypeKind.INTERFACE,
    //     name: 'IAdditionalProperties',
    //     of: additionalPropertiesObjectType,
    //   };
    //
    //   const createdInterface = new Java.InterfaceDeclaration(
    //     JavaAstUtils.createTypeNode(interfaceType, false),
    //     new Java.Identifier(Naming.unwrap(interfaceType.name ?? additionalPropertiesObjectType.name)),
    //     new Java.Block(),
    //   );
    //
    //   JavaAstUtils.addInterfaceProperties(interfaceType, createdInterface.body);
    //
    //   for (const addTo of additions) {
    //     if (!addTo.classDeclaration.implements) {
    //       addTo.classDeclaration.implements = new Java.ImplementsDeclaration(
    //         new Java.TypeList([]),
    //       );
    //     }
    //
    //     addTo.classDeclaration.implements.types.children.push(
    //       createdInterface.type,
    //     );
    //   }
    //
    //   args.root.children.push(new Java.CompilationUnit(
    //     new Java.PackageDeclaration(
    //       JavaUtil.getPackageName(createdInterface.type.omniType, createdInterface.name.value, args.options),
    //     ),
    //     new Java.ImportList([]),
    //     createdInterface,
    //   ));
    // }
  }
}
