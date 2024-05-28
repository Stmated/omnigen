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
import {OmniUtil, Util, VisitorFactoryManager} from '@omnigen/core-util';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '../Code';
import * as FreeText from '../FreeText';
import {CodeOptions, IncludeExampleCommentsMode} from '../../options/CodeOptions';
import {FreeTextUtils} from '../../util/FreeTextUtils';

const logger = LoggerFactory.create(import.meta.url);

export class AddCommentsAstTransformer implements AstTransformer<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>): void {

    const baseVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(baseVisitor, {

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

        if (args.options.commentsOnFields) { // } || (args.options.commentsOnGetters && n.property)) {
          const ownerCommentsText = AddCommentsAstTransformer.getOwnerComments(n, args);
          if (ownerCommentsText) {
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, ownerCommentsText), n.comments?.kind);
          }

          if (n.property) {

            const commentsText = AddCommentsAstTransformer.getCommentsList(args.root, n.property, args.model, args.options);
            if (commentsText) {
              n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, commentsText), n.comments?.kind);
            }
          }
        }
      },

      visitMethodDeclaration: n => {

        if (args.options.commentsOnGetters) {
          if (!n.signature.parameters || n.signature.parameters.children.length == 0) {
            const type = n.signature.type.omniType;
            if (!OmniUtil.isPrimitive(type) || type.kind != OmniTypeKind.VOID) {
              const ownerCommentsText = AddCommentsAstTransformer.getOwnerComments(n.signature, args);
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
    node: {type: TypeNode, comments?: Code.Comment | undefined},
    args: AstTransformerArguments<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>,
  ): FreeText.FriendlyFreeTextIn | undefined {

    return AddCommentsAstTransformer.getCommentsForType(args.root, node.type.omniType, args.model, args.options);
  }

  public static getCommentsForType(
    root: Code.CodeRootAstNode,
    type: OmniType,
    model: OmniModel,
    options: PackageOptions & TargetOptions & CodeOptions,
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
              comments.push(new FreeText.FreeTextSummary(property.description));
            }
            if (property.summary) {
              comments.push(new FreeText.FreeTextSummary(property.summary));
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
      if (hasExtraComments) {
        comments.splice(0, 0, new FreeText.FreeTextSummary(type.description));
      } else {
        comments.push(new FreeText.FreeTextSummary(type.description));
      }
    }

    if (type.summary) {
      if (hasExtraComments) {
        comments.splice(0, 0, new FreeText.FreeTextSummary(type.summary));
      } else {
        comments.push(new FreeText.FreeTextSummary(type.summary));
      }
    }

    if (options.includeExampleCommentsMode == IncludeExampleCommentsMode.ALWAYS) {
      if (type.examples && type.examples.length > 0) {
        for (const example of type.examples) {
          comments.push(new FreeText.FreeTextExample(Util.trimAny(JSON.stringify(example.value), `"'`)));
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
        // const typeName = JavaUtil.getFullyQualifiedName(prop.owner);
        const propertyName = OmniUtil.getPropertyName(prop.name);

        if (propertyName === undefined) {
          continue;
        }

        // let memberName: string;
        if (i < targetPath.length - 1) {
          // memberName = `${JavaUtil.getGetterName(propertyName, prop.type)}()`;

          // TODO: This is wrong, since in some languages it is not a method call. Need to add a new "GetterCall" or similar abstract node
          const memberRef = new Code.MethodCall(
            new Code.GetterIdentifier(
              new Code.Identifier(propertyName),
              root.getAstUtils().createTypeNode(prop.type),
            ),
            new Code.ArgumentList(),
          );
          targetLinks.push(new FreeText.FreeTextMemberLink(new FreeText.FreeText(typeName), memberRef));

        } else {
          // TODO: Possible to find the *actual* setter/field and use that as the @link?
          //       We should not need to check for immutability here, should be centralized somehow
          if (options.immutableModels) {

            targetLinks.push(new FreeText.FreeTextMemberLink(new FreeText.FreeText(typeName), new FreeText.FreeText(propertyName)));
            // memberName = propertyName;
          } else {
            targetLinks.push(new FreeText.FreeTextMemberLink(new FreeText.FreeText(typeName), new FreeText.FreeText(propertyName)));
            // memberName = `${JavaUtil.getSetterName(propertyName)}(${JavaUtil.getFullyQualifiedName(prop.type)})`;
          }
        }

        // targetLinks.push(`{@link ${typeName}#${memberName}}`);
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

    if (property.description && !this.hasComment(property.description, comments)) {

      // Sometimes a description can be set both to the property itself and its type.
      AddCommentsAstTransformer.addComment(new FreeText.FreeTextSummary(property.description), comments);
    }

    if (property.summary && !this.hasComment(property.summary, comments)) {
      AddCommentsAstTransformer.addComment(new FreeText.FreeTextSummary(property.summary), comments);
    }

    if (property.deprecated) {
      // TODO: Move to a specific FreeText class, so different targets can render it differently
      AddCommentsAstTransformer.addComment(new FreeText.FreeTextLine('@deprecated'), comments);
    }

    if (property.type.kind != OmniTypeKind.OBJECT) {

      // If the type is not an object, then we will never create a class just for its sake.
      // So we should propagate all the examples and all other data we can find about it, to the property's comments.
      const typeComment = AddCommentsAstTransformer.getCommentsForType(root, property.type, model, options);

      if (typeComment) {
        AddCommentsAstTransformer.addComment(typeComment, comments);
      }

      if (property.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        const nameResolver = root.getNameResolver();

        const staticArrayStrings = property.type.properties.map((prop, idx) => {

          const investigatedName = nameResolver.investigate({type: prop.type, options: options});
          const typeName = nameResolver.build({name: investigatedName, with: NameParts.FULL});
          // const typeName = JavaUtil.getFullyQualifiedName(prop.type);

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

    const commentText = AddCommentsAstTransformer.getText(comment);
    if (!commentText || AddCommentsAstTransformer.hasComment(commentText, comments)) {
      return false;
    } else {
      comments.push(comment);
      return true;
    }
  }

  private static getText(text: FreeText.FriendlyFreeTextIn): string | undefined {

    if (typeof text == 'string') {
      return text;
    }

    if (text instanceof FreeText.FreeText) {
      return text.text;
    }

    return undefined;
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
