import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Cs, CSharpRootNode} from '../ast';
import {CSharpOptions, ReadonlyPropertyMode} from '../options';
import {Java, JavaOptions} from '@omnigen/target-java';
import {OmniUtil} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces any fields with properties with a proper getter/setter
 */
export class AddPropertyAccessorForFieldAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & JavaOptions & CSharpOptions>): void {

    const fieldsToReplace: number[] = [];
    const fieldIdToPropertyId = new Map<number, number>();

    args.root.visit({
      ...args.root.createVisitor(),
      visitField: n => {
        if (n.property) {
          fieldsToReplace.push(n.id);
        }
      },
    });

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceField: (n, r) => {

        if (fieldsToReplace.includes(n.id)) {

          const propertyNode = new Cs.PropertyNode(n.type, new Cs.PropertyIdentifier(n.identifier));
          propertyNode.modifiers = new Java.ModifierList(new Java.Modifier(Java.ModifierType.PUBLIC));
          propertyNode.property = n.property;
          propertyNode.comments = n.comments;

          // C# 6.0: public object MyProperty { get; }
          // C# 9.0: public string Orderid { get; init; } -- NOTE: could be used to skip constructor

          if ((n.property && n.property.readOnly) || args.options.immutableModels) {

            if (!args.options.immutableModels && args.options.csharpReadonlyPropertySetterMode === ReadonlyPropertyMode.PRIVATE) {
              propertyNode.setModifiers = new Java.ModifierList(new Java.Modifier(Java.ModifierType.PRIVATE));
            }

            propertyNode.immutable = true;
          }

          if (n.initializer) {

            // C# 6.0:
            // { get; set; } = initializer
            propertyNode.initializer = n.initializer;

            if (!propertyNode.immutable && OmniUtil.isPrimitive(n.type.omniType) && n.type.omniType.literal) {

              // If the property is not immutable, but the value is a const/literal, then just make it immutable for clarity.
              propertyNode.immutable = true;
            }
          }

          fieldIdToPropertyId.set(n.id, propertyNode.id);

          return propertyNode;
        }

        return n;
      },
      reduceFieldReference: (n, r) => {

        if (fieldsToReplace.includes(n.targetId)) {

          // Replace the field reference with a property reference.
          const propertyNodeId = fieldIdToPropertyId.get(n.targetId);
          if (propertyNodeId === undefined) {
            throw new Error(`Could not find the property node for field id ${n.targetId}`);
          }

          return new Cs.PropertyReference(propertyNodeId);
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
