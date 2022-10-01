import {IOptionParser, OptionsRawValue} from '@options/IOptions';

export class RawOptionsParser implements IOptionParser<OptionsRawValue> {

  parse(raw: OptionsRawValue): OptionsRawValue {
    return raw;
  }
}
