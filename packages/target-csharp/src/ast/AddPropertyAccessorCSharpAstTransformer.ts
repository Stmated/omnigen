import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Cs, CSharpRootNode} from '../ast';
import {CSharpOptions, ReadonlyPropertyMode} from '../options';
import {OmniUtil} from '@omnigen/core-util';
import {Code} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces any fields with properties with a proper getter/setter
 */
export class AddPropertyAccessorCSharpAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>): void {

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

    // TODO: If we add a property node for a field, then if there is an interface with a getter for that field, then we need to replace it as well!

    // Step1, replace fields with properties
    const root1 = args.root.reduce({
      ...args.root.createReducer(),
      reduceField: n => {

        if (!fieldsToReplace.includes(n.id)) {
          return n;
        }

        const propertyNode = new Cs.PropertyNode(n.type, new Cs.PropertyIdentifier(n.identifier));
        propertyNode.modifiers = new Code.ModifierList(new Code.Modifier(Code.ModifierType.PUBLIC));
        propertyNode.property = n.property;
        propertyNode.comments = n.comments;

        // C# 6.0: public object MyProperty { get; }
        // C# 9.0: public string Orderid { get; init; } -- NOTE: could be used to skip constructor

        if ((n.property && n.property.readOnly) || args.options.immutableModels) {

          if (!args.options.immutableModels && args.options.csharpReadonlyPropertySetterMode === ReadonlyPropertyMode.PRIVATE) {
            propertyNode.setModifiers = new Code.ModifierList(new Code.Modifier(Code.ModifierType.PRIVATE));
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
      },
    });

    if (!root1) {
      return;
    }

    // Step2, replace field references with property references.
    const root2 = root1.reduce({
      ...root1.createReducer(),
      reduceFieldReference: n => {

        if (fieldsToReplace.includes(n.targetId)) {

          // Replace the field reference with a property reference.
          const propertyNodeId = fieldIdToPropertyId.get(n.targetId);
          if (propertyNodeId === undefined) {
            return n;
          }

          return new Cs.PropertyReference(propertyNodeId);
        }

        return n;
      },
    });

    if (root2) {
      args.root = root2;
    }
  }
}
