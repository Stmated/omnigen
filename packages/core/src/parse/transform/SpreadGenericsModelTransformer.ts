import {OmniGenericSourceIdentifierType, OmniGenericTargetIdentifierType, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniType, OmniTypeKind} from '@omnigen/api';
import {OmniUtil} from '../OmniUtil';
import {LoggerFactory} from '@omnigen/core-log';
import {ProxyReducerOmni2} from '../../reducer2/ProxyReducerOmni2.ts';

const logger = LoggerFactory.create(import.meta.url);

type SourceIdentifierPath = Array<OmniGenericSourceIdentifierType>;

type Replacement = {
  source: OmniGenericSourceType;
  oldSourceId: OmniGenericSourceIdentifierType;
  newSourceId: OmniGenericSourceIdentifierType;
  path: SourceIdentifierPath
};

/**
 * Some languages allow wildcard generics to say "anything goes here".
 *
 * But languages like C# requires it to be expanded/spread/resolved, so that the wildcard generic is converted into a generic parameter with no bound, and given explicitly.
 *
 * Will take `Foo extends Bar<?>` and turn it into `Foo<T> extends Bar<T>`
 *
 * TODO: Need to use the new reduce pattern, so we can get rid of `visitTypesDepthFirst`
 */
export class SpreadGenericsModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    // TODO: Rewrite the code to be easier to understand and maintain, to do things in steps and with proper immutability.
    // First we search though the whole model for nested generic sources which needs to be spread/expanded.
    // const sourcePath: OmniGenericSourceType[] = [];
    // const sourceIdPath: OmniGenericSourceIdentifierType[] = [];
    // ProxyReducerOmni2.builder().reduce(args.model, {immutable: true}, {
    //   GENERIC_SOURCE: (source, r) => {
    //
    //     sourcePath.push(source);
    //     r.callBase();
    //     sourcePath.pop();
    //
    //     // Find the second-order
    //     // ProxyReducerOmni2.builder().reduce(source, {immutable: true}, {
    //     //   GENERIC_SOURCE_IDENTIFIER: (source, r) => {
    //     //
    //     //
    //     //   },
    //     // });
    //     // const newSourceIdentifiers =
    //   },
    //   GENERIC_SOURCE_IDENTIFIER: (sourceId, r) => {
    //
    //     sourceIdPath.push(sourceId);
    //     r.callBase();
    //     sourceIdPath.pop();
    //   },
    // });


    // TODO: More should be done here through relying on the IDs and not the object identity; relying on identity is brittle and can lead to bugs
    const replacements: Replacement[] = [];

    OmniUtil.visitTypesDepthFirst(args.model, ctxSource => {
      if (ctxSource.type.kind === OmniTypeKind.GENERIC_SOURCE) {
        const source = ctxSource.type;

        const map = new Map<OmniGenericSourceIdentifierType, Replacement>();
        const newSourceIdentifiers: OmniGenericSourceIdentifierType[] = [];

        for (const sourceSourceId of source.sourceIdentifiers) {

          ProxyReducerOmni2.builder().reduce(sourceSourceId, {immutable: false, inline: true}, {
            GENERIC_TARGET_IDENTIFIER: (targetId, r) => {

              const targetSourceId = targetId.sourceIdentifier;

              // TODO: Calculate a better placeholder name, one based on attempted uniqueness throughout all generated classes
              //        So that placeholders are called the same thing for the same type in separate locations, and uses a short name!
              //        ... the default could be that we pick the last word of the type? And use some kind of fallback if the name is already used?

              const newSourceId: OmniGenericSourceIdentifierType = {
                kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
                placeholderName: `T${newSourceIdentifiers.length}`, // TODO: Needs better naming,
                upperBound: targetSourceId.upperBound,
                debug: OmniUtil.addDebug(sourceSourceId.debug, `Replacement of ${sourceSourceId.placeholderName} for spreading generics`),
              };

              const newTargetId: OmniGenericTargetIdentifierType = {
                kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
                type: newSourceId,
                sourceIdentifier: targetSourceId,
                debug: OmniUtil.addDebug(targetId.debug, `Replacement of ${targetId.placeholderName ?? targetId.sourceIdentifier.placeholderName} for spreading generics`),
              };

              newSourceIdentifiers.push(newSourceId);

              if (map.has(sourceSourceId)) {
                throw new Error(`Cannot replace a sourceId twice, something is wrong with assumptions about how many matches there could be`);
              }

              replacements.push({
                source: source,
                oldSourceId: sourceSourceId,
                newSourceId: newSourceId,
                path: [sourceSourceId, targetSourceId],
              });

              r.replace(newTargetId);
            },
          });
        }

        if (newSourceIdentifiers.length > 0) {
          const newIdsString = newSourceIdentifiers.map(it => it.placeholderName).join(', ');
          logger.info(`ADDING ${newSourceIdentifiers.length} source identifiers to ${OmniUtil.describe(source)}: ${newIdsString}`);
          source.sourceIdentifiers.splice(0, 0, ...newSourceIdentifiers);
          source.debug = OmniUtil.addDebug(source.debug, `Added sourceId(s) ${newIdsString}`);
        } else {
          logger.debug(`NOT adding any source identifiers to ${OmniUtil.describe(source)}`);
        }

        ctxSource.skip = true;
      }
    });

    ProxyReducerOmni2.builder().reduce(args.model, {immutable: false, inline: true}, {
      GENERIC_TARGET: (target, r) => {

        const source = target.source;

        const sourceMatches = replacements.filter(it => it.source === source);
        if (sourceMatches.length === 0) {
          return;
        }

        const newTargetIdentifiers = [...target.targetIdentifiers];
        for (let i = 0; i < newTargetIdentifiers.length; i++) {

          const targetId = newTargetIdentifiers[i];
          const sourceIdMatches = sourceMatches.filter(it => it.oldSourceId === targetId.sourceIdentifier || it.newSourceId === targetId.sourceIdentifier); // .get(targetId.sourceIdentifier);
          if (sourceIdMatches.length === 0) {
            continue;
          }

          for (const replacement of sourceIdMatches) {
            let pointer: OmniType | undefined = target;
            for (const resolveItem of replacement.path) {
              pointer = ProxyReducerOmni2.builder().reduce(pointer, {immutable: true}, {
                GENERIC_TARGET_IDENTIFIER: (targetTargetId, r) => {
                  if (targetTargetId.sourceIdentifier === resolveItem) {
                    return targetTargetId.type;
                  }
                  return undefined;
                },
              });

              if (!pointer) {
                throw new Error(`Could not resolve ${OmniUtil.describe(resolveItem)} from ${OmniUtil.describe(pointer)}`);
              }
            }

            const newTargetId: OmniGenericTargetIdentifierType = {
              kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
              sourceIdentifier: replacement.newSourceId,
              type: pointer,
            };

            newTargetIdentifiers.splice(i, 0, newTargetId);
            i++;
          }
        }

        r.put('targetIdentifiers', newTargetIdentifiers);
      },

      // if (ctxTarget.type.kind === OmniTypeKind.GENERIC_TARGET) {
      //
      // }
    });
  }
}
