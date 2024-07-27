import {
  AstTransformer,
  AstTransformerArguments,
  NameParts,
  OmniExamplePairing,
  OmniLinkMapping,
  OmniModel,
  OmniOutput,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  PackageOptions,
  TargetOptions, TypeNode,
} from '@omnigen/core';
import {assertUnreachable, OmniUtil, Util, Visitor} from '@omnigen/core-util';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '../Code';
import * as FreeText from '../FreeText';
import {CodeOptions, IncludeExampleCommentsMode} from '../../options/CodeOptions';
import {FreeTextUtils} from '../../util/FreeTextUtils';
import {CodeAstUtils} from '../CodeAstUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

export class AddCommentsAstTransformer implements AstTransformer<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>): void {

    const baseVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(baseVisitor, {

      visitObjectDeclaration: (n, v) => {

        if (args.options.commentsOnTypes) {
          const comments = AddCommentsAstTransformer.getCommentsForType(args.root, n.type.omniType, args.model, args.options);
          if (comments) {
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, comments), n.comments?.kind);
          }
        }

        baseVisitor.visitObjectDeclaration(n, v);
      },

      visitField: n => {

        // Add comment if enabled on fields or on getters/accessors.
        // It is up to any transformer which adds the accessors for the field to remove the comment from the field if it should not stay there.
        if (args.options.commentsOnFields) {
          if (n.property) {
            const commentsText = AddCommentsAstTransformer.getCommentsList(args.root, n.property, args.model, args.options);
            if (commentsText) {
              n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, commentsText), n.comments?.kind);
            }
          }

