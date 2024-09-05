import {
  AstNode,
  AstTransformer,
  AstTransformerArguments,
  OMNI_RESTRICTIVE_GENERIC_FEATURES,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetType,
  OmniType,
  OmniTypeKind,
  TypeDiffKind,
} from '@omnigen/api';
import {OmniUtil, Visitor} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '../CodeAst.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If all target identifiers to a source have the same type, then replace that source identifier with inline type.
 *
 * This could happen if the model had type literals as generics, but the target language does not support it.
 * Then the rendered type will be the common denominator primitive of the literal, and be the same everywhere.
 *
 * There could also be some other transformer that replaces one type with another, making them clones in the end.
 */
export class SimplifyGenericsAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {


  }
}
