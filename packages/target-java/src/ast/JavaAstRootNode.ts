import {Code, CodeVisitor} from '@omnigen/target-code';
import {ObjectNameResolver, Reducer, ReducerResult, TargetFunctions} from '@omnigen/api';
import {JavaObjectNameResolver} from './JavaObjectNameResolver.ts';
import {isDefined} from '@omnigen/core';
import {JavaModelFunctions} from '../parse/JavaModelFunctions';

export class JavaAstRootNode extends Code.CodeRootAstNode {

  getNameResolver(): ObjectNameResolver {
    return new JavaObjectNameResolver();
  }

  getFunctions(): TargetFunctions {
    return new JavaModelFunctions();
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<JavaAstRootNode> {
    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      const newRoot = new JavaAstRootNode();
      newRoot.children.push(...reduced);
      return newRoot;
    }

    return undefined;
  }
}
