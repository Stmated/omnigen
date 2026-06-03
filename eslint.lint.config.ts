import { Linter } from 'eslint';
import {create} from './eslint.base.config.ts';

export default [
  ...create({typechecked: true}),
] satisfies Linter.Config[];
