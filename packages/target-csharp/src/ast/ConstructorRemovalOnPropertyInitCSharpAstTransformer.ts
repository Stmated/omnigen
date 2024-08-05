import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, OmniType, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/api';
import {Cs} from '../ast';
import {CSharpOptions, ReadonlyPropertyMode} from '../options';
import {BinaryExpression, ConstructorParameter} from '@omnigen/target-code/ast';
import {CodeAstUtils} from '@omnigen/target-code';
import {OmniUtil} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If a property is immutable and 'init' setter is enabled, then remove that property as an argument from the constructor.
 *
 * But we need to keep any `constructor argument -> super-constructor parameter` if the `constructor argument` and/or `super-constructor parameter` has any logic associated with them.
 */
export class ConstructorRemovalOnPropertyInitCSharpAstTransformer implements AstTransformer<Cs.CSharpRootNode> {

  transformAst(args: AstTransformerArguments<Cs.CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>): void {

    if (args.options.csharpReadonlyPropertySetterMode !== ReadonlyPropertyMode.INIT) {

      // Property 'init' setter is not enabled.
      return;
    }

    // return;

    const classStack: Cs.ClassDeclaration[] = [];

    const defaultVisitor = args.root.createVisitor();
    const typeToParameterMap = new Map<OmniType, ConstructorParameter[]>();

    args.root.visit({
      ...defaultVisitor,
      visitClassDeclaration: (n, v) => {
        try {
          classStack.push(n);
          defaultVisitor.visitClassDeclaration(n, v);
        } finally {
          classStack.pop();
        }
      },
      visitConstructorParameterList: (n, v) => {
        const owner = classStack[classStack.length - 1];
        for (let i = 0; i < n.children.length; i++) {

          const map = (typeToParameterMap.has(owner.omniType) ? (typeToParameterMap) : (typeToParameterMap.set(owner.omniType, []))).get(owner.omniType)!;
          map.push(n.children[i]);
        }
      },
    });

    classStack.length = 0;
    const protectedParameters = new Set<number>();
    const constructorSuperArgumentToParameter = new Map<number, number>();

    args.root.visit({
      ...defaultVisitor,
      visitClassDeclaration: (n, v) => {

        try {
          classStack.push(n);
          defaultVisitor.visitClassDeclaration(n, v);
        } finally {
          classStack.pop();
        }
      },

      visitConstructor: (n, v) => {

        if (n.body) {
          for (const child of n.body.children) {
            const unwrapped = CodeAstUtils.unwrap(child);
            if (!(unwrapped instanceof BinaryExpression) || unwrapped.token !== Cs.TokenKind.ASSIGN || !(unwrapped.right instanceof Cs.DeclarationReference)) {

              // The constructor body contains a statement that is not a simple assignment of constructor argument.
              // That means there is probably logic regarding a constructor argument.
              // So all parameters referenced in the expression must be protected.

              unwrapped.visit({
                ...defaultVisitor,
                visitDeclarationReference: n2 => {
                  // All references are protected. Maybe only some are referencing a parameter, but that is okay/safe.
                  // By just protecting all references we do not need to resolve anything here.
                  protectedParameters.add(n2.targetId);
                },
              });
            }
          }
        }

        if (n.superCall) {

          const currentType = (classStack.length > 0) ? classStack[classStack.length - 1] : undefined;
          let superType = currentType?.extends?.types.children[0].omniType;
          if (superType?.kind === OmniTypeKind.GENERIC_TARGET) {
            superType = superType.source;
          }
          if (superType?.kind === OmniTypeKind.GENERIC_SOURCE) {
            superType = superType.of;
          }

          const superTypeParameters = superType ? typeToParameterMap.get(superType) : undefined;
          if (!superTypeParameters) {
            logger.warn(`Could not find super type parameters for ${OmniUtil.describe(superType)}`);
          }

          for (let i = 0; i < n.superCall.arguments.children.length; i++) {

            const superArg = n.superCall.arguments.children[i];
            if (!(superArg instanceof Cs.DeclarationReference)) {

              // This super-call contains something that is not a straight reference to a constructor parameter.
              // That means there is probably logic regarding the super-call argument.
              // So all parameters referenced in the expression must be protected.
              superArg.visit({
                ...defaultVisitor,
                visitDeclarationReference: n2 => {
                  protectedParameters.add(n2.targetId);
                },
              });

              // We must also protect the parameter in the super-type, since it needs to be able to receive the logic-based super-call argument.
              if (superTypeParameters) {

                const superTypeParameter = superTypeParameters[i];
                protectedParameters.add(superTypeParameter.id);

                constructorSuperArgumentToParameter.set(superArg.id, superTypeParameter.id);
              }
            }
          }
        }

        defaultVisitor.visitConstructor(n, v);
      },
    });

    logger.trace(`Protected params: ${[...protectedParameters].join(', ')}`);

    const parametersToRemove: number[][] = [];
    const propertiesToRemove: number[][] = [];

    classStack.length = 0;

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceClassDeclaration: (n, r) => {
        try {
          classStack.push(n);
          return defaultReducer.reduceClassDeclaration(n, r);
        } finally {
          classStack.pop();
        }
      },
      reduceConstructor: (n, r) => {

        const owner = classStack[classStack.length - 1];
        if (owner && n.parameters && n.body) {

          const newParameters = [...n.parameters.children];
          const localParametersToRemove: number[] = [];
          const localPropertiesToRemove: number[] = [];
          let changeCount = 0;

          for (let i = 0; i < newParameters.length; i++) {
            const parameter = newParameters[i];

            if (parameter.hasId(protectedParameters)) {
              logger.silent(`Keeping '${parameter.identifier.value}' since it is protected`);
              continue;
            }

            const resolved = parameter.ref.resolve(args.root);
            if (resolved instanceof Cs.PropertyNode && resolved.immutable) {

              logger.silent(`Removing parameter ${i} (${parameter.id}) of constructor of ${owner.name.value}`);
              localParametersToRemove.push(parameter.id);
              localPropertiesToRemove.push(resolved.id);
              newParameters.splice(i, 1);
              changeCount++;
              i--;
            }
          }

          if (changeCount > 0) {

            logger.silent(`Replacing constructor of ${owner.name.value} after ${changeCount} changes`);
            const constructor = new Cs.ConstructorDeclaration(
              new Cs.ConstructorParameterList(...newParameters),
              n.body.reduce(r),
              n.modifiers.reduce(r),
            );

            constructor.annotations = n.annotations;
            constructor.comments = n.comments;
            constructor.superCall = n.superCall;

            try {
              logger.silent(`Pushing ${localPropertiesToRemove} to properties to be removed`);
              parametersToRemove.push(localParametersToRemove);
              propertiesToRemove.push(localPropertiesToRemove);

              return defaultReducer.reduceConstructor(constructor, r);

            } finally {
              propertiesToRemove.pop();
              parametersToRemove.pop();
            }
          }
        }

        return n;
      },
      reduceDeclarationReference: (n, r) => {

        if (parametersToRemove.length > 0) {
          const localParametersToRemove = parametersToRemove[parametersToRemove.length - 1];
          if (localParametersToRemove.includes(n.targetId)) {

            logger.silent(`Removing declaration reference ${n.id} that points to ${n.targetId}`);
            return undefined;
          }
        }

        return n;
      },
      reducePropertyReference: (n, r) => {

        if (propertiesToRemove.length > 0) {
          const localPropertiesToRemove = propertiesToRemove[propertiesToRemove.length - 1];
          if (localPropertiesToRemove.includes(n.id)) {
            logger.silent(`Removing property reference ${n.id}`);
            return undefined;
          }
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
