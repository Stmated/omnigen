import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {TypeScriptOptions} from '../options';
import {Ts} from '../ast';
import {Code} from '@omnigen/target-code';
import {ModifierKind} from '@omnigen/target-code/ast';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces: `type Foo = Array<string | Array<string | Array<string | ...`
 *
 * With: `type Foo = Array<string | Foo>`
 *
 * Where the second part of the composition is recursive (no other advanced checks done)
 */
export class RecursiveTypeAliasTypeScriptAstTransformer implements AstTransformer<Ts.TsRootNode> {

  transformAst(args: AstTransformerArguments<Ts.TsRootNode, PackageOptions & TargetOptions & TypeScriptOptions>): void {

    const defaultReducer = args.root.createReducer();

    const typeIdToTypeAliasMap = new Map<number, number>();
    let typeDepth = 0;

    const newRoot = args.root.reduce({
      ...defaultReducer,

      reduceTypeAliasDeclaration: (n, r) => {

        typeIdToTypeAliasMap.set(n.of.id, n.id);

        const reduced = n.of.reduce(r);
        if (!reduced) {
          return undefined;
        } else if (reduced === n.of) {
          return n;
        }

        return new Ts.TypeAliasDeclaration(n.name, reduced, n.modifiers, n.comments).withIdFrom(n);
      },

      reduceArrayType: (n, r) => {

        if (typeDepth > 0) {
          const typeAliasId = typeIdToTypeAliasMap.get(n.id);
          if (typeAliasId !== undefined) {
            return new Code.DeclarationReference(typeAliasId);
          }
        }

        try {
          typeDepth++;
          return defaultReducer.reduceArrayType(n, r);
        } finally {
          typeDepth--;
        }

        return n;
      },
      reduceCompositionType: (n, r) => {

        if (typeDepth > 0) {
          const typeAliasId = typeIdToTypeAliasMap.get(n.id);
          if (typeAliasId !== undefined) {
            return new Code.DeclarationReference(typeAliasId);
          }
        }

        try {
          typeDepth++;
          return defaultReducer.reduceCompositionType(n, r);
        } finally {
          typeDepth--;
        }
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
