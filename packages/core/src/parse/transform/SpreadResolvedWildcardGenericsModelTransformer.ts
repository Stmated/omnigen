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
type SourceIdentifierPaths = Array<SourceIdentifierPath>;

type Replacement = {
  newSourceId: OmniGenericSourceIdentifierType;
  paths: SourceIdentifierPaths
};

/**
 * Some languages allow wildcard generics to say "anything goes here".
 *
 * But languages like C# requires it to be expanded/spread/resolved, so that the wildcard generic is converted into a generic parameter with no bound, and given explicitly.
 *
 * Will take `Foo extends Bar<?>` and turn it into `Foo<T> extends Bar<T>`
 */
export class SpreadResolvedWildcardGenericsModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    const sourceToUpdateWith = new Map<OmniGenericSourceType, Map<OmniGenericSourceIdentifierType, Replacement>>();

    OmniUtil.visitTypesDepthFirst(args.model, ctxSource => {
      if (ctxSource.type.kind === OmniTypeKind.GENERIC_SOURCE) {
        const source = ctxSource.type;

        const map = new Map<OmniGenericSourceIdentifierType, Replacement>();
        const newSourceIdentifiers: OmniGenericSourceIdentifierType[] = [];

        for (const sourceSourceId of source.sourceIdentifiers) {

          OmniUtil.visitTypesDepthFirst(sourceSourceId, ctxTargetId => {
            if (ctxTargetId.type.kind === OmniTypeKind.GENERIC_TARGET_IDENTIFIER && ctxTargetId.type.type.kind === OmniTypeKind.UNKNOWN) {
              const targetId = ctxTargetId.type;
              const targetSourceId = targetId.sourceIdentifier;

              const newSourceId: OmniGenericSourceIdentifierType = {
                kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
                placeholderName: `T${newSourceIdentifiers.length}`, // TODO: Needs better/more descriptive naming
                upperBound: targetSourceId.upperBound,
              };

              const newTargetId: OmniGenericTargetIdentifierType = {
                kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
                type: newSourceId,
                sourceIdentifier: targetSourceId,
              };

              newSourceIdentifiers.push(newSourceId);
              map.set(sourceSourceId, {
                newSourceId: newSourceId,
                paths: [[sourceSourceId, targetSourceId]],
              });

              ctxTargetId.replacement = newTargetId;
              ctxTargetId.skip = true;
            }
          });
        }

        if (newSourceIdentifiers.length > 0) {
          source.sourceIdentifiers.splice(0, 0, ...newSourceIdentifiers);
        }

        sourceToUpdateWith.set(source, map);
        ctxSource.skip = true;
      }
    });

    OmniUtil.visitTypesDepthFirst(args.model, ctxTarget => {
      if (ctxTarget.type.kind === OmniTypeKind.GENERIC_TARGET) {
        const target = ctxTarget.type;
        const source = target.source;

        const toUpdate = sourceToUpdateWith.get(source);

        if (toUpdate) {

          for (let i = 0; i < target.targetIdentifiers.length; i++) {

            const targetId = target.targetIdentifiers[i];
            const replacement = toUpdate.get(targetId.sourceIdentifier);
            if (replacement) {

              for (const resolvePath of replacement.paths) {
                let pointer: OmniType | undefined = target;
                for (const resolveItem of resolvePath) {
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
        }
      }
    });
  }
}
