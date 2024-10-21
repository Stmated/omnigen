import {AstTransformer, AstTransformerArguments, NameParts, OmniType, PackageOptions, TargetOptions, TypeNode} from '@omnigen/api';
import {TsRootNode} from './TsRootNode';
import {DefaultTypeScriptVisitor} from '../visit';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '@omnigen/core';
import {Ts} from '../ast';
import {Code} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

export class CompositionTypeScriptAstTransformer implements AstTransformer<TsRootNode, PackageOptions & TargetOptions> {

  transformAst(args: AstTransformerArguments<TsRootNode, PackageOptions & TargetOptions>): void {

    const typesToReplace = new Map<TypeNode, TypeNode>();
    const nameResolver = args.root.getNameResolver();

    args.root.visit({
      ...DefaultTypeScriptVisitor,
      visitClassDeclaration: (n, v) => {

        if (!OmniUtil.isComposition(n.type.omniType)) {
          return DefaultTypeScriptVisitor.visitClassDeclaration(n, v);
        }

        if (n.body.children.length > 0) {
          logger.warn(`There are children inside composition '${OmniUtil.describe(n.type.omniType)}' node -- will not be able to convert it into TypeScript composition type node`);
        } else if (!n.type.omniType.inline) {

          const inlinedType: OmniType = {
            ...n.type.omniType,
            inline: true,
            debug: OmniUtil.addDebug(n.type.omniType.debug, `Turned regular ${n.type.omniType.kind} into TS inline type`),
          };

          // modelTypeReplacements.set(n.type.omniType, inlinedType);

          const aliasRhsTypeNode = args.root.getAstUtils().createTypeNode(inlinedType);
          const replacementAliasTargetNode = new Code.EdgeType(n.type.omniType, false);

          // TODO: Add this to an existing suitable CompilationUnit instead? Make it an option to move it elsewhere? Maybe to where it is used the most?
          const typeAlias = new Ts.TypeAliasDeclaration(n.name, aliasRhsTypeNode, new Code.ModifierList(new Code.Modifier(Code.ModifierKind.PUBLIC)));
          const investigatedName = nameResolver.investigate({type: n.type.omniType, customName: n.name.value, options: args.options});
          const absolutePackageName = nameResolver.build({name: investigatedName, with: NameParts.NAMESPACE});

          args.root.children.push(new Code.CompilationUnit(
            new Code.PackageDeclaration(absolutePackageName),
            new Code.ImportList(),
            typeAlias,
          ));

          typesToReplace.set(n.type, replacementAliasTargetNode);
        }

        return DefaultTypeScriptVisitor.visitClassDeclaration(n, v);
      },
    });

    // TODO: This should rather be done in a 2nd pass model transformer -- it is too late to do model changes inside an AST transformer.
    //        Same thing goes for the creation of the inline type above, it should be done elsewhere so hopefully this AST transformer is not needed at all.
    // for (const [original, replacement] of modelTypeReplacements.entries()) {
    //   OmniUtil.swapType(args.model, original, replacement);
    // }

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceClassDeclaration: (n, r) => {

        if (n.type.omniType.inline) {

          // TODO: This removal should be moved to a separate transformer, once which removes class declarations that are all used as inline. This is not the place for it.
          return undefined;
        }

        if (typesToReplace.get(n.type)) {
          return undefined;
        }

        return defaultReducer.reduceClassDeclaration(n, r);
      },
      reduceCompilationUnit: (n, r) => {
        const result = defaultReducer.reduceCompilationUnit(n, r);
        if (result && result.children.length === 0) {
          return undefined;
        }

        return result;
      },
      reduceEdgeType: n => {

        const replacementNode = typesToReplace.get(n);
        if (replacementNode) {
          return replacementNode;
        } else if (OmniUtil.isComposition(n.omniType)) {
          return args.root.getAstUtils().createTypeNode(n.omniType);
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}

