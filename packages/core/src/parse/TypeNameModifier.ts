import {TypeName} from './TypeName.js';

export interface TypeNameModifier {
  name: TypeName;
  prefix?: TypeName;
  suffix?: TypeName;
  namespaceSuffix?: string;
}
