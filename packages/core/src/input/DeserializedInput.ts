import {SerializedInput} from './SerializedInput';

export interface DeserializedInput<T> {

  serializedInput: SerializedInput;
  contentObject: T;
}
