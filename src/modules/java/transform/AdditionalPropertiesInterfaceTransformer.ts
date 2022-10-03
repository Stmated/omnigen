import {AbstractJavaCstTransformer} from '@java/transform/AbstractJavaCstTransformer';
import {OmniInterfaceType, OmniModel, OmniObjectType, OmniTypeKind} from '@parse';
import {IJavaOptions, JavaUtil} from '@java';
import * as Java from '@java/cst';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {JavaCstUtils} from '@java/transform/JavaCstUtils';
import {Naming} from '@parse/Naming';
import {RealOptions} from '@options';
import {ExternalSyntaxTree} from '@transform';

export class AdditionalPropertiesInterfaceTransformer extends AbstractJavaCstTransformer {

  transformCst(
    model: OmniModel,
    root: Java.JavaCstRootNode,
    externals: ExternalSyntaxTree<Java.JavaCstRootNode, IJavaOptions>[],
    options: RealOptions<IJavaOptions>
  ): Promise<void> {

    const createdInterface: {obj?: Java.InterfaceDeclaration} = {};
    const currentClassDeclaration: {obj?: Java.ClassDeclaration} = {};
    root.visit(VisitorFactoryManager.create(AbstractJavaCstTransformer._javaVisitor, {

      visitClassDeclaration: (node, visitor) => {
        currentClassDeclaration.obj = node;
        AbstractJavaCstTransformer._javaVisitor.visitClassDeclaration(node, visitor);
        currentClassDeclaration.obj = undefined;
      },

      visitAdditionalPropertiesDeclaration: (node, visitor) => {

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
            JavaCstUtils.createTypeNode(interfaceType, false),
            new Java.Identifier(Naming.safe([interfaceType.name, additionalPropertiesObjectType.name])),
            new Java.Block()
          );

          JavaCstUtils.addInterfaceProperties(interfaceType, createdInterface.obj.body);
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
