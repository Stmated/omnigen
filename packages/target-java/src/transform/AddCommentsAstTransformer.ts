import {OmniExamplePairing, OmniLinkMapping, OmniModel, OmniOutput, OmniProperty, OmniType, OmniTypeKind} from '@omnigen/core';
import {IncludeExampleCommentsMode, JavaOptions} from '../options';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform';
import * as Java from '../ast';
import {JavaUtil} from '../util';
import {OmniUtil, Util, VisitorFactoryManager} from '@omnigen/core-util';
import {LoggerFactory} from '@omnigen/core-log';
import {FreeTextUtils} from '../util/FreeTextUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

export class AddCommentsAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const baseVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(baseVisitor, {

      visitObjectDeclaration: (n, v) => {

        if (args.options.commentsOnTypes) {
          const comments = AddCommentsAstTransformer.getCommentsForType(n.type.omniType, args.model, args.options);
          if (comments) {
            n.comments = new Java.Comment(FreeTextUtils.add(n.comments?.text, comments), n.comments?.kind);

            // if (!n.comments) {
            //   n.comments = new Java.Comment(comments);
            // } else {
            //   n.comments = new Java.Comment(new Java.FreeTexts(new Java.FreeTextLine(n.comments.text), comments), n.comments.kind);
            // }
          }
        }

        // Then keep visiting downwards.
        baseVisitor.visitObjectDeclaration(n, v);
      },

      visitField: n => {

        if (args.options.commentsOnFields) {
          this.addToCommentsOwner(n, args);

          if (n.property) {

            const comments = this.getCommentsList(n.property, args.model, args.options);
            if (comments) {
              n.comments = new Java.Comment(FreeTextUtils.add(n.comments?.text, comments), n.comments?.kind);

              // if (!n.comments) {
              //   n.comments = new Java.Comment(comments);
              // } else {
              //   n.comments = new Java.Comment(new Java.FreeTexts(new Java.FreeTextLine(n.comments.text), comments), n.comments.kind);
              // }
            }
          }
        }
      },

      visitMethodDeclaration: n => {

        if (args.options.commentsOnGetters) {
          if (!n.signature.parameters || n.signature.parameters.children.length == 0) {
            const type = n.signature.type.omniType;
            if (!OmniUtil.isPrimitive(type) || type.kind != OmniTypeKind.VOID) {
              this.addToCommentsOwner(n.signature, args);
            }
          }
        }
      },

      visitConstructor: () => {
      },
    }));
  }

  private addToCommentsOwner(node: Java.Field | Java.MethodDeclarationSignature, args: JavaAstTransformerArgs) {

    const comments = AddCommentsAstTransformer.getCommentsForType(node.type.omniType, args.model, args.options);
    if (comments) {
      node.comments = new Java.Comment(FreeTextUtils.add(node.comments?.text, comments), node.comments?.kind);
    }
  }

  public static getCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): Java.FriendlyFreeTextIn | undefined {

    const comments: Java.FriendlyFreeTextIn[] = [];

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
              comments.push(new Java.FreeTextSummary(property.description));
            }
            if (property.summary) {
              comments.push(new Java.FreeTextSummary(property.summary));
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
            comments.push(new Java.FreeTextParagraph(['As response: ', response.description]));
          }

          if (response.summary) {
            if (response.description) {
              comments.push(new Java.FreeTextParagraph(['<small>', response.summary, '</small>']));
            } else {
              comments.push(new Java.FreeTextParagraph(['As response: ', response.summary]));
            }
          }
        }
      }

      for (const example of endpoint.examples) {
        const parameterHasType = (example.params || []).filter(it => it.type == type).length > 0;
        if (example.result.type == type || parameterHasType) {

          exampleIndex++;
          comments.push(AddCommentsAstTransformer.getExampleComments(example, exampleIndex));
        }
      }
    }

    comments.push(...AddCommentsAstTransformer.getLinkCommentsForType(type, model, options));

    const hasExtraComments = (comments.length > 0);

    if (type.description) {
      if (hasExtraComments) {
        comments.splice(0, 0, new Java.FreeTextSummary(type.description));
      } else {
        comments.push(new Java.FreeTextSummary(type.description));
      }
    }

    if (type.summary) {
      if (hasExtraComments) {
        comments.splice(0, 0, new Java.FreeTextSummary(type.summary));
      } else {
        comments.push(new Java.FreeTextSummary(type.summary));
      }
    }

    if (options.includeExampleCommentsMode == IncludeExampleCommentsMode.ALWAYS) {
      if (type.examples && type.examples.length > 0) {
        for (const example of type.examples) {
          comments.push(new Java.FreeTextExample(Util.trimAny(JSON.stringify(example.value), `"'`)));
        }
      }
    }

    if (comments.length == 0) {
      return undefined;
    }

    return comments;
  }

  public static getLinkCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): Java.AnyFreeText[] {

    const comments: Java.AnyFreeText[] = [];

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
          comments.push(new Java.FreeTextSection(
            new Java.FreeTextHeader(2, 'Links'),
            continuation.mappings.map(mapping => {
              return AddCommentsAstTransformer.getMappingSourceTargetComment(mapping, options);
            }),
          ));
        }
      }
    }

    return comments;
  }

  public static getLink(propertyOwner: OmniType, property: OmniProperty): Java.FreeTextPropertyLink {

    return new Java.FreeTextPropertyLink(
      new Java.EdgeType(propertyOwner, false),
      property,
    );
  }

  public static getExampleComments(example: OmniExamplePairing, index: number): Java.FriendlyFreeTextIn {

    const commentLines: Java.AnyFreeText[] = [];

    const params = (example.params || []);
    if (params.length > 0) {

      const lines: Java.FreeTextLine[] = [];
      for (const param of params) {

        lines.push(new Java.FreeTextLine([
          `<dt>`,
          AddCommentsAstTransformer.getLink(param.property.owner, param.property),
          `</dt>`,
        ]));

        lines.push(new Java.FreeTextLine([
          `<dd>`,
          new Java.FreeText(`${JSON.stringify(param.value)}`),
          `</dd>`,
        ]));
      }

      if (lines.length > 0) {
        commentLines.push(new Java.FreeTextParagraph([
          new Java.FreeTextLine(['<strong>', `📥 Request`, '</strong>']),
          [
            new Java.FreeTextLine('<dl>'),
            new Java.FreeTextIndent(lines),
            new Java.FreeTextLine('</dl>'),
          ],
        ]));
      }
    }

    if (example.result.description || example.result.summary || example.result.value) {

      const lines: Java.FreeTextLine[] = [];

      if (example.result.summary && example.result.description) {

        // Only show summary if no description (since it will be shown as the title)
        lines.push(new Java.FreeTextLine(new Java.FreeTextSummary(`💡 ${example.result.summary}`)));
      }

      // WRONG CLASS!
      if (example.result.value) {

        let prettyValue: string;
        if (typeof example.result.value == 'string') {
          prettyValue = example.result.value;
        } else {
          prettyValue = JSON.stringify(example.result.value, null, 2);
        }

        lines.push(new Java.FreeTextLine(`<pre>{@code ${prettyValue}}</pre>`));
      }

      if (lines.length > 0) {
        // commentLines.push(new Java.FreeTextSection(3, `📤 Response - ${example.result.name}`, lines));
        const displayName = example.result.description || example.result.summary || example.result.name;
        commentLines.push(new Java.FreeTextLine(new Java.FreeTextParagraph([
          new Java.FreeTextLine(['<strong>', `📤 Response`, '</strong>', ` - ${displayName}`]),
          ...lines,
        ])));
      }
    }

    return [
      new Java.FreeTextLine('<hr />'),

      // TODO: Replace this with managed node types and not this hardcoded string
      new Java.FreeTextLine([
        '<strong>',
        `Example #${index}`,
        '</strong>',
        ` - ${example.description || example.name}`,
        (example.summary ? ` - ${example.summary}` : ''),
      ]),
      new Java.FreeTextIndent(
        commentLines,
      ),
    ];
  }

  public static getMappingSourceTargetComment(
    mapping: OmniLinkMapping,
    options: JavaOptions,
    only: 'source' | 'target' | undefined = undefined,
  ): Java.FriendlyFreeTextIn {

    const sourceLinks: Java.FriendlyFreeTextIn[] = [];
    const targetLinks: Java.FriendlyFreeTextIn[] = [];

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

        const typeName = JavaUtil.getFullyQualifiedName(prop.owner);
        const propertyName = OmniUtil.getPropertyName(prop.name);

        if (propertyName === undefined) {
          continue;
        }

        let memberName: string;
        if (i < targetPath.length - 1) {
          memberName = `${JavaUtil.getGetterName(propertyName, prop.type)}()`;
        } else {
          // TODO: Possible to find the *actual* setter/field and use that as the @link?
          //       We should not need to check for immutability here, should be centralized somehow
          if (options.immutableModels) {
            memberName = propertyName;
          } else {
            memberName = `${JavaUtil.getSetterName(propertyName)}(${JavaUtil.getFullyQualifiedName(prop.type)})`;
          }
        }

        targetLinks.push(`{@link ${typeName}#${memberName}}`);
      }
    }

    if (only == 'source') {
      return `@see Source ${sourceLinks.join('.')}`;
    } else if (only == 'target') {
      return `@see Use ${targetLinks.join('.')}`;
    } else {
      return `Source: ${sourceLinks.join('.')}\nTarget: ${targetLinks.join('.')}`;
    }
  }

  private getCommentsList(property: OmniProperty, model: OmniModel, options: JavaOptions): Java.FriendlyFreeTextIn | undefined {

    const comments: Java.AnyFreeText[] = [];

    if (property.description && !this.hasComment(property.description, comments)) {

      // Sometimes a description can be set both to the property itself and its type.
      this.addComment(new Java.FreeTextSummary(property.description), comments);
    }

    if (property.summary && !this.hasComment(property.summary, comments)) {
      this.addComment(new Java.FreeTextSummary(property.summary), comments);
    }

    if (property.deprecated) {
      // TODO: Move to a specific FreeText class, so different targets can render it differently
      this.addComment(new Java.FreeTextLine('@deprecated'), comments);
    }

    if (property.type.kind != OmniTypeKind.OBJECT) {

      // If the type is not an object, then we will never create a class just for its sake.
      // So we should propagate all the examples and all other data we can find about it, to the property's comments.
      const typeComment = AddCommentsAstTransformer.getCommentsForType(property.type, model, options);

      if (typeComment) {
        this.addComment(typeComment, comments);
      }

      if (property.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        const staticArrayStrings = property.type.properties.map((prop, idx) => {
          const typeName = JavaUtil.getFullyQualifiedName(prop.type);
          const parameterName = OmniUtil.getPropertyName(prop.name);
          const description = prop.description || prop.type.description;
          return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
        });

        this.addComment(new Java.FreeTextLine(`Array with parameters in this order:\n${staticArrayStrings.join('\n')}`), comments);
      }
    }

    for (const linkComment of this.getLinkCommentsForProperty(property, model, options)) {
      this.addComment(linkComment, comments);
    }

    return (comments.length > 0) ? comments : undefined;
  }

  private addComment(comment: Java.FriendlyFreeTextIn, comments: Java.FriendlyFreeTextIn[]): boolean {

    const commentText = this.getText(comment);
    if (!commentText || this.hasComment(commentText, comments)) {
      return false;
    } else {
      comments.push(comment);
      return true;
    }
  }

  private getText(text: Java.FriendlyFreeTextIn): string | undefined {

    if (typeof text == 'string') {
      return text;
    }

    if (text instanceof Java.FreeText) {
      return text.text;
    }

    return undefined;
  }

  private hasComment(needle: string, freeTexts: Java.FriendlyFreeTextIn[]): boolean {

    for (const freeText of freeTexts) {

      if (typeof freeText == 'string') {
        if (freeText == needle) {
          return true;
        }
      } else if (freeText instanceof Java.FreeText) {
        if (freeText.text == needle) {
          return true;
        }
      } else if ('child' in freeText) {

        if (this.hasComment(needle, [freeText.child])) {
          return true;
        }
      } else if (freeText instanceof Java.FreeTextSection) {
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

  private getLinkCommentsForProperty(property: OmniProperty, model: OmniModel, options: JavaOptions): Java.FriendlyFreeTextIn[] {

    const comments: Java.FriendlyFreeTextIn[] = [];

    if (!options.includeLinksOnProperty) {
      return comments;
    }

    const linkComments: Java.FriendlyFreeTextIn[] = [];
    for (const continuation of (model.continuations || [])) {
      for (const mapping of continuation.mappings) {
        if (mapping.source.propertyPath?.length) {
          if (mapping.source.propertyPath[mapping.source.propertyPath.length - 1] == property) {
            linkComments.push(AddCommentsAstTransformer.getMappingSourceTargetComment(mapping, options, 'target'));
          }
        }

        if (mapping.target.propertyPath.length) {
          if (mapping.target.propertyPath[mapping.target.propertyPath.length - 1] == property) {
            linkComments.push(AddCommentsAstTransformer.getMappingSourceTargetComment(mapping, options, 'source'));
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
