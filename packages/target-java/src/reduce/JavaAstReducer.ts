import {AstFreeTextVisitor, createCodeFreeTextReducer, createCodeReducer} from '@omnigen/target-code';
import {JavaVisitor} from '../visit';
import {Reducer} from '@omnigen/core';

export type FreeTextReducer = Reducer<AstFreeTextVisitor<unknown>>;

export const createJavaFreeTextReducer = (partial?: Partial<FreeTextReducer>): FreeTextReducer => {
  return {
    ...createCodeFreeTextReducer(partial),
  };
};

type JavaReducerBase = Reducer<JavaVisitor<unknown>>;

export type JavaReducer = JavaReducerBase;

export const createJavaReducer = (partial?: Partial<JavaReducer>): Readonly<JavaReducer> => {

  return {
    ...createJavaFreeTextReducer(partial),
    ...createCodeReducer(partial),
  };
};

export const DefaultJavaReducer = createJavaReducer();
