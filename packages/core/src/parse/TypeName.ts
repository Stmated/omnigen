import {TypeNameModifier} from './TypeNameModifier.js';

export type TypeName = string | TypeNameModifier | ReadonlyArray<TypeName>;
