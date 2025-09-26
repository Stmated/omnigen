export type DependentSchemas = IDependentSchemas & StylesForCookie & StylesForForm;

export interface IDependentSchemas {
  readonly style?: string | undefined;
}

export type StylesForCookie = StylesForCookieThen | StylesForCookieElse;

export interface StylesForCookieElse {
  readonly 'cookie-else-prop'?: string | undefined;
}

export interface StylesForCookieThen {
  readonly 'cookie-then-prop'?: boolean | undefined;
}

export type StylesForForm = StylesForFormThen | StylesForFormElse;

export interface StylesForFormElse {
  /**
   * @default false
   */
  readonly explode?: boolean | undefined;
}

export interface StylesForFormThen {
  /**
   * @default true
   */
  readonly explode?: boolean | undefined;
}
