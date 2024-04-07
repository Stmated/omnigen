import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, OmniInterfaceType, OmniTypeKind, RootAstNode, TypeNode} from '@omnigen/core';
import {Java, JavaAstUtils} from '@omnigen/target-java';
import {TsRootNode} from './TsRootNode.ts';
import {TypeScriptAstTransformerArgs} from './TypeScriptAstVisitor.ts';
import {Case, OmniUtil} from '@omnigen/core-util';
import {TsAstUtils} from './TsAstUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

const IGNORED_MODIFIERS = [Java.ModifierType.PRIVATE, Java.ModifierType.PUBLIC, Java.ModifierType.ABSTRACT];
const IGNORED_INTERFACE_MODIFIERS = [Java.ModifierType.ABSTRACT];

/**
 * TODO: Perhaps move this into an earlier 2nd stage model transformer
 */
export class ClassToInterfaceTypeScriptAstTransformer implements AstTransformer<TsRootNode> {

  transformAst(args: TypeScriptAstTransformerArgs): void {

    if (!args.options.preferInterfaces) {
      return;
    }

    const defaultReducer = args.root.createReducer();
    const fieldNamesStack: string[][] = [];

    const classToInterfaceMap = new Map<TypeNode, TypeNode>();
    const newInterfaces: TypeNode[] = [];

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceClassDeclaration: (n, r) => {
        try {
          fieldNamesStack.push([]);
          const body = n.body.reduce(r) ?? new Java.Block();

          const modifiers = n.modifiers.children.filter(it => !IGNORED_INTERFACE_MODIFIERS.includes(it.type));

          // TODO: Add support for generic parameters
          // TODO: Add support for better "implements", which actually targets an existing type node

          const newInterface = new Java.InterfaceDeclaration(n.type, n.name, body, new Java.ModifierList(...modifiers)).setId(n.id);

          // TODO: Need to be able to just copy these over -- should be the same as the class one, no?
          // TODO: Need to properly convert the nested generic parameters into the interface versions
          newInterface.genericParameterList = n.genericParameterList;

          const interfaces: TypeNode[] = [];

          if (n.implements) {

            for (const child of n.implements.types.children) {


              interfaces.push(child);

              if (child.omniType.kind === OmniTypeKind.INTERFACE && !child.omniType.name) {

                const implementationName = ('name' in child.omniType.of) ? child.omniType.of.name : undefined;
                if (implementationName) {

                  // We prefer the exact same name as the original thing we are wrapping, since all classes will be interfaces.
                  child.omniType.name = implementationName;
                }
              }

            }
          }

          if (n.extends) {

            // If a class extends another class, then we should instead convert those classes into interfaces and add to our extends list.
            for (const child of n.extends.types.children) {

              const existing = classToInterfaceMap.get(child);
              if (existing) {

                interfaces.push(existing);

              } else {

                if (OmniUtil.asSuperType(child.omniType)) {

                  const implementationName = ('name' in child.omniType) ? child.omniType.name : undefined;
                  const interfaceType: OmniInterfaceType = {
                    kind: OmniTypeKind.INTERFACE,
                    of: child.omniType,
                  };

                  if (implementationName) {

                    // We prefer the exact same name as the original thing we are wrapping, since all classes will be interfaces.
                    interfaceType.name = implementationName;
                  }

                  // TODO: A node for this might already exist! We SHOULD/MUST use that one instead. Perhaps the transformation needs to be done in two steps.
                  const interfaceTypeNode = args.root.getAstUtils().createTypeNode(interfaceType);

                  interfaces.push(interfaceTypeNode);

                } else {
                  logger.warn(`Could not move ${OmniUtil.describe(child.omniType)} to be a TypeScript interface, since it is not a supertype`);
                }
              }
            }
          }

          if (interfaces.length > 0) {
            newInterface.extends = new Java.ExtendsDeclaration(new Java.TypeList(interfaces));
          }

          return newInterface;
        } finally {
          fieldNamesStack.pop();
        }
      },
      reduceConstructor: () => undefined,
      reduceMethodDeclaration: n => fieldNamesStack.length > 0 ? this.methodSignatureToField(args.root, n, fieldNamesStack[fieldNamesStack.length - 1]) : n,
      reduceFieldBackedGetter: n => {
        if (fieldNamesStack.length > 0) {
          const field = args.root.resolveNodeRef(n.fieldRef);
          return this.toUniqueField(field, fieldNamesStack[fieldNamesStack.length - 1]);
        } else {
          return n;
        }
      },
      reduceField: n => {

        const reducedField = fieldNamesStack.length > 0 ? this.toUniqueField(n, fieldNamesStack[fieldNamesStack.length - 1]) : n;
        if (reducedField && reducedField.property) {
          const propertyName = OmniUtil.getPropertyName(reducedField.property.name);
          if (propertyName) {
            reducedField.identifier = new Java.Identifier(propertyName);
          }
        }

        return reducedField;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private methodSignatureToField(root: RootAstNode, method: Java.MethodDeclaration, fieldNames: string[]): Java.Field | undefined {

    const getterField = JavaAstUtils.getGetterField(root, method);
    if (getterField) {
      return this.toUniqueField(getterField, fieldNames);
    }

    const soloReturnExpression = JavaAstUtils.getSoloReturn(method);
    if (soloReturnExpression) {

      const currentName = method.signature.identifier;
      const match = currentName.value.match(/[sg]et([A-Z]\w+)/);

      let fieldName: Java.Identifier;
      if (match) {

        const baseName = Case.camel(match[1]);
        fieldName = new Java.Identifier(baseName, currentName.original);

      } else {
        fieldName = currentName;
      }

      const newField = new Java.Field(
        method.signature.type,
        fieldName,
        method.signature.modifiers,
        undefined,
        method.signature.annotations,
      );

      return this.toUniqueField(newField, fieldNames);
    } else {

      // This is a function with actual functionality inside of it. We most likely do not need it.
      // NOTE: If there ever is a need to preserve these, it should be optional.
      return undefined;
    }
  }

  /**
   * A field might come from different places, like an actual field or a getter method. We only want it once.
   */
  private toUniqueField(field: Java.Field, fieldNames: string[]): Java.Field | undefined {

    const propertyName = (field.property ? OmniUtil.getPropertyName(field.property.name) : field.identifier.original) ?? field.identifier.value;
    if (fieldNames.includes(propertyName)) {
      return undefined;
    }
    fieldNames.push(propertyName);

    if (field.initializer) {
      field.initializer = undefined;
    }

    return this.stripModifiers(field);
  }

  private stripModifiers(n: Java.MethodDeclarationSignature | Java.Field): typeof n {

    const newModifiers = n.modifiers.children.filter(it => !IGNORED_MODIFIERS.includes(it.type));
    if (newModifiers.length != n.modifiers.children.length) {
      // TODO: Should return a new instance of Field, and the ast nodes should be immutable
      n.modifiers.children = newModifiers;
    }

    return n;
  }
}
