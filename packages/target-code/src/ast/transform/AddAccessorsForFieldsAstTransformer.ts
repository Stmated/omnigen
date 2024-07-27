import {AstNode, AstTransformer, AstTransformerArguments, TargetFeatures, TargetOptions} from '@omnigen/core';
import {AbortVisitingWithResult, OmniUtil, PropertyUtil, Visitor, VisitResultFlattener} from '@omnigen/core-util';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../Code';
import {CodeOptions, SerializationPropertyNameMode} from '../../options/CodeOptions';
import {CodeAstUtils} from '../CodeAstUtils.ts';
import {literal} from 'zod';
import {VirtualAnnotationKind} from '../Code';

/**
 * TODO: Rewrite into using Reducer instead of manipulating the node contents
 */
export class AddAccessorsForFieldsAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  private readonly _skip: Code.Identifier[];

  constructor(skip?: Code.Identifier[]) {
    this._skip = skip ?? [];
  }

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    const objectStack: Code.AbstractObjectDeclaration[] = [];
    const fieldsToRemove: number[] = [];
    const fieldsToPrefix: number[] = [];
    const addToBlock = new Map<number, Code.AbstractCodeNode[]>();

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(defaultVisitor, {

      visitEnumDeclaration: () => {},
      visitInterfaceDeclaration: () => {},
      visitMethodDeclaration: () => {},

      visitClassDeclaration: (node, visitor) => {

        const foundGetter = this.hasGetter(args.root, node);
        if (foundGetter) {

          // There already exists a getter in the class, so something more specific was already done to it.
          return;
        }

        try {
          objectStack.push(node);
          defaultVisitor.visitClassDeclaration(node, visitor);
        } finally {
          objectStack.pop();
        }
      },

      visitField: node => {

        if (objectStack.length === 0) {
          throw new Error(`Visited a field before we ever encountered a compilation unit`);
        }

        if (this._skip.find(it => it.value == node.identifier.value)) {
          return;
        }

        const objectDec = objectStack[objectStack.length - 1];
        AddAccessorsForFieldsAstTransformer.addAccessorForField(objectDec.body, node, fieldsToRemove, fieldsToPrefix, addToBlock, args.options, args.features);
      },
    }));

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceField: (n, r) => {

        if (n.hasId(fieldsToRemove)) {
          return undefined;
        }

        const reduced = defaultReducer.reduceField(n, r);
        if (reduced && reduced.hasId(fieldsToPrefix) && reduced instanceof Code.Field) {

          // TODO: Do not replace like this -- instead build a new Field, it should be readonly.
          reduced.identifier = new Code.Identifier(`_${reduced.identifier.value}`, reduced.identifier.original ?? reduced.identifier.value);
        }

        return reduced;
      },

      reduceBlock: (n, r) => {

        const reduced = defaultReducer.reduceBlock(n, r);
        if (reduced) {

          const toAdd = addToBlock.get(n.id);
          if (toAdd) {
            reduced.children.push(...toAdd);
          }
        }

        return reduced;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private static addAccessorForField(
    body: Code.Block,
    field: Code.Field,
    fieldsToRemove: number[],
    fieldsToPrefix: number[],
    addToBlock: Map<number, Code.AbstractCodeNode[]>,
    options: TargetOptions & CodeOptions,
    features: TargetFeatures,
  ) {

    // Move comments from field over to the getter.
    const commentList: Code.Comment | undefined = field.comments;
    field.comments = undefined;

    const toAdd = (addToBlock.has(body.id) ? addToBlock : addToBlock.set(body.id, [])).get(body.id)!;

    if (OmniUtil.hasSpecifiedConstantValue(field.type.omniType)) {

      const fieldIdentifier = CodeAstUtils.getFieldPropertyNameIdentifier(field);
      const literalMethod = new Code.MethodDeclaration(
        new Code.MethodDeclarationSignature(
          new Code.GetterIdentifier(fieldIdentifier, field.type.omniType),
          new Code.EdgeType(field.type.omniType), undefined, undefined, undefined, commentList,
        ),
        new Code.Block(
          new Code.Statement(new Code.ReturnStatement(new Code.Literal(field.type.omniType.value ?? null))),
        ),
      );

      const mode = options.serializationPropertyNameMode;
      const propertyName = (field.property ? OmniUtil.getPropertyName(field.property.name) : undefined);
      const fieldName = field.identifier.original ?? field.identifier.value;

      if (mode === SerializationPropertyNameMode.ALWAYS || (mode === SerializationPropertyNameMode.IF_REQUIRED && propertyName !== fieldName)) {
        if (!literalMethod.signature.annotations) {
          literalMethod.signature.annotations = new Code.AnnotationList();
        }

        literalMethod.signature.annotations.children.push(new Code.VirtualAnnotationNode({
          kind: VirtualAnnotationKind.SERIALIZATION_ALIAS,
          name: propertyName ?? fieldName,
        }));
      }

      // if (features.transparentAccessors) {
      //   if (!field.identifier.original || field.identifier.value === field.identifier.original) {
      //     fieldsToPrefix.push(field.id);
      //   }
      // }

      fieldsToRemove.push(field.id);
      toAdd.push(literalMethod);

      // const fieldIndex = body.children.indexOf(field);
      // body.children.splice(fieldIndex, 0, literalMethod);

    } else {

      let identifier: Code.Identifier | undefined = undefined;
      if (features.transparentAccessors) {
        if (!field.identifier.original || field.identifier.value === field.identifier.original) {
          fieldsToPrefix.push(field.id);
          identifier = field.identifier;
        }
      }/* else {
        fieldsToRemove.push(field.id);
      }*/

      toAdd.push(new Code.FieldBackedGetter(new Code.FieldReference(field), undefined, commentList, identifier));
      if (!field.modifiers.children.find(it => it.kind === Code.ModifierKind.FINAL)) {
        toAdd.push(new Code.FieldBackedSetter(new Code.FieldReference(field), undefined, undefined, identifier));
      }
    }
  }

  private hasGetter(root: CodeRootAstNode, latestBody: AstNode): boolean {

    const defaultVisitor = root.createVisitor<boolean>();

    const visitor = Visitor.create(defaultVisitor, {

      visitField: () => {
      },
      visitConstructor: () => {
      },
      visitExtendsDeclaration: () => {
      },
      visitTypeList: () => {
      },
      visitFieldBackedSetter: () => {
      },

      visitMethodDeclarationSignature: node => {
        if (node.identifier instanceof Code.GetterIdentifier) {
          throw new AbortVisitingWithResult(true);
        } else if (node.identifier instanceof Code.SetterIdentifier) {
          return;
        }

        const methodName = node.identifier.value;
        if ((!node.parameters || node.parameters.children.length == 0) && /(?:get|is)[A-Z]*/ug.test(methodName)) {
          throw new AbortVisitingWithResult(true);
        }
      },
    });

    return VisitResultFlattener.visitWithSingularResult(visitor, latestBody, false);
  }
}
