import {OmniInterfaceOrObjectType, OmniModel, OmniSubTypeCapableType, OmniSuperTypeCapableType, OmniType} from './OmniModel.ts';

export interface TargetFunctions {

  getSuperClass(model: OmniModel, type: OmniType, returnUnwrapped?: boolean): OmniSuperTypeCapableType | undefined;
  getSuperInterfaces(model: OmniModel, type: OmniType): OmniInterfaceOrObjectType[];

  asSubType(type: OmniType): OmniSubTypeCapableType | undefined;
  asSuperType(type: OmniType): OmniSuperTypeCapableType | undefined;

  // getSuperClassHierarchy(model: OmniModel, type: OmniType | undefined): OmniSuperTypeCapableType[];
}
