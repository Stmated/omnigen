import {AstNode, AstTransformer, AstTransformerArguments, Direction, OmniPrimitiveType, OmniType, OmniTypeKind, ParserOptions, TargetFeatures, TargetOptions} from '@omnigen/api';
import {AbortVisitingWithResult, Case, isDefined, OmniUtil, Visitor, VisitResultFlattener} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../Code';
import {CodeOptions, SerializationPropertyNameMode} from '../../options/CodeOptions';
import {CodeAstUtils} from '../CodeAstUtils.ts';
import {CodeVisitor} from '../../visitor/CodeVisitor.ts';
import {LoggerFactory} from '@omnigen/core-log';
import {CodeUtil} from '../../util/CodeUtil.ts';

const logger = LoggerFactory.create(import.meta.url);

interface AddAccessorsArgs {
  root: Code.CodeRootAstNode;
  classDeclaration: Code.ClassDeclaration;
  field: Code.Field;
  fieldsToRemove: number[];
  fieldsToPrefix: number[];
  addToBlock: Map<number, Code.AbstractCodeNode[]>;
  typeToDec: Map<OmniType, Code.ClassDeclaration>;
  visitor: CodeVisitor<unknown>;
  options: CodeOptions;
  features: TargetFeatures;
}

/**
 * TODO: Rewrite into using Reducer instead of manipulating the node contents.
 */
export class AddAccessorsForFieldsAstTransformer implements AstTransformer<CodeRootAstNode, CodeOptions> {

  private readonly _skip: Code.Identifier[];

  constructor(skip?: Code.Identifier[]) {
    this._skip = skip ?? [];
  }

