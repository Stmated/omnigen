import {AstNode, AstTransformer, AstTransformerArguments, Direction, OmniPrimitiveType, OmniType, OmniTypeKind, TargetFeatures} from '@omnigen/api';
import {AbortVisitingWithResult, Case, OmniUtil, Visitor, VisitResultFlattener} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../Code';
import {CodeOptions, SerializationPropertyNameMode} from '../../options/CodeOptions';
import {CodeAstUtils} from '../CodeAstUtils';
import {CodeVisitor} from '../../visitor/CodeVisitor';
import {LoggerFactory} from '@omnigen/core-log';
import {CodeUtil} from '../../util/CodeUtil';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will add a `final` (readonly) modifier to all applicable fields.
 */
export class AddFinalToApplicableFieldsAstTransformer implements AstTransformer<CodeRootAstNode, CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, CodeOptions>): void {

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceField: (n, r) => {

        const property = n.property;

        if (property) {

          // We can only do this deduction if there is a property assigned to the field.
          if (property.readOnly === true || (property.readOnly === undefined && args.options.immutable) || OmniUtil.isNull(property.type)) {
            n.modifiers.children.push(new Code.Modifier(Code.ModifierKind.FINAL));
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
