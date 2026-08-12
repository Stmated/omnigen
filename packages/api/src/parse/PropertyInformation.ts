import {OmniOwnedProperty, OmniPropertyName, OmniType} from './OmniModel';
import {PropertyDifference, TypeDiffKind} from '../equality';

export interface PropertyInformation {
  propertyName: OmniPropertyName;
  properties: OmniOwnedProperty[];
  propertyDiffs: PropertyDifference[] | undefined,
  typeDiffs: TypeDiffKind[] | undefined,
  /**
   * The common denominator between the distinct type.
   * Is not necessarily the best representation of the types, just what they for sure have in common.
   */
  commonType: OmniType;
  /**
   * A common denominator type that was constructed to fit the distinct types.
   * Might be undefined, then the `commonType` should be preferred.
   * This might for example be an exclusive union of polymorphic literals: (`"foo" | "bar"`).
   */
  constructedType?: OmniType | undefined;
  distinctTypes: OmniType[];
}
