import {
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniType,
  OmniTypeKind,
} from '@omnigen/api';
import {OmniUtil} from '../OmniUtil.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

type SourceIdentifierPath = Array<OmniGenericSourceIdentifierType>;
// type SourceIdentifierPaths = Array<SourceIdentifierPath>;

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
 */
export class SpreadGenericsModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    // if (true) {
    //   return;
    // }

    // const sourceToUpdateWith = new Map<OmniGenericSourceType, Map<OmniGenericSourceIdentifierType, Replacement>>();
    const replacements: Replacement[] = [];

    OmniUtil.visitTypesDepthFirst(args.model, ctxSource => {
      if (ctxSource.type.kind === OmniTypeKind.GENERIC_SOURCE) {
        const source = ctxSource.type;

        const map = new Map<OmniGenericSourceIdentifierType, Replacement>();
        const newSourceIdentifiers: OmniGenericSourceIdentifierType[] = [];

        for (const sourceSourceId of source.sourceIdentifiers) {

          OmniUtil.visitTypesDepthFirst(sourceSourceId, ctxTargetId => {
            if (ctxTargetId.type.kind === OmniTypeKind.GENERIC_TARGET_IDENTIFIER) { // } && ctxTargetId.type.type.kind === OmniTypeKind.UNKNOWN) {
              const targetId = ctxTargetId.type;
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

              // map.set(sourceSourceId, {
              //   newSourceId: newSourceId,
              //   paths: [[sourceSourceId, targetSourceId]],
              // });

              // TODO: DO NOT MAKE ANY CHANGE HERE! ONLY REGISTER THINGS TO BE MAPPED;
              //  AND THEN WE WILL GO THROUGH AGAIN AND MODIFY/REPLACE! BUT AFTER WE HAVE ORDERED THEM ACCORDING TO DEPENDENCY GRAPH!

              ctxTargetId.replacement = newTargetId;
              ctxTargetId.skip = true;
            }
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

        // sourceToUpdateWith.set(source, map);
        ctxSource.skip = true;
      }
    });

    OmniUtil.visitTypesDepthFirst(args.model, ctxTarget => {
      if (ctxTarget.type.kind === OmniTypeKind.GENERIC_TARGET) {
        const target = ctxTarget.type;
        const source = target.source;

        const sourceMatches = replacements.filter(it => it.source === source); // sourceToUpdateWith.get(source);
        if (sourceMatches.length === 0) {
          return;
        }

        logger.info(`sourceMatches: ${sourceMatches.map(it => `${it.oldSourceId.placeholderName} -> ${it.newSourceId.placeholderName}`)}`);

        for (let i = 0; i < target.targetIdentifiers.length; i++) {

          const targetId = target.targetIdentifiers[i];
          const sourceIdMatches = sourceMatches.filter(it => it.oldSourceId === targetId.sourceIdentifier || it.newSourceId === targetId.sourceIdentifier); // .get(targetId.sourceIdentifier);
          if (sourceIdMatches.length === 0) {
            continue;
          }

          logger.info(`sourceIdMatches: ${sourceIdMatches.map(it => `${it.oldSourceId.placeholderName} -> ${it.newSourceId.placeholderName}`)}`);

          for (const replacement of sourceIdMatches) {
            let pointer: OmniType | undefined = target;
            for (const resolveItem of replacement.path) {
              pointer = OmniUtil.visitTypesDepthFirst(pointer, ctxTargetTargetId => {
                if (ctxTargetTargetId.type.kind === OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
                  const targetTargetId = ctxTargetTargetId.type;
                  if (targetTargetId.sourceIdentifier === resolveItem) {
                    return targetTargetId.type;
                  }
                }
                return undefined;
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

            target.targetIdentifiers.splice(i, 0, newTargetId);
            i++;
          }
        }
      }
    });
  }
}
