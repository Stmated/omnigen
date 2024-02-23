import {JsonSchema7Visitor} from './JsonSchema7Visitor.ts';

export interface JsonSchema7VisitorFactory<V extends JsonSchema7Visitor = JsonSchema7Visitor> {
  create(): V;
}
