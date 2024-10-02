import {AstNode, AstTransformer, AstTransformerArguments} from '@omnigen/api';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../Code';

/**
 * This transformer expects nodes to be ordered and in as much its final form as possible when ran.
 */
export class PrettyCodeAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    const defaultReducer = args.root.createReducer();

    const shouldFormatBlockStack: boolean[] = [];

    const newRoot = args.root.reduce({
      ...defaultReducer,

      reduceClassDeclaration: (n, r) => {
        try {
          shouldFormatBlockStack.push(true);
          return defaultReducer.reduceClassDeclaration(n, r);
        } finally {
          shouldFormatBlockStack.pop();
        }
      },
      reduceEnumDeclaration: (n, r) => {
        try {
          shouldFormatBlockStack.push(true);
          return defaultReducer.reduceEnumDeclaration(n, r);
        } finally {
          shouldFormatBlockStack.pop();
        }
      },
      reduceInterfaceDeclaration: (n, r) => {
        try {
          shouldFormatBlockStack.push(true);
          return defaultReducer.reduceInterfaceDeclaration(n, r);
        } finally {
          shouldFormatBlockStack.pop();
        }
      },

      reduceNamespaceBlock: (n, r) => {

        try {
          shouldFormatBlockStack.push(true);
          return defaultReducer.reduceNamespaceBlock(n, r);
        } finally {
          shouldFormatBlockStack.pop();
        }
      },

      reduceCompilationUnit: (n, r) => {

        const reduced = defaultReducer.reduceCompilationUnit(n, r);
        if (reduced) {

          const newChildren = [...reduced.children];
          const changes = this.prettifyArrayInline(newChildren);

          if (changes > 0) {

            const unit = new Code.CompilationUnit(
              reduced.packageDeclaration,
              reduced.imports,
              ...newChildren,
            ).withIdFrom(reduced);

            unit.comments = reduced.comments;

            if (reduced.name) {
              unit.name = reduced.name;
            }

            return unit;
          }
        }

        return reduced;
      },

      reduceBlock: (n, r) => {

        const shouldFormatBlock = shouldFormatBlockStack[shouldFormatBlockStack.length - 1];

        try {

          shouldFormatBlockStack.push(false);
          const reduced = defaultReducer.reduceBlock(n, r);

          if (reduced && shouldFormatBlock) {

            const newChildren = [...reduced.children];
            const changes = this.prettifyArrayInline(newChildren);

            if (changes > 0) {
              return new Code.Block(...newChildren).withIdFrom(n);
            }
          }

          return reduced;
        } finally {
          shouldFormatBlockStack.pop();
        }
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private prettifyArrayInline(array: AstNode[]): number {

    let changes = 0;
    for (let i = array.length - 2; i >= 0; i--) {
      const child = array[i];
      if (child instanceof Code.FormatNewline) {
        // If someone else has already added a pretty newline, then we will just continue.
      } else if ((child instanceof Code.MethodDeclaration) || child instanceof Code.AbstractObjectDeclaration) {
        changes++;
        array.splice(i + 1, 0, new Code.FormatNewline());
      } else {
        const other = array[i + 1].constructor.name;
        const current = array[i].constructor.name;
        if (other !== current) {
          changes++;
          array.splice(i + 1, 0, new Code.FormatNewline());
        }
      }
    }

    return changes;
  }
}
