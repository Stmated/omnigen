import {TypeName} from './TypeName.js';

export interface TypeNameModifier {
  name: TypeName;
  prefix?: TypeName | undefined;
  suffix?: TypeName;
}
