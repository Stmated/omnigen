import {TypeName} from './TypeName.js';

export type TypeNameCase = 'pascal';

export interface TypeNameModifier {
  name: TypeName;
  prefix?: TypeName | undefined;
  suffix?: TypeName | undefined;
  case?: TypeNameCase | undefined;
}
