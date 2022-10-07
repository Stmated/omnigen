import {
  OmniInterfaceType, OmniModel, OmniObjectType, OmniTypeKind,
  Naming, VisitorFactoryManager, RealOptions, ExternalSyntaxTree
} from '@omnigen/core';
import {JavaUtil} from '../util';
import {IJavaOptions} from '../options';
import {JavaAstUtils, AbstractJavaAstTransformer} from '../transform';
import * as Java from '../ast';

export class AdditionalPropertiesInterfaceAstTransformer extends AbstractJavaAstTransformer {

  transformAst(
    _model: OmniModel,
    root: Java.JavaAstRootNode,
    _externals: ExternalSyntaxTree<Java.JavaAstRootNode, IJavaOptions>[],
    options: RealOptions<IJavaOptions>
  ): Promise<void> {

    const createdInterface: { obj?: Java.InterfaceDeclaration } = {};
    const currentClassDeclaration: { obj?: Java.ClassDeclaration } = {};
    root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer._javaVisitor, {

      visitClassDeclaration: (node, visitor) => {
        currentClassDeclaration.obj = node;
        AbstractJavaAstTransformer._javaVisitor.visitClassDeclaration(node, visitor);
        currentClassDeclaration.obj = undefined;
      },

      visitAdditionalPropertiesDeclaration: (node) => {

        if (!createdInterface.obj) {

          // TODO: It would be beneficial if we could add "methods" to interfaces.
          //        That way we could also add the "addAdditionalProperty" method to the interface.
          const additionalPropertiesObjectType: OmniObjectType = {
            kind: OmniTypeKind.OBJECT,
            properties: [],
            name: 'IAdditionalProperties'
          };

          additionalPropertiesObjectType.properties.push({
            type: node.mapType,
            name: 'additionalProperties',
            owner: additionalPropertiesObjectType
          });

          const interfaceType: OmniInterfaceType = {
            kind: OmniTypeKind.INTERFACE,
            name: 'IAdditionalProperties',
            of: additionalPropertiesObjectType,
          };

          createdInterface.obj = new Java.InterfaceDeclaration(
            JavaAstUtils.createTypeNode(interfaceType, false),
            new Java.Identifier(Naming.safe([interfaceType.name, additionalPropertiesObjectType.name])),
            new Java.Block()
          );

          JavaAstUtils.addInterfaceProperties(interfaceType, createdInterface.obj.body);
        }

        if (currentClassDeclaration.obj) {
          if (!currentClassDeclaration.obj.implements) {
            currentClassDeclaration.obj.implements = new Java.ImplementsDeclaration(
              new Java.TypeList([])
            );
          }

          currentClassDeclaration.obj.implements.types.children.push(
            createdInterface.obj.type
          );
        }

        // Add the interface to the class declaration, if it does not already exist
      }
    }));

    const obj = createdInterface.obj;
    if (obj) {
      root.children.push(new Java.CompilationUnit(
        new Java.PackageDeclaration(
          JavaUtil.getPackageName(obj.type.omniType, obj.name.value, options)
        ),
        new Java.ImportList([]),
        obj
      ));
    }

    return Promise.resolve(undefined);
  }
}
