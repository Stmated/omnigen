
export type DiscriminatorMapping = Record<string, string>;

export interface IDiscriminator {
  propertyName: string;
  mapping?: DiscriminatorMapping;
}

export interface IDiscriminatorAware {
  discriminator: IDiscriminator;
}
