import {OmniInterfaceOrObjectType, OmniModel, OmniSubTypeCapableType, OmniSuperTypeCapableType, OmniType, TargetFunctions} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
import {CodeUtil} from '@omnigen/target-code';

export class CSharpModelFunctions implements TargetFunctions {

  asSubType(type: OmniType): OmniSubTypeCapableType | undefined {
    return OmniUtil.asSubType(type) ? type : undefined;
  }

  asSuperType(type: OmniType): OmniSuperTypeCapableType | undefined {
    return OmniUtil.asSuperType(type) ? type : undefined;
  }

  getSuperClass(model: OmniModel, type: OmniType, returnUnwrapped?: boolean): OmniSuperTypeCapableType | undefined {
    return CodeUtil.getSuperClassOfSubType(model, type, returnUnwrapped);
  }

  getSuperInterfaces(model: OmniModel, type: OmniType): OmniInterfaceOrObjectType[] {
    return CodeUtil.getSuperInterfacesOfSubType(model, type);
  }
}
