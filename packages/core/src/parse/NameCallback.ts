import {TypeNameCase} from '@omnigen/api';

export type NameCallback<R> = (name: string, parts?: string[], preservePunctuation?: boolean, nameCase?: TypeNameCase) => R;
