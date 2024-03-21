import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer} from '@omnigen/core';
import {Java, JavaAstUtils} from '@omnigen/target-java';
import {TsRootNode} from './TsRootNode.ts';
import {TypeScriptAstTransformerArgs} from './TypeScriptAstVisitor.ts';
import {TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {Case} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

const IGNORED_MODIFIERS = [Java.ModifierType.PRIVATE, Java.ModifierType.PUBLIC];

export class ClassToInterfaceTypeScriptAstTransformer implements AstTransformer<TsRootNode> {

  transformAst(args: TypeScriptAstTransformerArgs): void {

    if (!args.options.preferInterfaces) {
      return;
    }

    const defaultReducer = args.root.createReducer();
    const fieldNamesStack: string[][] = [];

    // NOTE: Can speed-up / simplify this by using a visitor first to find classes, and then run the reducer on only that.
    const reducer: TypeScriptAstReducer = {
      ...defaultReducer,
      reduceClassDeclaration: (n, r) => {
        try {
          fieldNamesStack.push([]);
          const body = n.body.reduce(r) ?? new Java.Block();

          const newInterface = new Java.InterfaceDeclaration(n.type, n.name, body, n.modifiers);
          if (n.implements) {
            if (n.implements.types.children.length == 1) {
              newInterface.extends = new Java.ExtendsDeclaration(n.implements.types.children[0]);
            } else if (n.implements.types.children.length > 1) {
              throw new Error(`No support at the moment to extend multiple. Report it if needed.`);
            }
          }

          return newInterface;
        } finally {
          fieldNamesStack.pop();
        }
      },
      reduceConstructor: () => undefined,
      reduceMethodDeclaration: n => fieldNamesStack.length > 0 ? this.methodSignatureToField(n, fieldNamesStack[fieldNamesStack.length - 1]) : n,
      reduceFieldBackedGetter: n => fieldNamesStack.length > 0 ? this.toUniqueField(n.field, fieldNamesStack[fieldNamesStack.length - 1]) : n,
      reduceField: n => fieldNamesStack.length > 0 ? this.toUniqueField(n, fieldNamesStack[fieldNamesStack.length - 1]) : n,
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }

  private methodSignatureToField(method: Java.MethodDeclaration, fieldNames: string[]): Java.Field | undefined {

    const getterField = JavaAstUtils.getGetterField(method);
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

  private toUniqueField(field: Java.Field, fieldNames: string[]): Java.Field | undefined {

    if (fieldNames.includes(field.identifier.value)) {
      return undefined;
    }
    fieldNames.push(field.identifier.value);

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
