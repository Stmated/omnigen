import {AstTransformer, AstTransformerArguments, OmniModel, OmniPrimitiveConstantValue, OmniPropertyName, OmniType, OmniTypeKind, Reference, RootAstNode, TargetOptions, TypeNode} from '@omnigen/api';
import {isDefined, OmniUtil, Visitor} from '@omnigen/core';
import * as Code from '../Code';
import {CodeRootAstNode} from '../CodeRootAstNode';
import {CodeOptions} from '../../options/CodeOptions';
import {CodeUtil} from '../../util/CodeUtil';
import {AbstractCodeNode} from '../AbstractCodeNode';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

interface ConstructorRequirements {
  fields: ReadonlyArray<Code.Field>;
  parameters: ReadonlyArray<Code.ConstructorParameter>;
  expressions: ReadonlyArray<Code.AstNode>;
}

/**
 * Adds a constructor to a class, based on what fields are required (final) and what fields are required from any potential supertype.
 */
export class AddConstructorAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    const classDeclarations: Code.ClassDeclaration[] = [];

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(defaultVisitor, {
      visitClassDeclaration: (node, visitor) => {
        defaultVisitor.visitClassDeclaration(node, visitor);
        classDeclarations.push(node);
      },
    }));

    classDeclarations.sort(
      (a, b) => AddConstructorAstTransformer.compareSuperClassHierarchy(args.root, args.model, a, b),
    );

    for (const classDeclaration of classDeclarations) {

      const requirements = AddConstructorAstTransformer.getConstructorRequirements(args.root, classDeclaration, args.options);

      if (requirements && (requirements.fields.length > 0 || requirements.parameters.length > 0 || requirements.expressions.length > 0)) {

        const constructorDeclaration = this.createConstructorDeclaration(args.root, classDeclaration, requirements, args.options);
        classDeclaration.body.children.push(constructorDeclaration);
      }
    }
  }

  private createConstructorDeclaration(
    root: RootAstNode,
    subClassDec: Code.ClassDeclaration,
    superRequirements: ConstructorRequirements,
    options: CodeOptions & TargetOptions,
  ): Code.ConstructorDeclaration {

    const blockExpressions: AbstractCodeNode[] = [];

    const [requiredSuperParameters, superCall, superLiterals] = this.addSuperConstructorCall(root, subClassDec, superRequirements.parameters, options);
    const parameters: Code.ConstructorParameter[] = [];

    for (let i = 0; i < superRequirements.fields.length; i++) {

      const constructorField = superRequirements.fields[i];
      const constructorFieldType = constructorField.property?.type ?? constructorField.type.omniType;
      const constructorFieldRef = new Code.FieldReference(constructorField);
      const parameter = this.createConstructorParameter(constructorFieldRef, constructorFieldType, constructorField.identifier, root, options);
      parameters.push(parameter);

      blockExpressions.push(new Code.Statement(new Code.BinaryExpression(
        new Code.MemberAccess(new Code.SelfReference(), new Code.FieldReference(constructorField)),
        Code.TokenKind.ASSIGN,
        new Code.DeclarationReference(parameter),
      )));
    }

    const allConstructorParameters = requiredSuperParameters.concat(parameters);

    const constructor = new Code.ConstructorDeclaration(
      new Code.ConstructorParameterList(...allConstructorParameters),
      new Code.Block(...blockExpressions, ...superRequirements.expressions),
    );

    if (options.debug) {
      let comment = 'Added constructor for';
      if (superRequirements.fields.length > 0) {
        comment += ` field(s) [${superRequirements.fields.map(it => it.identifier.original ?? it.identifier.value).join(', ')}],`;
      } else {
        comment += ` no fields,`;
      }

      if (requiredSuperParameters.length > 0) {
        comment += ` super constructor parameter(s): [${requiredSuperParameters.map(it => it.identifier.original ?? it.identifier.value).join(', ')}]`;
      } else {
        comment += ` no super constructor parameters`;
      }

      if (superLiterals.length > 0) {
        comment += `, ${superLiterals.length} super literal(s)`;
      }

      constructor.comments = CodeUtil.addComment(constructor.comments, comment);
    }

    // This will be moved to the constructor body in a later transformer.
    constructor.superCall = superCall;

    return constructor;
  }

  private static compareSuperClassHierarchy(root: CodeRootAstNode, model: OmniModel, a: Code.ClassDeclaration, b: Code.ClassDeclaration): number {

    if (a.extends && !b.extends) {
      return 1;
    } else if (!a.extends && b.extends) {
      return -1;
    } else if (a.extends && b.extends) {

      // TODO: This is probably wrong? We should build an actual tree, and sort based on it?
      const functions = root.getFunctions();
      const aHierarchy = CodeUtil.getSuperClassHierarchy(model, OmniUtil.asSubType(a.type.omniType) ? a.type.omniType : undefined, functions);
      const bHierarchy = CodeUtil.getSuperClassHierarchy(model, OmniUtil.asSubType(b.type.omniType) ? b.type.omniType : undefined, functions);
      return aHierarchy.length - bHierarchy.length;
    }

    // Keep the order as-is.
    return 0;
  }

  private addSuperConstructorCall(
    root: RootAstNode,
    subClassDec: Code.ClassDeclaration,
    superConstructorParameters: ReadonlyArray<Code.ConstructorParameter>,
    options: CodeOptions,
  ): [Code.ConstructorParameter[], Code.SuperConstructorCall | undefined, Code.Literal[]] {

    if (superConstructorParameters.length == 0) {
      return [[], undefined, []];
    }

    const requiredSuperArguments: Code.ConstructorParameter[] = [];
    const superConstructorArguments: AbstractCodeNode[] = [];
    const superLiteralArguments: Code.Literal[] = [];
    for (const superParameter of superConstructorParameters) {

      // Create a new node instance from the given type.
      const fieldName = superParameter.identifier.original ?? superParameter.identifier.value;
      const property = OmniUtil.getPropertiesOf(subClassDec.omniType).find(it => OmniUtil.isPropertyNameMatching(fieldName, it.name));
      const typeNode = property?.type ?? superParameter.type;
      const type = property?.type ?? superParameter.type.omniType;

      if (OmniUtil.isPrimitive(type) && type.literal) {
        // Super parameter requires a literal value, so we give it as argument
        const literalValue = type.value ?? null;
        superConstructorArguments.push(new Code.Literal(literalValue));
      } else {

        const literalValue = this.getLiteral(subClassDec.omniType, fieldName);
        if (literalValue !== undefined) {

          // Or subtype has this parameter as a literal value, so we give it as argument.
          const literal = new Code.Literal(literalValue);
          superConstructorArguments.push(literal);
          superLiteralArguments.push(literal);

        } else {
          const constructorParam = this.createConstructorParameter(superParameter.ref, typeNode, superParameter.identifier, root, options);
          superConstructorArguments.push(new Code.DeclarationReference(constructorParam));
          requiredSuperArguments.push(constructorParam);
        }
      }
    }

    const superCall = (superConstructorArguments.length > 0)
      ? new Code.SuperConstructorCall(new Code.ArgumentList(...superConstructorArguments))
      : undefined;

    return [requiredSuperArguments, superCall, superLiteralArguments];
  }

  private getLiteral(type: OmniType, propertyName: string): OmniPrimitiveConstantValue | undefined {

    if (type.kind === OmniTypeKind.OBJECT) {
      const property = type.properties.find(it => OmniUtil.isPropertyNameMatching(it.name, propertyName));
      if (property) {
        return OmniUtil.getSpecifiedConstantValue(property.type);
      }
    }

    return undefined;
  }

  private createConstructorParameter(
    fieldRef: Reference<Code.AstNode>,
    type: OmniType | TypeNode,
    identifier: Code.Identifier,
    root: RootAstNode,
    options: CodeOptions,
  ): Code.ConstructorParameter {

    const schemaIdentifier = identifier.original || identifier.value;
    const safeName = CodeUtil.getPrettyParameterName(schemaIdentifier);

    let usedIdentifier = identifier;
    if (identifier.value != safeName) {
      usedIdentifier = new Code.Identifier(safeName, schemaIdentifier);
    }

    const typeNode = ('kind' in type) ? root.getAstUtils().createTypeNode(type, undefined, options.immutable) : type;
    return new Code.ConstructorParameter(fieldRef, typeNode, usedIdentifier);
  }

  private static getConstructorRequirements(
    root: CodeRootAstNode,
    node: Code.AbstractObjectDeclaration,
    options: TargetOptions & CodeOptions,
  ): ConstructorRequirements | undefined {

    const constructors: Code.ConstructorDeclaration[] = [];
    const fields: Code.Field[] = [];
    const setters: Code.FieldBackedSetter[] = [];

    node.body.visit({
      ...root.createVisitor<void>(),
      visitConstructor: n => {
        constructors.push(n);
      },
      visitObjectDeclaration: () => {
        // Do not go into any nested objects.
      },
      visitField: n => {
        fields.push(n);
      },
      visitFieldBackedSetter: n => {
        setters.push(n);
      },
    });

    if (constructors.length > 0) {

      // This class already has a constructor, so we will trust that it is correct.
      // NOTE: In this future this could be improved into modifying the existing constructor as-needed.
      return undefined;
    }

    const fieldIdsWithSetters = setters.map(setter => setter.fieldRef.targetId);
    const fieldsWithFinal = fields.filter(field => {
      if (field.property && options.immutable) {
        // NOTE: Not optimal special handling. But we do not want custom fields that are added by custom logic to be considered eligible for constructor injection.
        return true;
      }
      return field.modifiers.children.some(m => m.kind === Code.ModifierKind.FINAL || m.kind === Code.ModifierKind.READONLY)
    });
    // const fieldsWithFinal = fields.filter(field => field.modifiers.children.some(m => options.immutable || m.kind === Code.ModifierKind.FINAL || m.kind === Code.ModifierKind.READONLY));
    const fieldsWithoutSetters = fields.filter(field => !fieldIdsWithSetters.includes(field.id));
    const fieldsWithoutInitializer = fieldsWithoutSetters.filter(field => field.initializer === undefined);

    const immediateRequired = fields.filter(field => {
      if (fieldsWithoutInitializer.includes(field)) {
        if (fieldIdsWithSetters.includes(field.id) || fieldsWithFinal.includes(field)) {
          return true;
        }
      }

      return false;
    });

    const supertypeArguments: Code.ConstructorParameter[] = [];
    const bodyExpressions: Code.AstNode[] = [];

    if (node.extends) {

      const superClassDeclarations = node.extends.types.children.map(it => CodeUtil.getClassDeclaration(root, it.omniType)).filter(isDefined);

      const defaultVisitor = root.createVisitor();
      for (const superClassDec of superClassDeclarations) {

        let depth = 0;
        superClassDec.visit(Visitor.create(defaultVisitor, {
          visitField: () => {
          },
          visitConstructor: n => {
            if (n.parameters) {
              supertypeArguments.push(...n.parameters.children);
            }
          },
          visitObjectDeclarationBody: (n, v) => {
            if (depth > 0) {
              // We only check one level of object declaration, or we will find nested ones.
              return;
            }

            try {
              depth++;
              defaultVisitor.visitObjectDeclarationBody(n, v);
            } finally {
              depth--;
            }
          },
        }));
      }

      type NameAndLiteral = { name: OmniPropertyName, literal: OmniPrimitiveConstantValue };
      const namesAndLiterals: NameAndLiteral[] = [];
      for (const hiddenProperty of OmniUtil.getPropertiesOf(node.omniType).filter(it => it.hidden)) {

        if (immediateRequired.some(it => OmniUtil.isPropertyNameMatching(hiddenProperty.name, it.identifier.original ?? it.identifier.value))) {
          continue;
        }
        if (supertypeArguments.some(it => OmniUtil.isPropertyNameMatching(hiddenProperty.name, it.identifier.original ?? it.identifier.value))) {
          continue;
        }

        const constLiteral = OmniUtil.getSpecifiedConstantValue(hiddenProperty.type);
        if (constLiteral !== undefined) {

          // The hidden property has a const literal, so we should use it to set a good initial value for the subtype object.
          namesAndLiterals.push({
            name: hiddenProperty.name,
            literal: constLiteral,
          });
        }
      }

      if (namesAndLiterals.length > 0) {

        // Then visit again after we've found all other constructor requirements.
        // Since we should only care about those that are left.
        for (const superClassDec of superClassDeclarations) {
          superClassDec.visit(Visitor.create(defaultVisitor, {
            visitField: n => {

              const propertyName = n.property?.name;
              if (propertyName) {

                const foundLiteral = namesAndLiterals.find(it => OmniUtil.isPropertyNameMatching(it.name, propertyName));
                if (foundLiteral) {
                  bodyExpressions.push(new Code.Statement(new Code.BinaryExpression(
                    new Code.MemberAccess(new Code.SuperReference(), new Code.FieldReference(n)),
                    Code.TokenKind.ASSIGN,
                    new Code.Literal(foundLiteral.literal),
                  )));
                }
              }
            },
          }));
        }
      }
    }

    return {
      fields: immediateRequired,
      parameters: supertypeArguments,
      expressions: bodyExpressions,
    };
  }
}
