
export type DiscriminatorMapping = Record<string, string>;

export interface Discriminator {
  propertyName: string;
  mapping?: DiscriminatorMapping;
}

export interface DiscriminatorAware {
  discriminator: Discriminator;
}
