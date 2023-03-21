import {SerializedInput, SerializedInputSource} from '@omnigen/core';

export class FromFileSerializedInputSource implements SerializedInputSource {

  private readonly _path: string[];

  constructor(path: string[]) {
    this._path = path;
  }

  inputs: SerializedInput[] = [];

  // getInputs(): SerializedInput[] {
  //   return [];
  // }
}
