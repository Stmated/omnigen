import {IncomingOptions, IOptionParser, IOptions, RealOptions} from '@options/IOptions';
import {RawOptionsParser} from '@options/RawOptionsParser';

export class OptionsParserManager {

  private _fallback = new RawOptionsParser();
  private readonly _parsers = new Map<string, IOptionParser<unknown>>();

  public register<TOptions extends IOptions>(name: Extract<keyof TOptions, string>, parser: IOptionParser<unknown>): void {

    if (this._parsers.has(name)) {
      throw new Error(`There is already a parser registered for ${name}`);
    }

    this._parsers.set(name, parser);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public parse<TOptions extends IOptions>(
    from: IncomingOptions<TOptions>,
    to: RealOptions<TOptions>,
  ): void {

    for (const key of Object.keys(from)) {
      const parser = this._parsers.get(key);
      if (parser) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument
        to[key] = parser.parse(from[key]) as any;
      } else {

        // We wil blindly just set the raw value to the options
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        // to[key] = incoming[key];
      }
    }

    // TODO: This is wrong. Need to figure out a better way of keeping things true
    // return copy as RealOptions<TOptions>;
  }
}