  transformAst(args: AstTransformerArguments<CodeRootAstNode, CodeOptions>): void {

    const objectStack: Code.ClassDeclaration[] = [];
    const fieldsToRemove: number[] = [];
    const fieldsToPrefix: number[] = [];
    const addToBlock = new Map<number, Code.AbstractCodeNode[]>();

    const defaultVisitor = args.root.createVisitor();

    // First we go through and map OmniType <-> ClassDeclarations.
    // We need it sometimes to check if the supertype already has the field.
    // NOTE: This could be redone so it is done on-demand, but we do it upfront for now.
    const typeToDec = CodeAstUtils.getTypeToClassDecMap(args.root);

    args.root.visit(Visitor.create(defaultVisitor, {
      visitEnumDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
      visitMethodDeclaration: () => {
      },

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

      visitField: n => {

        if (objectStack.length === 0) {
          throw new Error(`Visited a field before we ever encountered a compilation unit`);
        }

        if (this._skip.find(it => it.value == n.identifier.value)) {
          return;
        }

        const classDec = objectStack[objectStack.length - 1];
        AddAccessorsForFieldsAstTransformer.addAccessorForField({
          root: args.root,
          classDeclaration: classDec,
          field: n,
          fieldsToRemove,
          fieldsToPrefix,
          addToBlock,
          typeToDec,
          visitor: defaultVisitor,
          options: args.options,
          features: args.features,
        });
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

  private static addAccessorForField(args: AddAccessorsArgs) {

    const body = args.classDeclaration.body;

    // Move comments from field over to the getter.
    const fieldComments: Code.Comment | undefined = args.field.comments;
    args.field.comments = undefined;

    const toAdd = (args.addToBlock.has(body.id) ? args.addToBlock : args.addToBlock.set(body.id, [])).get(body.id)!;

    if (OmniUtil.hasSpecifiedConstantValue(args.field.type.omniType)) {

      let superFields: Code.Field[] | undefined;
      if (args.classDeclaration.extends) {

        // First we need to check is a supertype already has the field/getter.
        // If it does NOT, then we can just add our own getter that returns the constant literal.
        // If it DOES, then we need to create an overriding getter that falls back on our constant value if none other is set.

        logger.silent(`Has Super Types: ${args.classDeclaration.extends.types.children.map(it => OmniUtil.describe(it.omniType)).join('\n')}`);

        const superClassDeclarations = CodeAstUtils.getSuperClassDeclarations(args.typeToDec, args.classDeclaration.extends);
        superFields = CodeAstUtils.getSuperFields(args.root, superClassDeclarations, args.field);

        if (superFields.length > 0 && OmniUtil.getDirection(args.classDeclaration.omniType, args.options.direction) !== Direction.OUT) {

          // If the direction is not `OUT` then we need to use what we were given, but could fallback to a default.
          toAdd.push(this.addAccessorForFieldWithDefaultValue(args, superFields[0], fieldComments, args.field.type.omniType));
          return;
        }
      }

      const accessor = this.addAccessorForConstField(args, fieldComments, args.field.type.omniType, superFields);
      if (accessor) {
        toAdd.push(accessor);
      }
      return;
    }

    this.addFieldBasedAccessors(args, fieldComments, toAdd);
  }


  private static addFieldBasedAccessors(args: AddAccessorsArgs, fieldComments: Code.Comment | undefined, toAdd: Code.AbstractCodeNode[]) {

    let identifier: Code.Identifier | undefined = undefined;
    if (args.features.transparentAccessors) {
      if (!args.field.identifier.original || args.field.identifier.value === args.field.identifier.original) {
        args.fieldsToPrefix.push(args.field.id);
        identifier = args.field.identifier;
      }
    }

    toAdd.push(new Code.FieldBackedGetter(new Code.FieldReference(args.field), undefined, fieldComments, identifier));
    if (!args.field.modifiers.children.find(it => it.kind === Code.ModifierKind.FINAL)) {
      toAdd.push(new Code.FieldBackedSetter(new Code.FieldReference(args.field), undefined, undefined, identifier));
    }
  }

  private static addAccessorForConstField(
    args: AddAccessorsArgs,
    fieldComments: Code.Comment | undefined,
    fieldType: OmniPrimitiveType & {literal: true},
    superFields: Code.Field[] | undefined,
  ): Code.MethodDeclaration | undefined {

    const superFieldWithSameName = superFields?.find(it => it.identifier.value === args.field.identifier.value);
    if (superFieldWithSameName) {

      // Supertype has this field as well, so we can just remove our own.
      // This can happen if Property was elevated from subtype(s) to supertype, where supertype has common denominator type, and subtypes have different literal types ("hi", "hello", "yo").
      // TODO: This is more like a fix to the issue of the field existing in both the subtype and supertype when it perhaps should be handled differently in `ElevatePropertiesModelTransformer`.
      //        But I have not yet figured out a good way of keeping information such as constant literals, without also keeping the field up until this point.
      // args.fieldsToRemove.push(args.field.id);
      return undefined; // TODO: Remove this whole check, since it should be handled by other transformers now?!?!?!
    }

    const fieldIdentifier = CodeAstUtils.getFieldPropertyNameIdentifier(args.field);
    const literalMethod = new Code.MethodDeclaration(
      new Code.MethodDeclarationSignature(
        new Code.GetterIdentifier(fieldIdentifier, fieldType),
        new Code.EdgeType(fieldType), undefined, undefined, undefined, fieldComments,
      ),
      new Code.Block(
        new Code.Statement(new Code.ReturnStatement(new Code.Literal(fieldType.value ?? null))),
      ),
    );

    if (args.options.debug) {
      literalMethod.signature.comments = CodeUtil.addComment(literalMethod.signature.comments, `Accessor created from const literal`);
    }

    const mode = args.options.serializationPropertyNameMode;
    const propertyName = (args.field.property ? OmniUtil.getPropertyName(args.field.property.name) : undefined);
    const fieldName = args.field.identifier.original ?? args.field.identifier.value;

    if (mode === SerializationPropertyNameMode.ALWAYS || (mode === SerializationPropertyNameMode.IF_REQUIRED && propertyName !== fieldName)) {
      if (!literalMethod.signature.annotations) {
        literalMethod.signature.annotations = new Code.AnnotationList();
      }

      literalMethod.signature.annotations.children.push(new Code.VirtualAnnotationNode({
        kind: Code.VirtualAnnotationKind.SERIALIZATION_ALIAS,
        name: propertyName ?? fieldName,
      }));
    }

    args.fieldsToRemove.push(args.field.id);
    return literalMethod;
  }

  private static addAccessorForFieldWithDefaultValue(
    args: AddAccessorsArgs,
    superField: Code.Field,
    fieldComments: Code.Comment | undefined,
    fieldType: OmniPrimitiveType & {literal: true},
  ): Code.MethodDeclaration {

    const fieldIdentifier = CodeAstUtils.getFieldPropertyNameIdentifier(args.field);
    const localVariableIdentifier = new Code.Identifier(`super${Case.pascal(args.field.identifier.value)}`);

    let superValue: Code.AbstractCodeNode;
    if (CodeAstUtils.isVisibleToSubTypes(superField)) {
      // The field itself is visible, so we will just it directly.
      superValue = new Code.MemberAccess(new Code.SuperReference(), superField.identifier);
    } else {
      // The field is not visible, so we will simply assume that the field has a getter. Should work for now.
      // NOTE: Perhaps we need to copy things like annotations? Since we are overriding the getter...
      superValue = new Code.MethodCall(
        new Code.MemberAccess(
          new Code.SuperReference(),
          new Code.GetterIdentifier(superField.identifier, superField.type.omniType),
        ),
      );
    }

    const localVariableDec = new Code.VariableDeclaration(localVariableIdentifier, superValue);
    localVariableDec.immutable = true;

    const literalMethod = new Code.MethodDeclaration(
      new Code.MethodDeclarationSignature(
        new Code.GetterIdentifier(fieldIdentifier, fieldType),
        new Code.EdgeType(fieldType), undefined, undefined, undefined, fieldComments,
      ),
      new Code.Block(
        new Code.Statement(localVariableDec),
        new Code.Statement(new Code.ReturnStatement(
            new Code.TernaryExpression(
              new Code.BinaryExpression(localVariableIdentifier, Code.TokenKind.NOT_EQUALS, new Code.Literal(null, OmniTypeKind.NULL)),
              localVariableIdentifier,
              new Code.Literal(fieldType.value ?? null),
            ),
          ),
        ),
      ),
    );

    if (args.options.debug) {
      const sig = literalMethod.signature;
      sig.comments = CodeUtil.addComment(sig.comments, `Created from const literal with possible other value`);
    }

    return literalMethod;
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
