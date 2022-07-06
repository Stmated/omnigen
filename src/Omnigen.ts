import {IParseManager, ParseInputOptions, ParserManager} from '@parse';
import {OpenRpcParser} from '@parse/openrpc/OpenRpcParser';
import {OmniModel} from '@parse';

/**
 * Main entry class which handles the default use-case for all the conversion from scheme to output.
 */
export class Omnigen implements IParseManager {

  private readonly _parserManager: ParserManager;

  constructor() {

    this._parserManager = new ParserManager();
    this._parserManager.register(new OpenRpcParser());
  }

  parse(options: ParseInputOptions): Promise<OmniModel> {
    return this._parserManager.parse(options);
  }
}
