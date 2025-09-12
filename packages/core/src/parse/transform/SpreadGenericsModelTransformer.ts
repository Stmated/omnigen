import {
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniType,
  OmniTypeKind,
} from '@omnigen/api';
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

    const replacements: Replacement[] = [];

    ProxyReducerOmni2.builder().reduce(args.model, {immutable: false, inline: true}, {
      GENERIC_TARGET_IDENTIFIER: (n, r) => {
        // Do not step into, or we'll find nested generics. We'll visit these manually inside GENERIC_SOURCE instead.
      },
      GENERIC_SOURCE: (source, outer_r) => {

        outer_r.callBase();

        const map = new Map<OmniGenericSourceIdentifierType, Replacement>();
        const newSourceIdentifiers: OmniGenericSourceIdentifierType[] = [];

        for (const sourceSourceId of source.sourceIdentifiers) {

          ProxyReducerOmni2.builder().reduce(sourceSourceId, {immutable: false, inline: true}, {
            GENERIC_TARGET_IDENTIFIER: (targetId, inner_r) => {

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

              inner_r.replace(newTargetId);
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
      },
    });

    ProxyReducerOmni2.builder().reduce(args.model, {immutable: false, inline: true}, {
      GENERIC_TARGET: (target, _) => {

        const source = target.source;

        const sourceMatches = replacements.filter(it => it.source === source);
        if (sourceMatches.length === 0) {
          return;
        }

        for (let i = 0; i < target.targetIdentifiers.length; i++) {

          const targetId = target.targetIdentifiers[i];
          const sourceIdMatches = sourceMatches.filter(it => it.oldSourceId === targetId.sourceIdentifier || it.newSourceId === targetId.sourceIdentifier); // .get(targetId.sourceIdentifier);
          if (sourceIdMatches.length === 0) {
            continue;
          }

          for (const replacement of sourceIdMatches) {
            let pointer: OmniType | undefined = target;
            for (const resolveItem of replacement.path) {
              pointer = ProxyReducerOmni2.builder().reduce(pointer, {immutable: true}, {
                GENERIC_TARGET_IDENTIFIER: (targetTargetId, _) => {
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

            target.targetIdentifiers.splice(i, 0, newTargetId);
            i++;
          }
        }
      },
    });
  }
}
