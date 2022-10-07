import {IOptionParser} from './IOptions';

export class BooleanOptionsParser implements IOptionParser<boolean> {

  parse(raw: unknown): boolean {

    let value: unknown = raw;
    if (typeof value == 'string') {
      value = JSON.parse(value);
    }

    if (typeof value == 'boolean') {
      return value;
    } else if (typeof value == 'number') {
      return value != 0;
    } else {
      throw new Error(`Cannot convert '${String(raw)}' into a boolean`);
    }
  }
}
