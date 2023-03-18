import {SerializedInput} from './SerializedInput';
import {DeserializedInput} from './DeserializedInput';

export interface SerializedInputDeserializer<T> {

  deserialize(input: SerializedInput): DeserializedInput<T>;
}
