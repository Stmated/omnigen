import {JsonSchema9Visitor} from './JsonSchema9Visitor';

export interface JsonSchema9VisitorFactory<V extends JsonSchema9Visitor = JsonSchema9Visitor> {
  create(): V;
}
