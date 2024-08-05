import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, OmniProperty, PackageOptions, TargetOptions} from '@omnigen/api';
import {Cs, CSharpRootNode} from '../ast';
import {CSharpOptions, ReadonlyPropertyMode} from '../options';
import {OmniUtil} from '@omnigen/core';
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
      visitFieldBackedSetter: n => {
        // NOTE: These two getter/setter might not be properly translated, since it does not check any readable+writable flags. Not needed yet, but will need to be done eventually.
        fieldsToReplace.push(n.fieldRef.targetId);
      },
      visitFieldBackedGetter: n => {
        fieldsToReplace.push(n.fieldRef.targetId);
      },
    });

    let interfaceDepth = 0;

    // Step1, replace fields with properties
    const defaultReducer = args.root.createReducer();
    const root1 = args.root.reduce({
      ...defaultReducer,
      reduceInterfaceDeclaration: (n, r) => {
        try {
          interfaceDepth++;
          return defaultReducer.reduceInterfaceDeclaration(n, r);
        } finally {
          interfaceDepth--;
        }
      },
      reduceMethodDeclaration: n => {

        if (!n.body && n.signature.identifier instanceof Code.GetterIdentifier) {

          const propertyNode = this.createPropertyNode(args, n.signature.type, n.signature.identifier.identifier, undefined, n.signature.comments, undefined, n.signature.annotations);

          // Remove any modifiers, since we're inside an interface.
          if (interfaceDepth > 0) {
            propertyNode.modifiers = new Code.ModifierList();
          } else {
            if (!propertyNode.modifiers) {
              propertyNode.modifiers = new Code.ModifierList();
            }
            if (!propertyNode.modifiers.children.some(it => it.kind === Code.ModifierKind.ABSTRACT)) {
              propertyNode.modifiers.children.push(new Code.Modifier(Code.ModifierKind.ABSTRACT));
            }
          }

          return propertyNode;
        }

        return n;
      },
      reduceFieldBackedGetter: () => {
        // NOTE: These two removals are too simple. They do not transform any references to them. Not needed yet, but will need to be done eventually.
        return undefined;
      },
      reduceFieldBackedSetter: () => {
        return undefined;
      },
      reduceField: n => {

        if (!fieldsToReplace.includes(n.id)) {
          return n;
        }

        const propertyNode = this.createPropertyNode(args, n.type, n.identifier, n.property, n.comments, n.initializer, n.annotations);
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

  private createPropertyNode(
    args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>,
    type: Code.TypeNode,
    identifier: Code.Identifier,
    property: OmniProperty | undefined,
    comments: Code.Comment | undefined,
    initializer: Code.AbstractCodeNode | undefined,
    annotations: Code.AnnotationList | undefined,
  ) {

    const propertyIdentifier = this.getPropertyIdentifier(property, identifier);
    const propertyNode = new Cs.PropertyNode(type, propertyIdentifier);
    propertyNode.modifiers = new Code.ModifierList(new Code.Modifier(Code.ModifierKind.PUBLIC));
    propertyNode.property = property;
    propertyNode.comments = comments;
    propertyNode.annotations = annotations;

    // C# 6.0: public object MyProperty { get; }
    // C# 9.0: public string Orderid { get; init; } -- NOTE: could be used to skip constructor

    if (property?.readOnly === true || (property?.readOnly === undefined && args.options.immutable)) {

      if (!args.options.immutable && args.options.csharpReadonlyPropertySetterMode === ReadonlyPropertyMode.PRIVATE) {
        propertyNode.setModifiers = new Code.ModifierList(new Code.Modifier(Code.ModifierKind.PRIVATE));
      }

      propertyNode.immutable = true;
    }

    if (initializer) {

      // C# 6.0:
      // { get; set; } = initializer
      propertyNode.initializer = initializer;

      if (!propertyNode.immutable && OmniUtil.isPrimitive(type.omniType) && type.omniType.literal) {

        // If the property is not immutable, but the value is a const/literal, then just make it immutable for clarity.
        propertyNode.immutable = true;
      }
    }

    return propertyNode;
  }

  private getPropertyIdentifier(property: OmniProperty | undefined, identifier: Code.Identifier): Code.Identifier | Cs.PropertyIdentifier {

    if (property) {

      const accessorName = OmniUtil.getPropertyAccessorNameOnly(property.name);
      if (accessorName) {
        return new Cs.Identifier(accessorName);
      }
    }

    return new Cs.PropertyIdentifier(identifier);
  }
}
