import {AstFreeTextVisitor, CodeVisitor, createCodeFreeTextVisitor, createCodeVisitor} from '@omnigen/target-code';

export interface JavaVisitor<R> extends CodeVisitor<R>, AstFreeTextVisitor<R> {

}

export const createJavaVisitor = <R>(partial?: Partial<JavaVisitor<R>>, noop?: R | undefined): Readonly<JavaVisitor<R>> => {

  if (noop === undefined && DefaultJavaVisitor) {

    return {
      ...(DefaultJavaVisitor as any as JavaVisitor<R>),
      ...(partial || {}),
    };
  }

  return createJavaVisitorInternal<R>(partial, noop);
};

export const createJavaVisitorInternal = <R>(partial?: Partial<JavaVisitor<R>>, noop?: R | undefined): Readonly<JavaVisitor<R>> => {

  return {
    ...createCodeFreeTextVisitor<R>(undefined, noop),
    ...createCodeVisitor<R>(),
  };
};

const DefaultJavaVisitor = createJavaVisitorInternal<void>();
