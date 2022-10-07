import {JavaRenderer} from '@omnigen/target-java';

export class OpenRpcJavaParser {

  private readonly _renderer: JavaRenderer;
  
  constructor(renderer: JavaRenderer) {
    this._renderer = renderer;
  }
}
