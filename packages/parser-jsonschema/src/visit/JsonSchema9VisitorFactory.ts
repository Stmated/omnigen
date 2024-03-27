import {JsonSchema9Visitor} from './JsonSchema9Visitor.ts';

export interface JsonSchema9VisitorFactory<V extends JsonSchema9Visitor = JsonSchema9Visitor> {
  create(): V;
}
