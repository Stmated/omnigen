import {
  OmniExamplePairing,
  OmniLinkMapping,
  OmniModel,
  OmniOutput,
  OmniPrimitiveKind,
  OmniProperty,
  OmniType,
  OmniTypeKind,
} from '@omnigen/core';
import {JavaOptions} from '../options/index.js';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform/index.js';
import * as Java from '../ast/index.js';
import {JavaUtil} from '../util/index.js';
import {VisitorFactoryManager} from '@omnigen/core-util';

export class AddCommentsAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const baseVisitor = AbstractJavaAstTransformer.JAVA_VISITOR;
    args.root.visit(VisitorFactoryManager.create(baseVisitor, {

      visitObjectDeclaration: (node, visitor) => {

        if (args.options.commentsOnTypes) {
          const comments = AddCommentsAstTransformer.getCommentsForType(node.type.omniType, args.model, args.options);
          if (comments) {
            if (!node.comments) {
              node.comments = new Java.CommentBlock(comments);
            } else {
              node.comments.text = [new Java.FreeTextLine(node.comments.text), comments];
            }
          }
        }

        // Then keep visiting downwards.
        baseVisitor.visitObjectDeclaration(node, visitor);
      },

      visitField: node => {

        if (args.options.commentsOnFields) {
          this.addToCommentsOwner(node, args);

          if (node.property) {

            const comments = this.getCommentsList(node.property, args.model, args.options);
            if (comments) {
              if (!node.comments) {
                node.comments = new Java.CommentBlock(comments);
              } else {
                node.comments.text = [new Java.FreeTextLine(node.comments.text), comments];
              }
            }
          }
        }
      },

      visitMethodDeclaration: node => {

        if (args.options.commentsOnGetters) {
          if (!node.signature.parameters || node.signature.parameters.children.length == 0) {
            const type = node.signature.type.omniType;
            if (type.kind != OmniTypeKind.PRIMITIVE || type.primitiveKind != OmniPrimitiveKind.VOID) {
              this.addToCommentsOwner(node.signature, args);
            }
          }
        }
      },

      visitConstructor: (node, visitor) => {

      },

      visitRuntimeTypeMapping: (node, visitor) => {

        // t => BaseJavaAstTransformer.getCommentsForType(t, model, options),

        // const comment = commentSupplier(typedGetter.signature.type.omniType);
        // typedGetter.signature.comments = (comment) ? new CommentBlock(comment) : undefined;
      },
    }));
  }

  private addToCommentsOwner(node: Java.Field | Java.MethodDeclarationSignature, args: JavaAstTransformerArgs) {

    const comments = AddCommentsAstTransformer.getCommentsForType(node.type.omniType, args.model, args.options);
    if (comments) {
      if (!node.comments) {
        node.comments = new Java.CommentBlock(comments);
      } else {
        node.comments.text = [new Java.FreeTextLine(node.comments.text), comments];
      }
    }


  }

  public static getCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): Java.FreeTextType | undefined {

    const comments: Java.FreeTextType[] = [];

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
              comments.push(new Java.FreeTextParagraph(new Java.FreeText(property.description)));
            }
            if (property.summary) {
              comments.push(new Java.FreeTextParagraph(new Java.FreeText(property.summary)));
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
        comments.splice(0, 0, new Java.FreeTextLine(type.description));
      } else {
        comments.push(type.description);
      }
    }
    if (type.summary) {
      if (hasExtraComments) {
        comments.splice(0, 0, new Java.FreeTextLine(type.summary));
      } else {
        comments.push(type.summary);
      }
    }

    if (comments.length == 0) {
      return undefined;
    }

    return comments;
  }

  public static getLinkCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): Java.FreeTextType[] {

    const comments: Java.FreeTextType[] = [];

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
            2, 'Links',
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
      new Java.RegularType(propertyOwner, false),
      property,
    );
  }

  public static getExampleComments(example: OmniExamplePairing, index: number): Java.FreeTextType {

    const commentLines: Java.FreeTextType[] = [];

    // if (example.description) {
    //   commentLines.push(new Java.FreeTextParagraph(example.description));
    // }
    // if (example.summary) {
    //   commentLines.push(new Java.FreeTextParagraph(example.summary));
    // }

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

      // if (example.result.description) {
      //   lines.push(new Java.FreeTextLine(new Java.FreeText(`💡 ${example.result.description}`)));
      // }
      if (example.result.summary && example.result.description) {

        // Only show summary if no description (since it will be shown as the title)
        lines.push(new Java.FreeTextLine(new Java.FreeText(`💡 ${example.result.summary}`)));
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
        // commentLines.push(lines));
      }
    }

    return [
      new Java.FreeTextLine('<hr />'),
      // new Java.FreeTextHeader(2, `Example #${index + 1}`),
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
  ): Java.FreeTextType {

    const sourceLinks: Java.FreeTextType[] = [];
    const targetLinks: Java.FreeTextType[] = [];

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

        const typeName = JavaUtil.getFullyQualifiedName(targetPath[i].owner);

        const prop = targetPath[i];
        let memberName: string;
        if (i < targetPath.length - 1) {
          memberName = `${JavaUtil.getGetterName(prop.name, prop.type)}()`;
        } else {
          // TODO: Possible to find the *actual* setter/field and use that as the @link?
          //       We should not need to check for immutability here, should be centralized somehow
          if (options.immutableModels) {
            memberName = prop.name;
          } else {
            memberName = `${JavaUtil.getSetterName(prop.name)}(${JavaUtil.getFullyQualifiedName(prop.type)})`;
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

  private getCommentsList(property: OmniProperty, model: OmniModel, options: JavaOptions): Java.FreeTextType | undefined {

    const comments: Java.FreeTextType[] = [];

    if (property.description && !this.hasComment(property.description, comments)) {

      // Sometimes a description can be set both to the property itself and its type.
      comments.push(new Java.FreeTextLine(property.description));
    }

    if (property.summary && !this.hasComment(property.summary, comments)) {
      comments.push(new Java.FreeTextLine(property.summary));
    }

    if (property.deprecated) {
      comments.push(new Java.FreeTextLine('@deprecated'));
    }

    if (property.type.kind != OmniTypeKind.OBJECT) {

      // If the type is not an object, then we will never create a class just for its sake.
      // So we should propagate all the examples and all other data we can find about it, to the property's comments.
      const typeComment = AddCommentsAstTransformer.getCommentsForType(property.type, model, options);

      if (typeComment) {
        comments.push(typeComment);
      }

      if (property.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        const staticArrayStrings = property.type.properties.map((prop, idx) => {
          const typeName = JavaUtil.getFullyQualifiedName(prop.type);
          const parameterName = prop.name;
          const description = prop.description || prop.type.description;
          return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
        });

        comments.push(new Java.FreeTextLine(`Array with parameters in this order:\n${staticArrayStrings.join('\n')}`));
      }
    }

    comments.push(...this.getLinkCommentsForProperty(property, model, options));

    return (comments.length > 0) ? comments : undefined;
  }

  private hasComment(needle: string, freeTexts: Java.FreeTextType[]): boolean {

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

  private getLinkCommentsForProperty(property: OmniProperty, model: OmniModel, options: JavaOptions): Java.FreeTextType[] {

    const comments: Java.FreeTextType[] = [];

    if (!options.includeLinksOnProperty) {
      return comments;
    }

    const linkComments: Java.FreeTextType[] = [];
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
