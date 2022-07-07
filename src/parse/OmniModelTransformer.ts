import {OmniModel} from '@parse/OmniModel';
import {DependencyGraph} from '@parse/DependencyGraphBuilder';

export interface OmniModelTransformer {
  transform(model: OmniModel, dependencies: DependencyGraph): void;
}
