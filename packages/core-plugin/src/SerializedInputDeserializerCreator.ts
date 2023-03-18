import {SerializedInput, SerializedInputDeserializer} from '@omnigen/core';

export type SerializedInputDeserializerCreator<T = any> = { (): SerializedInputDeserializer<T>; }
