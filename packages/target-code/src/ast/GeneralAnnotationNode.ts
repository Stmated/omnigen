import {AbstractCodeNode} from './AbstractCodeNode.ts';
import {CodeVisitor} from '../visitor/CodeVisitor.ts';
import {Reducer, ReducerResult, VisitResult} from '@omnigen/core';
import {Annotation} from './CodeAst.ts';

export enum GeneralAnnotationKind {
  SERIALIZATION_VALUE = 'SERIALIZATION_VALUE',
  SERIALIZATION_ALIAS = 'SERIALIZATION_ALIAS',
  DESERIALIZATION_CREATOR = 'DESERIALIZATION_CREATOR',
}

export interface GeneralAnnotation<K extends GeneralAnnotationKind = GeneralAnnotationKind> {
  kind: K;
}

export interface SerializationValue extends GeneralAnnotation<GeneralAnnotationKind.SERIALIZATION_VALUE> {
}

export interface DeserializationCreator extends GeneralAnnotation<GeneralAnnotationKind.DESERIALIZATION_CREATOR> {
}

export interface SerializationAlias extends GeneralAnnotation<GeneralAnnotationKind.SERIALIZATION_ALIAS> {
  name: string
}

export type Kinds = SerializationValue
  | SerializationAlias
  | DeserializationCreator
;

export class GeneralAnnotationNode extends AbstractCodeNode {
  value: Kinds;

  constructor(value: Kinds) {
    super();
    this.value = value;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitGeneralAnnotationNode(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Annotation | GeneralAnnotationNode> {
    return reducer.reduceGeneralAnnotationNode(this, reducer);
  }
}
