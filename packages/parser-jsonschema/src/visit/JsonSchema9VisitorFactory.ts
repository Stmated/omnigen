import {JsonSchema9Visitor} from './JsonSchema9Visitor';
import {JSONSchema9} from '../definitions';

export interface JsonSchema9VisitorFactory<S extends JSONSchema9, V extends JsonSchema9Visitor<S>> {
  create(): V;
}