          const ownerCommentsText = AddCommentsAstTransformer.getOwnerComments(n.property?.type ?? n.type.omniType, args, false);
          if (ownerCommentsText) {
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, ownerCommentsText), n.comments?.kind);
          }
        }
      },

      visitMethodDeclaration: n => {

        if (args.options.commentsOnGetters) {

          const returnNode = CodeAstUtils.getSoloReturnOfNoArgsMethod(n);
          if (returnNode) {
            const type = n.signature.type.omniType;
            if (!OmniUtil.isPrimitive(type) || (type.kind !== OmniTypeKind.VOID)) {
              const ownerCommentsText = AddCommentsAstTransformer.getOwnerComments(n.signature.type.omniType, args, false);
              if (ownerCommentsText) {
                n.signature.comments = new Code.Comment(FreeTextUtils.add(n.signature.comments?.text, ownerCommentsText), n.signature.comments?.kind);
              }
            }
          }
        }
      },

      visitConstructor: () => {
      },
    }));
  }

  public static getOwnerComments(
    type: OmniType,
    args: AstTransformerArguments<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>,
    secondary?: boolean,
  ): FreeText.FriendlyFreeTextIn | undefined {

    return AddCommentsAstTransformer.getCommentsForType(args.root, type, args.model, args.options, secondary);
  }

  public static getCommentsForType(
    root: Code.CodeRootAstNode,
    type: OmniType,
    model: OmniModel,
    options: PackageOptions & TargetOptions & CodeOptions,
    secondary?: boolean,
  ): FreeText.FriendlyFreeTextIn | undefined {

    const comments: FreeText.FriendlyFreeTextIn[] = [];

    let exampleIndex = 0;
    const handledResponse: OmniOutput[] = [];
    for (const endpoint of model.endpoints) {

      // TODO: Redo so they are only linked by "@see" and stuff?
      // TODO: Is it even correct to go through the properties?
      // TODO: Should this be more generic, to have a sort of "visitor" for all types of a GenericModel?
      if (endpoint.request.type.kind == OmniTypeKind.OBJECT && endpoint.request.type.properties) {
        for (const property of endpoint.request.type.properties) {
          if (property.type == type) {
            if (property.description) {
              comments.push(secondary ? new FreeText.FreeTextRemark(property.description) : new FreeText.FreeTextSummary(property.description));
            }
            if (property.summary) {
              comments.push(secondary ? new FreeText.FreeTextRemark(property.summary) : new FreeText.FreeTextSummary(property.summary));
            }
          }
        }
      }

      for (const response of endpoint.responses) {

        // Multiple endpoints might have the same response (like generic fallback error).
        // So we have to check that we have not already handled the GenericOutput.
        if (response.type == type && !handledResponse.includes(response)) {
          handledResponse.push(response);

          if (response.description) {
            comments.push(new FreeText.FreeTextParagraph(['As response: ', response.description]));
          }

          if (response.summary) {
            if (response.description) {
              comments.push(new FreeText.FreeTextParagraph(['<small>', response.summary, '</small>']));
            } else {
              comments.push(new FreeText.FreeTextParagraph(['As response: ', response.summary]));
            }
          }
        }
      }

      if (endpoint.examples) {
        for (const example of endpoint.examples) {
          const parameterHasType = (example.params || []).filter(it => it.type == type).length > 0;
          if (example.result.type == type || parameterHasType) {

            exampleIndex++;
            comments.push(AddCommentsAstTransformer.getExampleComments(example, exampleIndex));
          }
        }
      }
    }

    comments.push(...AddCommentsAstTransformer.getLinkCommentsForType(root, type, model, options));

    const hasExtraComments = (comments.length > 0);

    if (type.description) {
      const description = secondary ? new FreeText.FreeTextRemark(type.description) : new FreeText.FreeTextSummary(type.description);
      if (hasExtraComments) {
        comments.splice(0, 0, description);
      } else {
        comments.push(description);
      }
      secondary = true;
    }

    if (type.summary) {
      const summary = secondary ? new FreeText.FreeTextRemark(type.summary) : new FreeText.FreeTextSummary(type.summary);
      if (hasExtraComments) {
        comments.splice(0, 0, summary);
      } else {
        comments.push(summary);
      }
    }

    if (options.includeExampleCommentsMode === IncludeExampleCommentsMode.ALWAYS) {
      if (type.examples && type.examples.length > 0) {
        for (const example of type.examples) {

          let exampleValueString = Util.trimAny(JSON.stringify(example.value), `"'`);
          if (example.description) {

            // NOTE: If description exists, then perhaps it should be added as another member to `FreeTextExample`, so it can be rendered differently depending on target.
            exampleValueString = `${exampleValueString} - ${example.description}`;
          }

          comments.push(new FreeText.FreeTextExample(exampleValueString));

        }
      }
    }

    if (comments.length == 0) {
      return undefined;
    }

    return comments;
  }

  private static getLinkCommentsForType(
    root: Code.CodeRootAstNode,
    type: OmniType,
    model: OmniModel,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): FreeText.AnyFreeText[] {

    const comments: FreeText.AnyFreeText[] = [];

    if (!options.includeLinksOnType) {
      return comments;
    }

    if (type.kind == OmniTypeKind.OBJECT || type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const continuation of (model.continuations || [])) {

        // Look if any of the continuation source or targets use this type as root.
        // TODO: This could be improved by answering "true" if any in path is true, and make it relative.
        const firstMatch = continuation.mappings
          .some(mapping => {

            if (mapping.source.propertyPath?.length) {
              if (mapping.source.propertyPath[0]?.owner == type) {
                return true;
              }
            }

            if (mapping.target.propertyPath?.length) {
              if (mapping.target.propertyPath[mapping.target.propertyPath.length - 1].owner == type) {
                return true;
              }
            }

            return false;
          });

        if (firstMatch) {

          // There are links between different servers/methods
          comments.push(new FreeText.FreeTextSection(
            new FreeText.FreeTextHeader(2, 'Links'),
            continuation.mappings.map(mapping => {
              return AddCommentsAstTransformer.getMappingSourceTargetComment(root, mapping, options);
            }),
          ));
        }
      }
    }

    return comments;
  }

  public static getLink(propertyOwner: OmniType, property: OmniProperty): FreeText.FreeTextPropertyLink {

    return new FreeText.FreeTextPropertyLink(
      new Code.EdgeType(propertyOwner, false),
      property,
    );
  }

  private static getExampleComments(example: OmniExamplePairing, index: number): FreeText.FriendlyFreeTextIn {

    const commentLines: FreeText.AnyFreeText[] = [];

    const params = (example.params || []);
    if (params.length > 0) {

      const lines: FreeText.FreeTextLine[] = [];
      for (const param of params) {

        lines.push(new FreeText.FreeTextLine([
          `<dt>`,
          AddCommentsAstTransformer.getLink(param.property.owner, param.property),
          `</dt>`,
        ]));

        lines.push(new FreeText.FreeTextLine([
          `<dd>`,
          new FreeText.FreeText(`${JSON.stringify(param.value)}`),
          `</dd>`,
        ]));
      }

      if (lines.length > 0) {
        commentLines.push(new FreeText.FreeTextParagraph([
          new FreeText.FreeTextLine(['<strong>', `📥 Request`, '</strong>']),
          [
            new FreeText.FreeTextLine('<dl>'),
            new FreeText.FreeTextIndent(lines),
            new FreeText.FreeTextLine('</dl>'),
          ],
        ]));
      }
    }

    if (example.result.description || example.result.summary || example.result.value) {

      const lines: FreeText.FreeTextLine[] = [];

      if (example.result.summary && example.result.description) {

        // Only show summary if no description (since it will be shown as the title)
        lines.push(new FreeText.FreeTextLine(new FreeText.FreeTextSummary(`💡 ${example.result.summary}`)));
      }

      // WRONG CLASS!
      if (example.result.value) {

        let prettyValue: string;
        if (typeof example.result.value == 'string') {
          prettyValue = example.result.value;
        } else {
          prettyValue = JSON.stringify(example.result.value, null, 2);
        }

        lines.push(new FreeText.FreeTextLine(`<pre>{@code ${prettyValue}}</pre>`));
      }

      if (lines.length > 0) {
        // commentLines.push(new Java.FreeTextSection(3, `📤 Response - ${example.result.name}`, lines));
        const displayName = example.result.description || example.result.summary || example.result.name;
        commentLines.push(new FreeText.FreeTextLine(new FreeText.FreeTextParagraph([
          new FreeText.FreeTextLine(['<strong>', `📤 Response`, '</strong>', ` - ${displayName}`]),
          ...lines,
        ])));
      }
    }

    return [
      new FreeText.FreeTextLine('<hr />'),

      // TODO: Replace this with managed node types and not this hardcoded string
      new FreeText.FreeTextLine([
        '<strong>',
        `Example #${index}`,
        '</strong>',
        ` - ${example.description || example.name}`,
        (example.summary ? ` - ${example.summary}` : ''),
      ]),
      new FreeText.FreeTextIndent(
        commentLines,
      ),
    ];
  }

  private static getMappingSourceTargetComment(
    root: Code.CodeRootAstNode,
    mapping: OmniLinkMapping,
    options: PackageOptions & TargetOptions & CodeOptions,
    only: 'source' | 'target' | undefined = undefined,
  ): FreeText.FriendlyFreeTextIn {

    const nameResolver = root.getNameResolver();

    const sourceLinks: FreeText.FriendlyFreeTextIn[] = [];
    const targetLinks: FreeText.FriendlyFreeTextIn[] = [];

    if (!only || only == 'source') {
      if (mapping.source.propertyPath) {
        const sourcePath = mapping.source.propertyPath || [];
        for (let i = 0; i < sourcePath.length; i++) {
          sourceLinks.push(AddCommentsAstTransformer.getLink(sourcePath[i].owner, sourcePath[i]));
        }
      } else if (mapping.source.constantValue) {
        sourceLinks.push(JSON.stringify(mapping.source.constantValue));
      }
    }

    if (!only || only == 'target') {
      const targetPath = mapping.target.propertyPath;
      for (let i = 0; i < targetPath.length; i++) {
        const prop = targetPath[i];

        const investigatedName = nameResolver.investigate({type: prop.owner, options: options});
        const typeName = nameResolver.build({name: investigatedName, with: NameParts.FULL});
        const propertyName = OmniUtil.getPropertyName(prop.name);

        if (propertyName === undefined) {
          continue;
        }

        if (i < targetPath.length - 1) {

          // TODO: This is wrong, since in some languages it is not a method call. Need to add a new "GetterCall" or similar abstract node
          const memberRef = new Code.MethodCall(
            new Code.GetterIdentifier(new Code.Identifier(propertyName), prop.type),
            new Code.ArgumentList(),
          );
          targetLinks.push(new FreeText.FreeTextMemberLink(new FreeText.FreeText(typeName), memberRef));

        } else {
          // TODO: Possible to find the *actual* setter/field and use that as the @link?
          //       We should not need to check for immutability here, should be centralized somehow
          if (options.immutable) {

            targetLinks.push(new FreeText.FreeTextMemberLink(new FreeText.FreeText(typeName), new FreeText.FreeText(propertyName)));
          } else {
            targetLinks.push(new FreeText.FreeTextMemberLink(new FreeText.FreeText(typeName), new FreeText.FreeText(propertyName)));
          }
        }
      }
    }

    // TODO: This is very wrong, needs updating once big refactor is in place
    if (only == 'source') {
      return new FreeText.FreeTexts(sourceLinks.map(it => new FreeText.FreeTextSee(it, 'Source')));
      // return `@see Source ${sourceLinks.join('.')}`;
    } else if (only == 'target') {
      return new FreeText.FreeTexts(sourceLinks.map(it => new FreeText.FreeTextSee(it, 'Use')));

      // return `@see Use ${targetLinks.join('.')}`;
    } else {
      return `Source: ${sourceLinks.join('.')}\nTarget: ${targetLinks.join('.')}`;
    }
  }

  public static getCommentsList(
    root: Code.CodeRootAstNode,
    property: OmniProperty,
    model: OmniModel,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): FreeText.FriendlyFreeTextIn | undefined {

    const comments: FreeText.AnyFreeText[] = [];

    let summariesAdded = 0;

    if (property.summary && !this.hasComment(property.summary, comments)) {
      if (AddCommentsAstTransformer.addComment(new FreeText.FreeTextSummary(property.summary), comments)) {
        summariesAdded++;
      }
    }

    if (property.description && !this.hasComment(property.description, comments)) {

      // Sometimes a description can be set both to the property itself and its type.
      const comment = (summariesAdded == 0)
        ? new FreeText.FreeTextSummary(property.description)
        : new FreeText.FreeTextParagraph(property.description);

      if (AddCommentsAstTransformer.addComment(comment, comments)) {
        if (comment instanceof FreeText.FreeTextSummary) {
          summariesAdded++;
        }
      }
    }

    if (property.deprecated) {
      // TODO: Move to a specific FreeText class, so different targets can render it differently
      AddCommentsAstTransformer.addComment(new FreeText.FreeTextLine('@deprecated'), comments);
    }

    if (property.type.kind != OmniTypeKind.OBJECT) {

      // If the type is not an object, then we will never create a class just for its sake.
      // So we should propagate all the examples and all other data we can find about it, to the property's comments.
      let typeComment = AddCommentsAstTransformer.getCommentsForType(root, property.type, model, options);

      if (typeComment) {
        if (typeComment instanceof Code.FreeTextSummary && summariesAdded > 0) {
          typeComment = new Code.FreeTextParagraph(typeComment.content);
        }

        AddCommentsAstTransformer.addComment(typeComment, comments);
      }

      if (property.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        const nameResolver = root.getNameResolver();

        const staticArrayStrings = property.type.properties.map((prop, idx) => {

          const investigatedName = nameResolver.investigate({type: prop.type, options: options});
          const typeName = nameResolver.build({name: investigatedName, with: NameParts.FULL});

          const parameterName = OmniUtil.getPropertyName(prop.name);
          const description = prop.description || prop.type.description;
          return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
        });

        this.addComment(new FreeText.FreeTextLine(`Array with parameters in this order:\n${staticArrayStrings.join('\n')}`), comments);
      }
    }

    for (const linkComment of AddCommentsAstTransformer.getLinkCommentsForProperty(root, property, model, options)) {
      this.addComment(linkComment, comments);
    }

    return (comments.length > 0) ? comments : undefined;
  }

  private static addComment(comment: FreeText.FriendlyFreeTextIn, comments: FreeText.FriendlyFreeTextIn[]): boolean {

    const commentText = FreeTextUtils.getText(comment);
    if (!commentText || AddCommentsAstTransformer.hasComment(commentText, comments)) {
      return false;
    } else {
      comments.push(comment);
      return true;
    }
  }

  private static hasComment(needle: string, freeTexts: FreeText.FriendlyFreeTextIn[]): boolean {

    for (const freeText of freeTexts) {

      if (typeof freeText == 'string') {
        if (freeText == needle) {
          return true;
        }
      } else if (freeText instanceof FreeText.FreeText) {
        if (freeText.text == needle) {
          return true;
        }
      } else if ('child' in freeText) {

        if (this.hasComment(needle, [freeText.child])) {
          return true;
        }
      } else if (freeText instanceof FreeText.FreeTextSection) {
        if (this.hasComment(needle, [freeText.header])) {
          return true;
        }

        if (this.hasComment(needle, [freeText.content])) {
          return true;
        }
      }
    }

    return false;
  }

  private static getLinkCommentsForProperty(
    root: Code.CodeRootAstNode,
    property: OmniProperty,
    model: OmniModel,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): FreeText.FriendlyFreeTextIn[] {

    const comments: FreeText.FriendlyFreeTextIn[] = [];

    if (!options.includeLinksOnProperty) {
      return comments;
    }

    const linkComments: FreeText.FriendlyFreeTextIn[] = [];
    for (const continuation of (model.continuations || [])) {
      for (const mapping of continuation.mappings) {
        if (mapping.source.propertyPath?.length) {
          if (mapping.source.propertyPath[mapping.source.propertyPath.length - 1] == property) {
            linkComments.push(AddCommentsAstTransformer.getMappingSourceTargetComment(root, mapping, options, 'target'));
          }
        }

        if (mapping.target.propertyPath.length) {
          if (mapping.target.propertyPath[mapping.target.propertyPath.length - 1] == property) {
            linkComments.push(AddCommentsAstTransformer.getMappingSourceTargetComment(root, mapping, options, 'source'));
          }
        }
      }
    }

    if (linkComments.length > 0) {
      comments.push(linkComments.join('\n'));
    }

    return comments;
  }
}
