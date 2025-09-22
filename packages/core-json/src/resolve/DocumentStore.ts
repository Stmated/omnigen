import {JsonObject} from 'json-pointer';

export class DocumentStore {
  private readonly documents = new Map<string, JsonObject>();

  public values() {
    return this.documents.values();
  }

  public set(key: string, value: JsonObject) {
    return this.documents.set(key, value);
  }

  public get(key: string) {
    return this.documents.get(key);
  }

  public has(key: string) {
    return this.documents.has(key);
  }
}
