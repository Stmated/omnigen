import {JSONSchema4, JSONSchema6, JSONSchema7} from 'json-schema';

export type DiscriminatorMapping = {[key: string]: string};

export interface Discriminator {
  propertyName: string;
  mapping?: DiscriminatorMapping;
}

export interface DiscriminatorAware {
  discriminator: Discriminator;
}

export type OpenApiJSONSchema4 = JSONSchema4 & DiscriminatorAware;
export type OpenApiJSONSchema6 = JSONSchema6 & DiscriminatorAware;
export type OpenApiJSONSchema7 = JSONSchema7 & DiscriminatorAware;

export type OpenApiJSONSchema4Definition = OpenApiJSONSchema4 | boolean;
export type OpenApiJSONSchema6Definition = OpenApiJSONSchema6 | boolean;
export type OpenApiJSONSchema7Definition = OpenApiJSONSchema7 | boolean;
