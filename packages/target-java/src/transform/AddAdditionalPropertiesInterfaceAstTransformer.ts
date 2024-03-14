import {OmniInterfaceType, OmniObjectType, OmniTypeKind} from '@omnigen/core';
import {JavaUtil} from '../util';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs, JavaAstUtils} from '../transform';
import * as Java from '../ast';
import {Naming, VisitorFactoryManager} from '@omnigen/core-util';
import {AdditionalPropertiesDeclaration} from '../ast/AdditionalPropertiesDeclaration.ts';

export class AddAdditionalPropertiesInterfaceAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const currentClassDeclaration: { obj?: Java.ClassDeclaration | undefined } = {};
    type AddType = {classDeclaration: Java.ClassDeclaration, node: AdditionalPropertiesDeclaration};
    const additions: AddType[] = [];
    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitClassDeclaration: (node, visitor) => {
        currentClassDeclaration.obj = node;
        AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor);
        currentClassDeclaration.obj = undefined;
      },

      visitAdditionalPropertiesDeclaration: node => {

        if (currentClassDeclaration.obj) {
          additions.push({classDeclaration: currentClassDeclaration.obj, node: node});
        }
      },
    }));

    if (additions.length >= args.options.additionalPropertiesInterfaceAfterDuplicateCount) {

      const additionalPropertiesObjectType: OmniObjectType = {
        kind: OmniTypeKind.OBJECT,
        properties: [],
        name: 'IAdditionalProperties',
      };

      additionalPropertiesObjectType.properties.push({
        // TODO: Wrong! Should have one interface per map type, or use common denominator
        type: additions[0].node.mapType,
        name: 'additionalProperties',
        owner: additionalPropertiesObjectType,
      });

      const interfaceType: OmniInterfaceType = {
        kind: OmniTypeKind.INTERFACE,
        name: 'IAdditionalProperties',
        of: additionalPropertiesObjectType,
      };

      const createdInterface = new Java.InterfaceDeclaration(
        JavaAstUtils.createTypeNode(interfaceType, false),
        new Java.Identifier(Naming.unwrap(interfaceType.name ?? additionalPropertiesObjectType.name)),
        new Java.Block(),
      );

      JavaAstUtils.addInterfaceProperties(interfaceType, createdInterface.body);

      for (const addTo of additions) {
        if (!addTo.classDeclaration.implements) {
          addTo.classDeclaration.implements = new Java.ImplementsDeclaration(
            new Java.TypeList([]),
          );
        }

        addTo.classDeclaration.implements.types.children.push(
          createdInterface.type,
        );
      }

      args.root.children.push(new Java.CompilationUnit(
        new Java.PackageDeclaration(
          JavaUtil.getPackageName(createdInterface.type.omniType, createdInterface.name.value, args.options),
        ),
        new Java.ImportList([]),
        createdInterface,
      ));
    }
  }
}
