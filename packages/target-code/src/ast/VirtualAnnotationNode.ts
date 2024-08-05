import {AbstractCodeNode} from './AbstractCodeNode.ts';
import {CodeVisitor} from '../visitor/CodeVisitor.ts';
import {Reducer, ReducerResult, VisitResult} from '@omnigen/api';
import {Annotation} from './CodeAst.ts';

export enum VirtualAnnotationKind {
  SERIALIZATION_VALUE = 'SERIALIZATION_VALUE',
  SERIALIZATION_ALIAS = 'SERIALIZATION_ALIAS',
  DESERIALIZATION_CREATOR = 'DESERIALIZATION_CREATOR',
}

export interface VirtualAnnotation<K extends VirtualAnnotationKind = VirtualAnnotationKind> {
  kind: K;
}

export interface SerializationValue extends VirtualAnnotation<VirtualAnnotationKind.SERIALIZATION_VALUE> {
}

export interface DeserializationCreator extends VirtualAnnotation<VirtualAnnotationKind.DESERIALIZATION_CREATOR> {
}

export interface SerializationAlias extends VirtualAnnotation<VirtualAnnotationKind.SERIALIZATION_ALIAS> {
  name: string
}

export type Kinds = SerializationValue
  | SerializationAlias
  | DeserializationCreator
;

export class VirtualAnnotationNode extends AbstractCodeNode {
  value: Kinds;

  constructor(value: Kinds) {
    super();
    this.value = value;
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return visitor.visitVirtualAnnotationNode(this, visitor);
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Annotation | VirtualAnnotationNode> {
    return reducer.reduceVirtualAnnotationNode(this, reducer);
  }
}
